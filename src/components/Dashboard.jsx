import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, AlertCircle, Calendar, RefreshCw, Cpu, Zap, Shirt, Scissors, Droplets, TrendingUp, Upload, CloudSun, Wind, Camera, Plus, CheckCircle2, Clock, BookOpen, Star, Trash2 } from 'lucide-react';
import { suggestOutfit, getHistory, getShirts, getPants, getTimetable, confirmOutfit, addShirt, addPant, getClassTimetable, addSpecialDay, getTodayString, getSpecialDays, cancelSpecialDay, processDailyLaundry, getExamTimetable, setExamTimetable, processExamTimetableImage } from '../utils/engine';

function TodayOverview() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    (async () => {
      try {
        const calTt = await getTimetable();
        const clsTt = await getClassTimetable();
        const dateStr = getTodayString();
        const dName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        
        const calEntry = (calTt || []).find(t => t.date === dateStr) || null;
        let clsEntry = null;
        if (clsTt && clsTt[dName]) {
          clsEntry = clsTt[dName];
        } else if (clsTt && !clsTt[dName]) {
          clsEntry = [];
        }

        setData({ calEntry, clsEntry, dName, dateObj: new Date() });
      } catch (e) {
        setData({ error: true });
      }
    })();
  }, []);

  if (!data) return <div style={{ color: '#64748b', fontSize: '0.85rem' }}>Loading overview...</div>;

  const { calEntry, clsEntry, dName, dateObj } = data;
  
  // -- Schedule Parsing -- 
  const isHoliday = calEntry ? !calEntry.isCollegeDay : false;
  const raw = calEntry?.originalStatus || '';
  const isMonday = dateObj.getDay() === 1;
  const isGeneric = !raw || raw.startsWith('Working Day') || raw.startsWith('College Day') || raw === 'Sunday' || raw === 'Saturday';
  const eventLabel = isGeneric ? null : raw.replace(/\s*-\s*Holiday$/i, '');
  
  let workingDayLabel = null;
  if (!isHoliday && raw.startsWith('Working Day') && isMonday) {
    workingDayLabel = raw.split('-')[0].trim();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Banner: Date & Schedule */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '1rem',
        padding: '1rem', borderRadius: '0.85rem',
        background: isHoliday ? 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(239,68,68,0.02))' : 'linear-gradient(135deg, rgba(52,211,153,0.1), rgba(52,211,153,0.02))',
        border: `1px solid ${isHoliday ? 'rgba(248,113,113,0.2)' : 'rgba(52,211,153,0.2)'}`,
        borderLeft: `5px solid ${isHoliday ? '#f87171' : '#34d399'}`,
      }}>
        <div style={{
          width: '54px', height: '54px', borderRadius: '0.75rem',
          background: isHoliday ? 'rgba(239,68,68,0.15)' : 'rgba(52,211,153,0.15)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          border: `1px solid ${isHoliday ? 'rgba(248,113,113,0.3)' : 'rgba(52,211,153,0.3)'}`
        }}>
          <span style={{ fontSize: '1.4rem', fontWeight: 900, color: isHoliday ? '#fca5a5' : '#86efac', lineHeight: 1 }}>{dateObj.getDate()}</span>
          <span style={{ fontSize: '0.6rem', fontWeight: 800, color: isHoliday ? '#f87171' : '#34d399', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{dName.substring(0, 3)}</span>
        </div>
        
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: isHoliday ? '#fca5a5' : '#86efac' }}>
              {isHoliday ? 'Holiday' : (calEntry ? 'College Day' : 'No Schedule Events')}
            </span>
            {workingDayLabel && (
              <span style={{ background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {workingDayLabel}
              </span>
            )}
            {eventLabel && (
              <span style={{ background: isHoliday ? 'rgba(248,113,113,0.2)' : 'rgba(96,165,250,0.2)', color: isHoliday ? '#fca5a5' : '#93c5fd', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', border: `1px solid ${isHoliday ? '#fca5a5' : '#93c5fd'}` }}>
                <Sparkles size={10} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />{eventLabel}
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500, marginTop: '2px' }}>
            {dName}, {dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Classes Grid */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.25rem' }}>
        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BookOpen size={16} style={{ color: '#a78bfa' }} /> Today's Classes
        </h4>

        {clsEntry === null ? (
          <div style={{ padding: '1rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '0.75rem', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Timetable not configured. Go to <strong style={{ color: '#818cf8' }}>Insights</strong> to upload.</p>
          </div>
        ) : clsEntry.length === 0 ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(52,211,153,0.05)', borderRadius: '0.75rem', border: '1px solid rgba(52,211,153,0.1)' }}>
            <Sparkles size={24} style={{ color: '#34d399', margin: '0 auto 0.5rem' }} />
            <p style={{ color: '#6ee7b7', fontSize: '0.9rem', fontWeight: 600 }}>No classes today!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.85rem' }}>
            {clsEntry.map((c, idx) => (
              <div key={idx} style={{
                background: 'linear-gradient(145deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '0.75rem', padding: '0.85rem',
                display: 'flex', flexDirection: 'column', gap: '0.5rem',
                boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                transition: 'transform 0.2s, background 0.2s',
              }} className="hover:scale-[1.02] hover:bg-white/5">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span style={{
                      background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.25))',
                      border: '1px solid rgba(139,92,246,0.4)', color: '#c4b5fd',
                      padding: '0.15rem 0.5rem', borderRadius: '0.4rem', fontSize: '0.7rem', fontWeight: 800,
                      whiteSpace: 'nowrap', flexShrink: 0
                    }}>P{c.period}</span>
                    <span style={{ 
                      fontSize: '0.65rem', fontWeight: 800, color: '#60a5fa', 
                      textTransform: 'uppercase', letterSpacing: '0.05em', 
                      textAlign: 'right', wordBreak: 'break-all', opacity: 0.9,
                      marginTop: '0.1rem'
                    }}>{c.code}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0', lineHeight: 1.3 }}>
                    {c.name}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TodayOutfitPreview() {
  const [outfit, setOutfit] = useState(null);
  useEffect(() => {
    (async () => {
      const history = await getHistory();
      const td = getTodayString();
      const existing = history.find(h => h.date === td);
      if (existing) {
         const shirts = await getShirts();
         const pants = await getPants();
         const shirt = shirts.find(s => s.id === existing.shirtId);
         const pant = pants.find(p => p.id === existing.pantId);
         if (shirt && pant) setOutfit({ shirt, pant });
      }
    })();
  }, []);

  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden', borderRadius: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'center', minHeight: '150px', background: 'linear-gradient(135deg, rgba(255,255,255,0.02), rgba(0,0,0,0.15))', border: '1px solid rgba(255,255,255,0.05)' }}>
      
      {outfit ? (
        <div style={{ position: 'absolute', inset: 0, padding: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'stretch' }}>
          
          {/* Left Frame: Shirt */}
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ type: 'spring', delay: 0.1 }}
            style={{ flex: 1, position: 'relative', borderRadius: '0.75rem', overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.4)', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }}>
             <img src={outfit.shirt.image} alt="Shirt" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
             <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0.8rem', background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
               <div>
                  <span style={{ display: 'block', fontSize: '0.65rem', color: '#cbd5e1', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Top Hit</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white' }}>{outfit.shirt.color || 'Shirt'}</span>
               </div>
             </div>
          </motion.div>
          
          {/* Center Connection */}
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
             <motion.div initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', delay: 0.3 }}
                style={{ background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', color: '#a78bfa', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(0,0,0,0.6)', border: '2px solid rgba(167, 139, 250, 0.4)' }}>
                <Plus size={18} strokeWidth={3} />
             </motion.div>
             <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', padding: '0.25rem 0.6rem', borderRadius: '999px', fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', boxShadow: '0 2px 10px rgba(16, 185, 129, 0.4)', border: '1px solid rgba(255,255,255,0.2)' }}>
                Verified
             </motion.div>
          </div>

          {/* Right Frame: Pant */}
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ type: 'spring', delay: 0.2 }}
            style={{ flex: 1, position: 'relative', borderRadius: '0.75rem', overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.4)', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }}>
             <img src={outfit.pant.image} alt="Pant" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
             <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0.8rem', background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', textAlign: 'right' }}>
               <div style={{ width: '100%' }}>
                  <span style={{ display: 'block', fontSize: '0.65rem', color: '#cbd5e1', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Bottom Match</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white' }}>{outfit.pant.color || 'Pant'}</span>
               </div>
             </div>
          </motion.div>

        </div>
      ) : (
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '2rem' }}>
          <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.05)' }}>
            <Shirt size={32} style={{ color: '#64748b' }} />
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0, textAlign: 'center', lineHeight: 1.5 }}>No outfit scheduled yet.<br/>Jump to the <strong style={{ color: '#8b5cf6' }}>Stylist</strong> to build one.</p>
        </div>
      )}
    </div>
  );
}

function ExamTracker() {
  const [examTt, setExamTt] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nextExam, setNextExam] = useState(null);
  const [upcomingExamDate, setUpcomingExamDate] = useState(null);
  
  useEffect(() => { load(); }, []);
  
  const load = async () => {
    setLoading(true);
    const data = await getExamTimetable();
    const calTt = await getTimetable();
    setExamTt(data || []);
    
    const currentNow = new Date();
    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);
    const dayMs = 24 * 60 * 60 * 1000;

    // 1. Check detailed exams for anything that is upcoming (not past 3pm) and within 2 days
    let activeExam = null;
    if (data && data.length > 0) {
      const sorted = [...data].sort((a,b) => a.date.localeCompare(b.date));
      activeExam = sorted.find(e => {
         const [y, m, d] = e.date.split('-');
         const examDay3PM = new Date(parseInt(y), parseInt(m) - 1, parseInt(d), 15, 0, 0);
         
         if (currentNow < examDay3PM) {
            // Check if this upcoming exam is within 2 days of today
            const examDateOnly = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
            const diff = Math.ceil((examDateOnly.getTime() - todayStart.getTime()) / dayMs);
            return diff <= 2;
         }
         return false;
      });
      setNextExam(activeExam);
    } else {
      setNextExam(null);
    }

    // 2. If no detailed active exam, check regular calendar for "Exam" within 2 days
    if (!activeExam && calTt && calTt.length > 0) {
      const nextDays = [0, 1, 2].map(d => {
        const date = new Date(todayStart.getTime() + d * dayMs);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      });

      const upcoming = calTt.find(t => 
        nextDays.includes(t.date) && 
        t.originalStatus && 
        t.originalStatus.toLowerCase().includes('exam')
      );
      
      if (upcoming) {
        const examDate = new Date(upcoming.date + 'T00:00:00');
        const diffDays = Math.ceil((examDate.getTime() - currentNow.getTime()) / dayMs);
        setUpcomingExamDate({ date: upcoming.date, diff: diffDays });
      } else {
        setUpcomingExamDate(null);
      }
    } else {
      setUpcomingExamDate(null);
    }
    
    setLoading(false);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const data = await processExamTimetableImage(file);
    await setExamTimetable(data);
    await load();
  };

  if (loading) return null;

  // Decision Logic: Should we show the banner at all?
  const shouldShow = (examTt.length > 0 && nextExam) || upcomingExamDate;
  if (!shouldShow) return null;

  return (
    <motion.section initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', marginBottom: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.3)', background: 'linear-gradient(to right, rgba(239, 68, 68, 0.05), rgba(0,0,0,0.2))' }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fca5a5', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
        <AlertCircle size={20} style={{ color: '#ef4444' }} /> CSD Examination Tracker
      </h3>
      
      <div style={{ flex: 1 }}>
        {examTt.length === 0 || !nextExam ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <p style={{ color: '#fca5a5', fontSize: '1rem', fontWeight: 600, margin: '0 0 0.25rem 0' }}>
                CSD Examination Period Detected!
              </p>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
                Exams are approaching in {upcomingExamDate.diff === 0 ? 'today' : upcomingExamDate.diff === 1 ? '1 day' : `${upcomingExamDate.diff} days`}. Upload your timetable strictly!
              </p>
            </div>
            <label style={{ background: '#ef4444', color: 'white', padding: '0.6rem 1.25rem', borderRadius: '0.5rem', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }}>
              <Upload size={16} /> Upload Sample
              <input type="file" accept="image/*,.pdf,.xlsx" onChange={handleUpload} style={{ display: 'none' }} />
            </label>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.15rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'rgba(239, 68, 68, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '999px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>Study Now</span>
              <span style={{ fontSize: '0.9rem', color: '#cbd5e1', fontWeight: 600 }}>{new Date(nextExam.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
            </div>
            <h4 style={{ 
              fontSize: '1.1rem', 
              color: 'white', 
              fontWeight: 800, 
              margin: 0, 
              lineHeight: 1.3,
              wordBreak: 'break-word',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>
              {nextExam.subject.split('(')[0].trim()}
            </h4>
          </div>
        )}
      </div>
    </motion.section>
  );
}

export default function Dashboard({ settings }) {
  const [stats, setStats] = useState({ shirts: 0, pants: 0, inWash: 0, history: [] });

  const [quickAddType, setQuickAddType] = useState(null); // 'shirt' or 'pant'
  const [quickAddImage, setQuickAddImage] = useState(null);
  const [quickAddSuccess, setQuickAddSuccess] = useState(false);

  useEffect(() => {
    const init = async () => {
      await processDailyLaundry();
      await loadStats();
    };
    init();
  }, []);

  const loadStats = async () => {
    const shirts = await getShirts();
    const pants = await getPants();
    const history = await getHistory();
    setStats({
      shirts: shirts.length,
      pants: pants.length,
      inWash: pants.filter(p => p.washStatus === 'in_wash').length,
      cleanPants: pants.filter(p => p.washStatus === 'clean').length,
      history: history.slice(-7).reverse(),
      totalOutfits: history.length,
      allShirts: shirts,
      allPants: pants,
    });
  };

  // Removed AI Recommender functions as they remain on Stylist tab

  const processImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  };

  const handleQuickAddUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setQuickAddType(type);
    const base64 = await processImage(file);
    setQuickAddImage(base64);
  };

  const submitQuickAdd = async () => {
    if (!quickAddImage) return;
    try {
      if (quickAddType === 'shirt') {
        await addShirt(quickAddImage);
      } else {
        await addPant(quickAddImage);
      }
      setQuickAddSuccess(true);
      setQuickAddImage(null);
      setQuickAddType(null);
      await loadStats();
      setTimeout(() => setQuickAddSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Exam Tracker Banner */}
      <ExamTracker />

      {/* Stats Row */}
      <div style={{ marginBottom: '0.5rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white', marginBottom: '0.25rem' }}>
          {settings?.userName ? `Hello, ${settings.userName}!` : 'Hey there!'}
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 500 }}>Here's your wardrobe status for today.</p>
      </div>

      <div className="stats-row">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }} className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--accent-glow)' }}>
            <Shirt size={22} style={{ color: 'var(--accent)' }} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.shirts}</span>
            <span className="stat-label">Shirts</span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(167, 139, 250, 0.15)' }}>
            <Scissors size={22} style={{ color: '#a78bfa' }} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.pants}</span>
            <span className="stat-label">Pants</span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(251, 191, 36, 0.15)' }}>
            <Droplets size={22} style={{ color: '#fbbf24' }} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.inWash}</span>
            <span className="stat-label">Under Washing</span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(52, 211, 153, 0.15)' }}>
            <TrendingUp size={22} style={{ color: '#34d399' }} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.totalOutfits || 0}</span>
            <span className="stat-label">Outfits Generated</span>
          </div>
        </motion.div>
      </div>

      {/* Today Outfit Focus */}
      {/* Top Row: Today's Schedule + Today Outfit Focus */}
      <div className="responsive-stack" style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>

        {/* Today's Overview Card */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
            <Calendar size={20} style={{ color: '#818cf8' }} /> Schedule Overview
          </h3>
          <TodayOverview />
        </motion.section>

        {/* Today Outfit Focus */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
            <Sparkles size={20} style={{ color: '#818cf8' }} /> Today's Outfit
          </h3>
          <TodayOutfitPreview />
        </motion.section>

      </div>

      {/* Bottom Row: Wardrobe Stats & Quick Add */}
      <div className="responsive-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

        {/* Wardrobe Quick Stats */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'white', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Zap size={18} style={{ color: '#fbbf24' }} /> Wardrobe Quick Stats
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Freshness meter */}
            {stats.pants > 0 && (() => {
              const cleanPct = Math.round(((stats.cleanPants || stats.pants) / stats.pants) * 100);
              const freshColor = cleanPct >= 80 ? '#34d399' : cleanPct >= 50 ? '#fbbf24' : '#f87171';
              return (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                    <span style={{ color: '#94a3b8', fontWeight: 600 }}>Wardrobe Freshness</span>
                    <span style={{ color: freshColor, fontWeight: 700 }}>{cleanPct}%</span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ width: `${cleanPct}%`, height: '100%', background: `linear-gradient(90deg, ${freshColor}, ${freshColor}90)`, borderRadius: '999px', transition: 'width 0.5s' }} />
                  </div>
                </div>
              );
            })()}

            {/* Quick info cards */}
            {[
              { icon: '👔', label: 'Shirts Ready', value: `${stats.shirts}`, color: '#60a5fa' },
              { icon: '👖', label: 'Clean Pants', value: `${stats.cleanPants || stats.pants} / ${stats.pants}`, color: '#a78bfa' },
              { icon: '🧺', label: 'In the Wash', value: `${stats.inWash}`, color: stats.inWash > 0 ? '#fbbf24' : '#34d399' },
              { icon: '🎯', label: 'Total Outfits', value: `${stats.totalOutfits || 0}`, color: '#818cf8' },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.5rem 0.65rem', borderRadius: '0.5rem',
                background: 'rgba(255,255,255,0.02)',
              }}>
                <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                <span style={{ flex: 1, fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>{item.label}</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: item.color }}>{item.value}</span>
              </div>
            ))}
          </div>
        </motion.section>
        {/* Quick Add Card */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'white', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Camera size={18} style={{ color: '#6ee7b7' }} /> Quick Add to Wardrobe
          </h3>
          
          <AnimatePresence mode="wait">
            {quickAddSuccess ? (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} style={{ height: '140px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(52,211,153,0.1)', borderRadius: '1rem', border: '1px solid rgba(52,211,153,0.3)' }}>
                <CheckCircle2 size={40} style={{ color: '#34d399', marginBottom: '0.5rem' }} />
                <span style={{ color: '#6ee7b7', fontWeight: 700 }}>Added Successfully!</span>
              </motion.div>
            ) : quickAddImage ? (
              <motion.div key="preview" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '1rem' }}>
                <img src={quickAddImage} alt="preview" style={{ width: '80px', height: '80px', borderRadius: '0.5rem', objectFit: 'cover' }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: 600, marginBottom: '0.75rem' }}>
                    Adding new {quickAddType}...
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={submitQuickAdd} style={{ flex: 1, background: '#6366f1', color: 'white', border: 'none', padding: '0.5rem', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
                      Save Item
                    </button>
                    <button onClick={() => { setQuickAddImage(null); setQuickAddType(null); }} style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.1)', color: '#94a3b8', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="buttons" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', height: '140px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', background: 'rgba(96,165,250,0.08)', border: '2px dashed rgba(96,165,250,0.3)', borderRadius: '1rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                  <input type="file" accept="image/*" capture="environment" onChange={(e) => handleQuickAddUpload(e, 'shirt')} style={{ display: 'none' }} />
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(96,165,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Shirt size={20} style={{ color: '#60a5fa' }} />
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#93c5fd' }}>Add Shirt</span>
                </label>
                
                <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', background: 'rgba(167,139,250,0.08)', border: '2px dashed rgba(167,139,250,0.3)', borderRadius: '1rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                  <input type="file" accept="image/*" capture="environment" onChange={(e) => handleQuickAddUpload(e, 'pant')} style={{ display: 'none' }} />
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(167,139,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Scissors size={20} style={{ color: '#a78bfa' }} />
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#c4b5fd' }}>Add Pant</span>
                </label>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>
      </div>

    </div>
  );
}
