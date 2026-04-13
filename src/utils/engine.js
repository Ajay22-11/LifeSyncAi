import { supabase } from './supabaseClient';
import { getDominantColor, classifyColor, calculateMatchScore } from './colorMatcher';
import localforage from 'localforage';

/**
 * CLOUD ENGINE - SUPABASE MIGRATION
 * This engine replaces localforage with Supabase Firestore-like JSON storage.
 */

// Helper to get or set a persistent session email
export const getSessionEmail = () => {
    let email = localStorage.getItem('lifesync_user_email');
    return email;
};

export const setSessionEmail = (email) => {
    localStorage.setItem('lifesync_user_email', email);
};

export const reportSystemError = async (error, errorInfo) => {
    const email = getSessionEmail() || 'anonymous';
    const timestamp = new Date().toISOString();
    const payload = {
        user_email: email,
        error: error?.toString(),
        stack: errorInfo?.componentStack || error?.stack,
        timestamp
    };
    
    console.error('🔺 System Error Reported:', payload);

    try {
        // Attempt to log to a system_errors table if it exists
        await supabase.from('system_errors').insert([payload]);
    } catch (e) {
        // Fail silently to avoid infinite error loops
        console.warn('Could not push error to cloud, saved locally.');
        const localErrors = JSON.parse(localStorage.getItem('lifesync_crash_logs') || '[]');
        localErrors.push(payload);
        localStorage.setItem('lifesync_crash_logs', JSON.stringify(localErrors.slice(-10)));
    }
};

// -- CACHING & PERFORMANCE --
let cachedUserData = null;
let lastFetchTime = 0;
let pendingFetchPromise = null;
const CACHE_TTL = 30000; // 30 seconds

// -- MIGRATION MUTEX --
let migrationPromise = null;

// -- MIGRATION HELPER --
// This function will move data from local browser storage to the new cloud database
const migrateLegacyData = async (email) => {
    if (localStorage.getItem('lifesync_migrated')) return;
    if (migrationPromise) return migrationPromise;

    migrationPromise = (async () => {
        try {
            console.log('🔄 Checking for legacy local data to migrate...');
            
            const oldDb = localforage.createInstance({
                name: 'OutfitRecommender',
                storeName: 'wardrobe_data'
            });

            // 1. Fetch all local keys
            const shirtsMeta = await oldDb.getItem('shirts_meta') || [];
            const pantsMeta = await oldDb.getItem('pants_meta') || [];
            const history = await oldDb.getItem('history') || [];
            const timetable = await oldDb.getItem('timetable') || [];
            const academicData = await oldDb.getItem('academic_data') || {};
            const specialDays = await oldDb.getItem('special_days') || {};
            const examTimetable = await oldDb.getItem('exam_timetable') || [];
            const classTimetable = await oldDb.getItem('class_timetable') || null;

            if (shirtsMeta.length === 0 && pantsMeta.length === 0 && timetable.length === 0 && examTimetable.length === 0) {
                console.log('✅ No legacy data found. Migration skipped.');
                localStorage.setItem('lifesync_migrated', 'true');
                return;
            }

            console.log(`📦 Found data! Migrating ${shirtsMeta.length} shirts and ${pantsMeta.length} pants... This might take a moment.`);

            // 2. Process Images in parallel chunks to avoid UI hang
            const processItems = async (items, folder) => {
                return Promise.all(items.map(async (item) => {
                    const img = await oldDb.getItem('IMG_' + item.id);
                    if (img && img.startsWith('data:image')) {
                        try {
                            const cloudUrl = await uploadImage(img, folder);
                            return { ...item, image: cloudUrl };
                        } catch (e) {
                            console.warn(`Failed to upload ${folder} ${item.id}, keeping local copy`, e);
                            return item;
                        }
                    }
                    return item;
                }));
            };

            const migratedShirts = await processItems(shirtsMeta, 'shirts');
            const migratedPants = await processItems(pantsMeta, 'pants');

            // 3. Update Supabase
            const { error } = await supabase
                .from('user_data')
                .update({
                    shirts_meta: migratedShirts,
                    pants_meta: migratedPants,
                    history,
                    timetable,
                    academic_data: academicData,
                    special_days: specialDays,
                    exam_timetable: examTimetable,
                    class_timetable: classTimetable
                })
                .eq('user_email', email);

            if (error) throw error;

            console.log('🚀 Migration successful! All your data is now in the cloud.');
            localStorage.setItem('lifesync_migrated', 'true');
        } catch (err) {
            console.error('❌ Migration failed:', err);
        } finally {
            migrationPromise = null;
        }
    })();

    return migrationPromise;
};

// Internal helper to get the user data row
const getUserData = async (forceRefresh = false) => {
    const email = getSessionEmail();
    if (!email) return null;

    // 1. Return cached data if valid
    const now = Date.now();
    if (!forceRefresh && cachedUserData && (now - lastFetchTime < CACHE_TTL)) {
        return cachedUserData;
    }

    // 2. Coalesce multiple parallel requests into one
    if (pendingFetchPromise) return pendingFetchPromise;

    pendingFetchPromise = (async () => {
        try {
            // Fetch current cloud data
            const { data, error } = await supabase
                .from('user_data')
                .select('*')
                .eq('user_email', email)
                .single();

            // Handle new user or missing row
            if (error && error.code === 'PGRST116') {
                const { data: newData, error: createError } = await supabase
                    .from('user_data')
                    .insert([{ user_email: email }])
                    .select()
                    .single();
                
                if (createError) throw createError;

                // Start migration in BACKGROUND
                migrateLegacyData(email);
                cachedUserData = newData;
                lastFetchTime = Date.now();
                return newData;
            }
            
            if (error) throw error;

            // Start migration if needed
            if (!localStorage.getItem('lifesync_migrated')) {
                migrateLegacyData(email);
            }

            cachedUserData = data;
            lastFetchTime = Date.now();
            return data;
        } finally {
            pendingFetchPromise = null;
        }
    })();

    return pendingFetchPromise;
};

// Internal helper to update user data row
const updateUserData = async (updates) => {
    const email = getSessionEmail();
    if (!email) return;

    const { error } = await supabase
        .from('user_data')
        .update(updates)
        .eq('user_email', email);

    if (error) throw error;
    
    // Invalidate cache on update
    lastFetchTime = 0; 
};

// -- IMAGE STORAGE HELPERS --
// uploads base64 to Supabase Storage then returns the public URL
const uploadImage = async (base64, folder = 'wardrobe') => {
    if (!base64 || !base64.startsWith('data:image')) return base64; // already a URL?

    try {
        const blob = await (await fetch(base64)).blob();
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.png`;
        const filePath = `${folder}/${fileName}`;

        const { data, error } = await supabase.storage
            .from('wardrobe')
            .upload(filePath, blob, { contentType: 'image/png' });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from('wardrobe')
            .getPublicUrl(filePath);

        return publicUrl;
    } catch (e) {
        console.error('Image upload failed:', e);
        return base64; // Fallback to base64 if upload fails
    }
};

export const getImage = async (id) => {
    return null; 
};

export const getShirts = async () => {
    const data = await getUserData();
    return data?.shirts_meta || [];
};

export const setShirtsMeta = async (shirts) => {
    await updateUserData({ shirts_meta: shirts });
};

export const setPantsMeta = async (pants) => {
    await updateUserData({ pants_meta: pants });
};

export const getPants = async () => {
    const data = await getUserData();
    return data?.pants_meta || [];
};

export const getTimetable = async () => {
    const data = await getUserData();
    return data?.timetable || [];
};
export const setTimetable = async (tt) => await updateUserData({ timetable: tt });

export const getClassTimetable = async () => {
    const data = await getUserData();
    return data?.class_timetable || null;
};
export const setClassTimetable = async (tt) => await updateUserData({ class_timetable: tt });

export const getExamTimetable = async () => {
    const data = await getUserData();
    return data?.exam_timetable || [];
};
export const setExamTimetable = async (tt) => await updateUserData({ exam_timetable: tt });

export const getSettings = async () => {
    const acData = await getAcademicData();
    return acData?.user_settings || {
        userName: '',
        stylePersona: 'Balanced',
        diversityMode: 'Variety',
        washDuration: 2,
        autoWashThreshold: 1,
        accentColor: '#6366f1',
        glassIntensity: 'Medium',
        animSpeed: 'Smooth',
        repeatBuffer: 3,
        holidaySync: true
    };
};

export const setSettings = async (settings) => {
    const acData = await getAcademicData();
    await setAcademicData({ ...acData, user_settings: settings });
};

// -- LOGIC --

export const addShirt = async (base64) => {
    const shirts = await getShirts();
    const publicUrl = await uploadImage(base64, 'shirts');
    
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    const rgb = await getDominantColor(publicUrl);
    const cat = classifyColor(rgb);
    
    shirts.push({
        id,
        image: publicUrl,
        addedAt: new Date().toISOString(),
        lastWorn: null,
        wearCount: 0,
        colorCategory: cat
    });
    await setShirtsMeta(shirts);
};

export const addPant = async (base64) => {
    const pants = await getPants();
    const publicUrl = await uploadImage(base64, 'pants');

    const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    const rgb = await getDominantColor(publicUrl);
    const cat = classifyColor(rgb);

    pants.push({
        id,
        image: publicUrl,
        addedAt: new Date().toISOString(),
        lastWorn: null,
        wearCount: 0,
        washStatus: 'clean',
        daysInWash: 0,
        colorCategory: cat
    });
    await setPantsMeta(pants);
};

export const removeShirt = async (id) => {
    const shirts = await getShirts();
    await setShirtsMeta(shirts.filter(s => s.id !== id));
};

export const removePant = async (id) => {
    const pants = await getPants();
    await setPantsMeta(pants.filter(p => p.id !== id));
};

export const getHistory = async () => {
    const data = await getUserData();
    return data?.history || [];
};
export const setHistory = async (h) => await updateUserData({ history: h });

export const getSpecialDays = async () => {
    const data = await getUserData();
    return data?.special_days || {};
};
export const setSpecialDays = async (sd) => await updateUserData({ special_days: sd });

export const addSpecialDay = async (date, shirtId, pantId, eventType) => {
    const sd = await getSpecialDays();
    sd[date] = { shirtId, pantId, eventType };
    await setSpecialDays(sd);

    const history = await getHistory();
    const existingIdx = history.findIndex(h => h.date === date);
    if (existingIdx !== -1) {
        history[existingIdx] = { date, shirtId, pantId, status: `Special: ${eventType}` };
    } else {
        history.push({ date, shirtId, pantId, status: `Special: ${eventType}` });
    }
    await setHistory(history);
};

export const cancelSpecialDay = async (date) => {
    const sd = await getSpecialDays();
    if (!sd[date]) return false;

    let history = await getHistory();
    history = history.filter(h => h.date !== date);
    await setHistory(history);

    delete sd[date];
    await setSpecialDays(sd);
    return true;
};

export const getTodayString = (d = new Date()) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ... remain the same suggestOutfit / color matching logic ...
export const suggestOutfit = async (simulateDate = null, forceNew = false, skipShirtIds = [], skipPantIds = [], occasion = 'Regular', persona = 'Balanced') => {
    try {
        const today = simulateDate || getTodayString();
        const specialDays = await getSpecialDays();
        const shirts = await getShirts();
        const pants = await getPants();
        const history = await getHistory();

        if (specialDays[today] && !forceNew) {
            const sDay = specialDays[today];
            const selectedShirt = shirts.find(s => s.id === sDay.shirtId);
            const selectedPant = pants.find(p => p.id === sDay.pantId);
            if (selectedShirt && selectedPant) {
                return { selectedShirt, selectedPant, today, isSpecial: true, isExisting: true, eventType: sDay.eventType };
            }
        }

        const existingToday = history.find(h => h.date === today);
        if (existingToday && !forceNew) {
            const selectedShirt = shirts.find(s => s.id === existingToday.shirtId);
            const selectedPant = pants.find(p => p.id === existingToday.pantId);
            if (selectedShirt && selectedPant) {
                return { selectedShirt, selectedPant, today, isExisting: true };
            }
        }

        const tt = await getTimetable();
        if (tt.length > 0) {
            const todayEntry = tt.find((t) => t.date === today);
            if (todayEntry && !todayEntry.isCollegeDay) {
                return { skip: true, reason: 'Holiday / No College Day' };
            }
        }

        if (shirts.length === 0 || pants.length === 0) {
            return { error: 'Not enough clothes.' };
        }

        let availableShirts = [...shirts];
        let availablePants = pants.filter((p) => p.washStatus === 'clean');

        if (forceNew) {
            let filteredShirts = availableShirts.filter(s => !skipShirtIds.includes(s.id));
            let filteredPants = availablePants.filter(p => !skipPantIds.includes(p.id));

            if (filteredShirts.length > 0) {
                availableShirts = filteredShirts;
            }
            // If filteredShirts is empty, we keep the full availableShirts (Auto-reset shirts cycle)

            if (filteredPants.length > 0) {
                availablePants = filteredPants;
            }
            // If filteredPants is empty, we keep the full availablePants (Auto-reset pants cycle)
        }

        if (availablePants.length === 0) {
            return { error: 'No clean pants available.' };
        }
        if (availableShirts.length === 0) {
            return { error: 'No shirts found in wardrobe.' };
        }

        let bestScore = -1;
        let bestCombinations = [];

        for (let s of availableShirts) {
            const sColor = await getDominantColor(s.image);
            const sCat = classifyColor(sColor);

            for (let p of availablePants) {
                const pColor = await getDominantColor(p.image);
                const pCat = classifyColor(pColor);

                let score = calculateMatchScore(sCat, pCat, persona);
                if (score > bestScore) {
                    bestScore = score;
                    bestCombinations = [{ shirt: s, pant: p, score }];
                } else if (score === bestScore) {
                    bestCombinations.push({ shirt: s, pant: p, score });
                }
            }
        }

        // Round Robin: Prefer items worn least recently
        bestCombinations.sort((a, b) => {
            const aLastWorn = Math.min(
                a.shirt.lastWorn ? new Date(a.shirt.lastWorn).getTime() : 0,
                a.pant.lastWorn ? new Date(a.pant.lastWorn).getTime() : 0
            );
            const bLastWorn = Math.min(
                b.shirt.lastWorn ? new Date(b.shirt.lastWorn).getTime() : 0,
                b.pant.lastWorn ? new Date(b.pant.lastWorn).getTime() : 0
            );
            return aLastWorn - bLastWorn;
        });

        // Pick one combination from the best ones (usually the top ones after sorting by last worn)
        const topCount = Math.min(3, bestCombinations.length);
        const selectedCombo = bestCombinations[Math.floor(Math.random() * topCount)];
        
        const { shirt: selectedShirt, pant: selectedPant, score: finalScore } = selectedCombo;

        return { selectedShirt, selectedPant, matchScore: finalScore, isExisting: false };
    } catch (err) {
        console.error(err);
        return { error: 'Engine failure.' };
    }
};

export const confirmOutfit = async (shirtId, pantId) => {
    const today = getTodayString();
    const shirts = await getShirts();
    const pants = await getPants();
    const history = await getHistory();

    const updatedShirts = shirts.map(s => s.id === shirtId ? { ...s, wearCount: s.wearCount + 1, lastWorn: today } : s);
    const updatedPants = pants.map(p => p.id === pantId ? { ...p, wearCount: p.wearCount + 1, washStatus: 'in_wash', lastWorn: today } : p);

    const existingIndex = history.findIndex(h => h.date === today);
    if (existingIndex >= 0) history[existingIndex] = { date: today, shirtId, pantId };
    else history.push({ date: today, shirtId, pantId });

    await setShirtsMeta(updatedShirts);
    await setPantsMeta(updatedPants);
    await setHistory(history);
    return true;
};

export const processDailyLaundry = async () => {
    const data = await getUserData();
    const lastRun = data?.last_laundry_run || '';
    const today = getTodayString();
    if (lastRun === today) return;

    const settings = await getSettings();
    const washDays = settings.washDuration || 2;

    const pants = await getPants();
    const updatedPants = pants.map(p => {
        if (p.washStatus === 'in_wash') {
            const newDays = (p.daysInWash || 0) + 1;
            if (newDays >= washDays) return { ...p, washStatus: 'clean', daysInWash: 0, wearCount: 0 };
            return { ...p, daysInWash: newDays };
        }
        return p;
    });

    await setPantsMeta(updatedPants);
    await updateUserData({ last_laundry_run: today });
};

export const resetItemState = async (type, id) => {
    if (type === 'shirt') {
        const shirts = await getShirts();
        await setShirtsMeta(shirts.map(s => s.id === id ? { ...s, wearCount: 0 } : s));
    } else {
        const pants = await getPants();
        await setPantsMeta(pants.map(p => p.id === id ? { ...p, washStatus: 'clean', wearCount: 0, daysInWash: 0 } : p));
    }
};

export const getAcademicData = async () => {
    const data = await getUserData();
    if (data?.academic_data && Object.keys(data.academic_data).length > 0) return data.academic_data;
    return {
        semesters: Array.from({ length: 8 }, (_, i) => ({ id: i + 1, sgpa: 0, credits: 20, isCompleted: false })),
        targetCgpa: 8.5
    };
};

export const setAcademicData = async (data) => await updateUserData({ academic_data: data });

export const processExamTimetableImage = async (file) => {
    // Simulate AI parsing of the academic exam timetable image
    await new Promise(r => setTimeout(r, 1500));
    const data = [
        { date: '2026-04-08', subject: '22IT910 REST Application Development Using Spring Boot and JPA' },
        { date: '2026-04-09', subject: '22CD924 Info Design & Visualization / 22EC977 Image & Video Analytics' },
        { date: '2026-04-10', subject: '22CS603 Professional Ethics' },
        { date: '2026-04-11', subject: '22CD907 Film Making / 22EC978 Robot Operating System' },
        { date: '2026-04-13', subject: '22CD919 Game Design' },
        { date: '2026-04-15', subject: '22EC012 Industrial IoT Applications' },
        { date: '2026-04-16', subject: '22CS602 Object Oriented Software Engineering' },
        { date: '2026-04-17', subject: '22CD601 Principles of UI/UX Design' }
    ];
    return data;
};

export const processTimetableImage = async (file) => {
    await new Promise(r => setTimeout(r, 1800));
    return {
        Tuesday: [{ period: 1, name: 'AR/VR' }, { period: 2, name: 'Agile' }],
        Wednesday: [{ period: 1, name: 'GenAI' }],
        Thursday: [{ period: 1, name: 'Multimedia' }],
        Friday: [{ period: 1, name: 'Agile' }],
        Saturday: [{ period: 1, name: 'AR/VR' }]
    };
};
