import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, AlertCircle, Calendar, RefreshCw, Cpu, Zap, Shirt, Scissors, Droplets, TrendingUp, Upload, CloudSun, Wind, Camera, Plus, CheckCircle2, Clock, BookOpen, Star, Trash2 } from 'lucide-react';
import { suggestOutfit, getHistory, getShirts, getPants, getTimetable, confirmOutfit, addShirt, addPant, getClassTimetable, addSpecialDay, getTodayString, getSpecialDays, cancelSpecialDay, processDailyLaundry, getImage } from '../utils/engine';

// TodayOverview component removed for Stylist view.


export default function Stylist({ settings }) {
  const [outfit, setOutfit] = useState(null);
  const [error, setError] = useState(null);
  const [skipReason, setSkipReason] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isExisting, setIsExisting] = useState(false);
  const [matchScore, setMatchScore] = useState(null);
  const [rejectedShirts, setRejectedShirts] = useState([]);
  const [rejectedPants, setRejectedPants] = useState([]);
  const [stats, setStats] = useState({ shirts: 0, pants: 0, inWash: 0, history: [] });

  useEffect(() => {
    const init = async () => {
      await processDailyLaundry();
      await loadStats();
      await checkTodayOutfit();
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

  const checkTodayOutfit = async () => {
    try {
      const history = await getHistory();
      const today = getTodayString();
      const existing = history.find(h => h.date === today);
      if (existing) {
        const result = await suggestOutfit(null, false, [], [], 'Regular', settings?.stylePersona || 'Balanced');
        if (result.selectedShirt && result.selectedPant) {
          setOutfit(result);
          setIsExisting(result.isExisting);
          if (result.matchScore !== undefined) setMatchScore(result.matchScore);
        } else {
          setOutfit(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSuggest = async (forceNew = false) => {
    let currentSRejects = [...rejectedShirts];
    let currentPRejects = [...rejectedPants];
    
    if (forceNew && outfit) {
      if (outfit.selectedShirt && !currentSRejects.includes(outfit.selectedShirt.id)) {
        currentSRejects.push(outfit.selectedShirt.id);
        setRejectedShirts(currentSRejects);
      }
      if (outfit.selectedPant && !currentPRejects.includes(outfit.selectedPant.id)) {
        currentPRejects.push(outfit.selectedPant.id);
        setRejectedPants(currentPRejects);
      }
    } else if (!forceNew) {
      setRejectedShirts([]);
      setRejectedPants([]);
      currentSRejects = [];
      currentPRejects = [];
    }
    
    setLoading(true);
    setError(null);
    setSkipReason(null);
    setOutfit(null);
    setMatchScore(null);
    
    await new Promise(r => setTimeout(r, 1800));

    try {
      const result = await suggestOutfit(null, forceNew, currentSRejects, currentPRejects, 'Regular', settings?.stylePersona || 'Balanced');
      if (result.error) {
        setError(result.error);
      } else if (result.skip) {
        setSkipReason(result.reason);
      } else {
        setOutfit(result);
        setIsExisting(result.isExisting);
        if (result.matchScore !== undefined) setMatchScore(result.matchScore);
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred. Try resetting your data.');
    }
    setLoading(false);
    loadStats();
  };

  const handleConfirm = async () => {
    if (!outfit) return;
    const success = await confirmOutfit(outfit.selectedShirt.id, outfit.selectedPant.id);
    if (success) {
      setIsExisting(true);
      loadStats();
    }
  };

  const getScoreLabel = (score) => {
    if (score >= 9) return { text: 'Perfect Match', color: '#34d399' };
    if (score >= 7) return { text: 'Great Combo', color: '#60a5fa' };
    if (score >= 5) return { text: 'Acceptable', color: '#fbbf24' };
    return { text: 'Clashing', color: '#f87171' };
  };

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
        await addShirt({
          id: Date.now().toString(),
          image: quickAddImage,
          wearCount: 0,
          lastWorn: null
        });
      } else {
        await addPant({
          id: Date.now().toString(),
          image: quickAddImage,
          wearCount: 0,
          washStatus: 'clean',
          daysInWash: 0,
          lastWorn: null
        });
      }
      setQuickAddSuccess(true);
      loadStats();
      setTimeout(() => {
        setQuickAddSuccess(false);
        setQuickAddImage(null);
        setQuickAddType(null);
      }, 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Removed Stats Row */}

      {/* Main Display Area */}
      <section className="glass-panel" style={{ padding: '2rem', minHeight: '420px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        


        {/* State: Initial / Ready */}
        {!outfit && !loading && !error && !skipReason && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', maxWidth: '32rem' }}>
            <div style={{ width: '5rem', height: '5rem', background: 'rgba(79, 70, 229, 0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', position: 'relative' }}>
              <Cpu size={40} style={{ color: 'var(--accent)' }} />
              <div style={{ position: 'absolute', top: '-0.25rem', right: '-0.25rem', width: '1.25rem', height: '1.25rem', background: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={12} style={{ color: 'white' }} />
              </div>
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white', marginBottom: '1.5rem' }}>AI Style Engine</h2>
            
            <p style={{ color: '#94a3b8', marginBottom: '2rem', lineHeight: 1.6, textAlign: 'center' }}>
              Intelligently analyzing your <strong style={{ color: '#a5b4fc' }}>wardrobe</strong> and building the <strong style={{ color: '#f472b6' }}>perfect</strong> outfit.
            </p>

            <p style={{ color: '#64748b', marginBottom: '2rem', fontSize: '0.875rem' }}>
              {stats.shirts > 0 && stats.pants > 0 
                ? `Ready to analyze ${stats.shirts} shirts × ${stats.cleanPants || stats.pants} available pants`
                : 'Add shirts and pants in the Wardrobe tab to get started.'}
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button onClick={() => handleSuggest(false)} disabled={stats.shirts === 0 || stats.pants === 0} className="btn-hero">
                <Sparkles style={{ animation: 'pulse 2s ease-in-out infinite' }} /> Generate AI Suggestion
              </button>
            </div>
          </motion.div>
        )}

        {/* State: Loading */}
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '7rem', height: '7rem', marginBottom: '1.5rem' }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', borderTop: '2px solid var(--accent)', animation: 'spin 1s linear infinite' }}></div>
              <div style={{ position: 'absolute', inset: '0.5rem', borderRadius: '50%', borderRight: '2px solid #8b5cf6', animation: 'spin 1.5s linear infinite reverse' }}></div>
              <div style={{ position: 'absolute', inset: '1rem', borderRadius: '50%', borderBottom: '2px solid #10b981', animation: 'spin 2s linear infinite' }}></div>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Cpu style={{ color: '#818cf8', animation: 'pulse 1s ease-in-out infinite' }} size={28} />
              </div>
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, background: 'linear-gradient(to right, #60a5fa, #a78bfa, #34d399)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              AI Analyzing Colors...
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>Sampling pixels • Classifying tones • Scoring combinations</p>
          </motion.div>
        )}

        {/* State: Error */}
        {error && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', maxWidth: '24rem' }}>
            <AlertCircle size={60} style={{ color: '#f43f5e', marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', marginBottom: '0.5rem' }}>Cannot Generate</h3>
            <p style={{ color: '#fda4af', marginBottom: '1.5rem' }}>{error}</p>
            <button onClick={() => handleSuggest(false)} className="btn-regen">
              <RefreshCw size={16} /> Try Again
            </button>
          </motion.div>
        )}

        {/* State: Skip/Holiday */}
        {skipReason && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', maxWidth: '28rem' }}>
            <div style={{ width: '6rem', height: '6rem', background: 'rgba(139, 92, 246, 0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <Calendar size={48} style={{ color: '#a78bfa' }} />
            </div>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'white', marginBottom: '0.5rem' }}>It's a {skipReason}!</h3>
            <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>No college today. Wear whatever feels right!</p>
            <button onClick={() => { setSkipReason(null); handleSuggest(false); }} className="btn-regen">
              Suggest Anyway
            </button>
          </motion.div>
        )}

        {/* State: Result */}
        <AnimatePresence>
          {outfit && !loading && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}
            >
              {isExisting && !outfit.isSpecial && (
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '1rem', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '0.5rem 1.5rem', borderRadius: '999px', color: '#a5b4fc', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <Sparkles size={14} /> Outfit preserved for today
                </motion.div>
              )}

              {/* AI Match Score Badge */}
              {matchScore !== null && matchScore !== undefined && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.5 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  transition={{ delay: 0.3, type: "spring" }}
                  style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.5rem', borderRadius: '1rem', background: `${getScoreLabel(matchScore).color}15`, border: `1px solid ${getScoreLabel(matchScore).color}40` }}>
                    <Cpu size={20} style={{ color: getScoreLabel(matchScore).color }} />
                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: getScoreLabel(matchScore).color }}>
                      {getScoreLabel(matchScore).text}
                    </span>
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', marginLeft: '0.5rem' }}>{matchScore}/10</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>AI Color Compatibility Score</span>
                </motion.div>
              )}
              
              <div className="outfit-display" style={{ width: '100%' }}>
                <motion.div 
                  initial={{ opacity: 0, x: -50, rotate: -5 }}
                  animate={{ opacity: 1, x: 0, rotate: -2 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="polaroid-card"
                >
                  <img src={outfit.selectedShirt.image} alt="Shirt" />
                  <div className="polaroid-title" style={{ color: '#93c5fd' }}>👔 Selected Shirt</div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', color: '#475569', fontWeight: 200, padding: '0 1rem', paddingBottom: '3rem' }}
                >
                  +
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, x: 50, rotate: 5 }}
                  animate={{ opacity: 1, x: 0, rotate: 2 }}
                  transition={{ delay: 0.4, type: "spring" }}
                  className="polaroid-card"
                >
                  <img src={outfit.selectedPant.image} alt="Pant" />
                  <div className="polaroid-title" style={{ color: '#c4b5fd' }}>👖 Selected Pant</div>
                </motion.div>
              </div>

              {/* Accept / Reject */}
              {!outfit.isSpecial && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
                  style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}
                >
                  {!isExisting && (
                    <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.25rem' }}>
                      Do you like this outfit?
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    {!isExisting && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleConfirm}
                        style={{
                          background: 'linear-gradient(135deg, #10b981, #34d399)',
                          border: 'none', borderRadius: '0.75rem',
                          padding: '0.65rem 1.5rem', color: 'white',
                          fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '0.4rem',
                          boxShadow: '0 4px 15px rgba(16,185,129,0.3)',
                        }}
                      >
                        ✅ Love it!
                      </motion.button>
                    )}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSuggest(true)}
                      style={{
                        background: isExisting ? 'rgba(255,255,255,0.06)' : 'rgba(239,68,68,0.12)',
                        border: `1px solid ${isExisting ? 'rgba(255,255,255,0.1)' : 'rgba(239,68,68,0.25)'}`,
                        borderRadius: '0.75rem',
                        padding: '0.65rem 1.5rem',
                        color: isExisting ? '#94a3b8' : '#fca5a5',
                        fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                      }}
                    >
                      <RefreshCw size={15} /> {isExisting ? 'Change Outfit' : 'Try Another'}
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {outfit.isSpecial && (
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ padding: '0.75rem 2.5rem', background: 'rgba(236, 72, 153, 0.1)', borderRadius: '999px', border: '1px solid rgba(236, 72, 153, 0.3)', boxShadow: '0 4px 20px rgba(236, 72, 153, 0.15)' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f472b6', display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <Star size={20} /> Scheduled for {outfit.eventType}
                    </span>
                  </div>
                  <button onClick={handleCancelSpecial} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#f87171'} onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}>
                    <Trash2 size={14} /> Cancel Schedule
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Bottom layout cleaned up for Stylist view */}
      {/* Quick Actions & Tips Row */}
      {(() => {
        const ALL_TIPS = [
          { title: "Did you know?", color: "#a78bfa", bg: "rgba(167, 139, 250, 0.08)", text: "Adding staple colors like White, Black, and Navy pants will exponentially increase your high-scoring outfit combinations." },
          { title: "Weather Insight", color: "#38bdf8", bg: "rgba(56, 189, 248, 0.08)", text: "Light colored shirts (whites, pastels) are great for sunny days to reflect heat, while dark colors absorb it." },
          { title: "Pro Tip: Contrast", color: "#10b981", bg: "rgba(16, 185, 129, 0.08)", text: "When matching colors, aim for high contrast. A light shirt with dark pants is universally flattering." },
          { title: "Color Theory", color: "#f472b6", bg: "rgba(244, 114, 182, 0.08)", text: "Earth tones like olive, brown, and mustard work incredibly well together, creating a grounded aesthetic." },
          { title: "Style Secret", color: "#fbbf24", bg: "rgba(251, 191, 36, 0.08)", text: "Your shoes should perfectly match or complement your belt, and ideally anchor the darkest color in your outfit." },
          { title: "Laundry Hack", color: "#6366f1", bg: "rgba(99, 102, 241, 0.08)", text: "Turn your printed and dark shirts inside out before washing to prevent fading and cracking." },
          { title: "Fit Strategy", color: "#ec4899", bg: "rgba(236, 72, 153, 0.08)", text: "Fit is more important than brand. Even an inexpensive shirt looks premium if the shoulder seams sit perfectly." },
          { title: "Monochrome Cheat", color: "#94a3b8", bg: "rgba(148, 163, 184, 0.08)", text: "Wearing different shades of the exact same color (monochrome) automatically makes you look taller and slimmer." }
        ];

        const dayIndex = Math.floor(Date.now() / 86400000); // 1 day in millis
        const tip1 = ALL_TIPS[(dayIndex * 2) % ALL_TIPS.length];
        const tip2 = ALL_TIPS[(dayIndex * 2 + 1) % ALL_TIPS.length];

        return (
          <div className="responsive-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'stretch' }}>
            
            {/* Smart Tips Card */}
            <motion.section initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'white', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={18} style={{ color: '#a78bfa' }} /> Daily Style Tips
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ padding: '1rem', borderRadius: '0.75rem', background: tip1.bg, borderLeft: `3px solid ${tip1.color}` }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: tip1.color, marginBottom: '0.25rem' }}>{tip1.title}</div>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>{tip1.text}</p>
                </div>
                <div style={{ padding: '1rem', borderRadius: '0.75rem', background: tip2.bg, borderLeft: `3px solid ${tip2.color}` }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: tip2.color, marginBottom: '0.25rem' }}>{tip2.title}</div>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>{tip2.text}</p>
                </div>
              </div>
            </motion.section>

        {/* Color Palette Analyzer */}
        {(() => {
          const allItems = [...(stats.allShirts || []), ...(stats.allPants || [])];
          if (allItems.length === 0) {
            return (
              <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', textAlign: 'center', justifyContent: 'center' }}>
                <div style={{ width: '4rem', height: '4rem', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}>
                  <Droplets size={24} style={{ color: '#64748b' }} />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white' }}>Palette Analysis</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.6, margin: 0, maxWidth: '18rem' }}>
                  Upload your wardrobe items to see your unique <strong style={{ color: '#94a3b8' }}>Color Profile</strong> analyzed here.
                </p>
              </motion.section>
            );
          }

          const categories = allItems.map(item => item.colorCategory || 'neutral');
          const coolCount = categories.filter(c => ['blue', 'dark', 'neutral', 'light'].includes(c)).length;
          const warmCount = categories.filter(c => ['warm', 'earth'].includes(c)).length;
          const total = coolCount + warmCount || 1;
          const coolPct = Math.round((coolCount / total) * 100);
          const warmPct = 100 - coolPct;

          const summary = coolPct >= warmPct 
            ? { text: 'Cool Tones', color: '#60a5fa', action: 'Warm Accents' }
            : { text: 'Warm Tones', color: '#f472b6', action: 'Cool Accents' };

          return (
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <Droplets size={18} style={{ color: '#ec4899' }} /> Color Palette Analyzer
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
                Your wardrobe leans mainly towards <strong style={{ color: summary.color }}>{summary.text}</strong>. Try adding more <strong style={{ color: coolPct >= warmPct ? '#f472b6' : '#60a5fa' }}>{summary.action}</strong> to maximize unique combinations!
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <div style={{ flex: coolPct || 1, height: '40px', background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', borderRadius: '0.5rem', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.1)' }} />
                <div style={{ flex: warmPct || 1, height: '40px', background: 'linear-gradient(135deg, #831843, #ec4899)', borderRadius: '0.5rem', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.1)' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', marginTop: 'auto' }}>
                 <span style={{ color: '#93c5fd', fontWeight: 700 }}>{coolPct}% Cool</span>
                 <span style={{ color: '#fca5a5', fontWeight: 700 }}>{warmPct}% Warm</span>
              </div>
            </motion.section>
          );
        })()}

          </div>
        );
      })()}
    </div>
  );
}
