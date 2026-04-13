import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Droplets, Clock, Sparkles, Star, TrendingUp, Calendar, Shirt, Scissors, Eye, ChevronLeft, ChevronRight, Upload, FileSpreadsheet, RefreshCw, CheckCircle2, Image as ImageIcon, Check } from 'lucide-react';
import { getShirts, getPants, getHistory, getTimetable, setTimetable, getClassTimetable, setClassTimetable, processTimetableImage, getExamTimetable, getAcademicData, setAcademicData } from '../utils/engine';
import { getDominantColor, classifyColor } from '../utils/colorMatcher';
import { parseCalendarExcel } from '../utils/calendarParser';

export default function Insights({ settings }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  
  const [hasClassTt, setHasClassTt] = useState(false);
  const [classTtUploading, setClassTtUploading] = useState(false);
  const [classTtSuccess, setClassTtSuccess] = useState(false);
  const [userExamIdx, setUserExamIdx] = useState(null);
  const [academicData, setAcademicDataState] = useState(null);
  const [editingSem, setEditingSem] = useState(null); // ID of semester being edited

  const handleCalendarUpload = async (file) => {
    if (!file || !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setUploadError('Please upload a valid Excel (.xlsx/.xls) or CSV file.');
      return;
    }
    setUploading(true);
    setUploadError('');
    try {
      const entries = await parseCalendarExcel(file);
      if (entries.length === 0) {
        setUploadError('Could not find calendar entries. Make sure the file has month headers and date rows.');
      } else {
        await setTimetable(entries);
        await loadInsights(); // Refresh everything
      }
    } catch (err) {
      setUploadError('Error parsing file: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleClassTimetableUpload = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setUploadError('Please upload a valid image file for the class timetable.');
      return;
    }
    setClassTtUploading(true);
    setUploadError('');
    try {
      const data = await processTimetableImage(file);
      await setClassTimetable(data);
      setHasClassTt(true);
      setClassTtSuccess(true);
      setTimeout(() => setClassTtSuccess(false), 3000);
    } catch (err) {
      setUploadError('Error parsing image: ' + err.message);
    } finally {
      setClassTtUploading(false);
    }
  };

  useEffect(() => { 
    loadInsights(); 
    (async () => {
      const acad = await getAcademicData();
      setAcademicDataState(acad);
    })();
  }, []);

  const loadInsights = async () => {
    setLoading(true);
    const shirts = await getShirts();
    const pants = await getPants();
    const history = await getHistory();

    // --- Most worn shirt ---
    const shirtWearMap = {};
    history.forEach(h => { shirtWearMap[h.shirtId] = (shirtWearMap[h.shirtId] || 0) + 1; });
    const topShirtId = Object.entries(shirtWearMap).sort((a, b) => b[1] - a[1])[0];
    const topShirt = topShirtId ? shirts.find(s => s.id === topShirtId[0]) : null;

    // --- Most worn pant ---
    const pantWearMap = {};
    history.forEach(h => { pantWearMap[h.pantId] = (pantWearMap[h.pantId] || 0) + 1; });
    const topPantId = Object.entries(pantWearMap).sort((a, b) => b[1] - a[1])[0];
    const topPant = topPantId ? pants.find(p => p.id === topPantId[0]) : null;

    // --- Wash tracker ---
    const washingPants = pants.filter(p => p.washStatus === 'in_wash').map(p => ({
      ...p,
      remainingDays: Math.max(0, 2 - (p.daysInWash || 0))
    }));

    // --- Color distribution ---
    const colorBuckets = { dark: 0, light: 0, blue: 0, warm: 0, earth: 0, neutral: 0 };
    for (const item of [...shirts, ...pants]) {
      try {
        if (item.image) {
          const clr = await getDominantColor(item.image);
          const cat = classifyColor(clr);
          if (colorBuckets[cat] !== undefined) colorBuckets[cat]++;
        }
      } catch { /* skip */ }
    }
    const maxColorCount = Math.max(...Object.values(colorBuckets), 1);

    // --- Usage streak ---
    const today = new Date();
    let streak = 0;
    for (let d = 0; d < 365; d++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - d);
      const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
      if (history.find(h => h.date === dateStr)) {
        streak++;
      } else {
        break;
      }
    }

    // --- Calendar data (stored raw, computed per-month in render) ---
    const timetable = await getTimetable();
    const classTt = await getClassTimetable();
    const examTt = await getExamTimetable();
    setHasClassTt(!!classTt);

    // --- Least worn items ---
    const leastWornShirts = [...shirts].sort((a, b) => (a.wearCount || 0) - (b.wearCount || 0)).slice(0, 3);
    const availablePantsCount = pants.filter(p => p.washStatus === 'clean' && (p.wearCount || 0) < 1).length;

    setStats({
      shirts, pants, history, timetable, examTt,
      topShirt: topShirt ? { ...topShirt, count: topShirtId[1] } : null,
      topPant: topPant ? { ...topPant, count: topPantId[1] } : null,
      washingPants, colorBuckets, maxColorCount, streak,
      leastWornShirts, availablePantsCount,
      totalOutfits: history.length
    });
    setLoading(false);
  };

  const colorLabels = {
    dark: { name: 'Dark', color: '#475569', bg: '#1e293b' },
    light: { name: 'Light', color: '#e2e8f0', bg: '#f1f5f9' },
    blue: { name: 'Blue', color: '#60a5fa', bg: '#1e3a5f' },
    warm: { name: 'Warm', color: '#fb923c', bg: '#7c2d12' },
    earth: { name: 'Earth', color: '#a3764f', bg: '#44240a' },
    neutral: { name: 'Neutral', color: '#9ca3af', bg: '#374151' }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', borderTop: '3px solid #6366f1', animation: 'spin 1s linear infinite' }}></div>
          <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Analyzing your wardrobe...</span>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', borderTop: '3px solid #6366f1', animation: 'spin 1s linear infinite' }}></div>
          <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Loading...</span>
        </div>
      </div>
    );
  }

  const hasWardrobe = stats.shirts.length > 0 || stats.pants.length > 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '64rem', margin: '0 auto' }}>

      {/* Top Metrics — only when wardrobe has items */}
      {hasWardrobe && <div className="stats-row mobile-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        {[
          { icon: <Sparkles size={20} style={{ color: '#a78bfa' }} />, value: stats.totalOutfits, label: 'Outfits Created', bg: 'rgba(167,139,250,0.1)' },
          { icon: <Star size={20} style={{ color: '#f43f5e' }} />, value: stats.shirts.length + stats.pants.length, label: 'Wardrobe Size', bg: 'rgba(244,63,94,0.1)' },
          { icon: <Shirt size={20} style={{ color: '#60a5fa' }} />, value: stats.availablePantsCount, label: 'Pants Available', bg: 'rgba(96,165,250,0.1)' },
          { icon: <Droplets size={20} style={{ color: '#fbbf24' }} />, value: stats.washingPants.length, label: 'Pants in Wash', bg: 'rgba(251,191,36,0.1)' },
        ].map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="stat-card">
            <div className="stat-icon" style={{ background: m.bg }}>{m.icon}</div>
            <div className="stat-info">
              <span className="stat-value" style={{ fontSize: '1.4rem' }}>{m.value}</span>
              <span className="stat-label">{m.label}</span>
            </div>
          </motion.div>
        ))}
      </div>}

      {/* Calendar Upload + Full Month Outfit Calendar */}
      {(!stats.timetable || stats.timetable.length === 0) && (
        <section className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
          <FileSpreadsheet size={42} style={{ color: 'var(--accent)', margin: '0 auto 1rem', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'white', marginBottom: '0.5rem' }}>Add Your College Calendar</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.5rem', maxWidth: '28rem', margin: '0 auto 1.5rem' }}>Upload your academic calendar Excel file to see holidays, exams, and events on the calendar below.</p>
          <input type="file" accept=".xlsx,.xls,.csv" id="cal-upload" style={{ display: 'none' }} onChange={(e) => handleCalendarUpload(e.target.files?.[0])} />
          <label htmlFor="cal-upload" className="btn-hero" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            {uploading ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={16} />}
            {uploading ? 'Parsing...' : 'Upload Calendar'}
          </label>
          {uploadError && <p style={{ color: '#fca5a5', fontSize: '0.8rem', marginTop: '1rem' }}>{uploadError}</p>}
        </section>
      )}

      {(() => {
        const { year, month } = calMonth;
        const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const n = new Date();
        const todayStr = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
        const monthLabel = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const weekdays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

        // Build grid cells
        const cells = [];
        for (let i = 0; i < firstDay; i++) cells.push(null); // empty padding
        for (let d = 1; d <= daysInMonth; d++) {
          const mm = String(month + 1).padStart(2, '0');
          const dd = String(d).padStart(2, '0');
          const dateStr = `${year}-${mm}-${dd}`;
          const entry = stats.history.find(h => h.date === dateStr);
          const shirt = entry ? stats.shirts.find(s => s.id === entry.shirtId) : null;
          const pant = entry ? stats.pants.find(p => p.id === entry.pantId) : null;
          const ttEntry = stats.timetable?.find(t => t.date === dateStr);
          cells.push({ day: d, dateStr, isToday: dateStr === todayStr, shirt, pant, ttEntry });
        }

        const prevMonth = () => setCalMonth(prev => prev.month === 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: prev.month - 1 });
        const nextMonth = () => setCalMonth(prev => prev.month === 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: prev.month + 1 });
        const hasTimetable = stats.timetable && stats.timetable.length > 0;

        return (
          <section className="glass-panel" style={{ padding: '1.5rem 2rem' }}>
            {/* Header with nav */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <button onClick={prevMonth} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', padding: '0.4rem', cursor: 'pointer', color: '#94a3b8', display: 'flex', transition: 'all 0.2s' }}>
                <ChevronLeft size={18} />
              </button>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={18} style={{ color: 'var(--accent)' }} /> {monthLabel}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 <button onClick={nextMonth} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', padding: '0.4rem', cursor: 'pointer', color: '#94a3b8', display: 'flex', transition: 'all 0.2s' }}>
                  <ChevronRight size={18} />
                </button>
                {hasTimetable && (
                  <>
                    <input type="file" accept=".xlsx,.xls,.csv" id="cal-update" style={{ display: 'none' }} onChange={(e) => { handleCalendarUpload(e.target.files?.[0]); e.target.value = ''; }} />
                    <label htmlFor="cal-update" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '0.5rem', padding: '0.3rem 0.6rem', cursor: 'pointer', color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', fontWeight: 600, transition: 'all 0.2s' }}>
                      <RefreshCw size={12} /> Update
                    </label>
                  </>
                )}
              </div>
            </div>

            <div style={{ width: '100%', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none' }} className="hide-scroll">
              <div style={{ minWidth: '600px' }}>
                {/* Weekday headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                  {weekdays.map(d => (
                    <div key={d} style={{
                      textAlign: 'center', fontSize: '0.75rem', fontWeight: 800,
                      color: d === 'Sun' ? '#f87171' : d === 'Sat' ? '#fbbf24' : '#64748b',
                      textTransform: 'uppercase', letterSpacing: '0.1em',
                      padding: '0.5rem 0', borderBottom: '2px solid rgba(255,255,255,0.06)',
                    }}>
                      {d}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                  {cells.map((cell, i) => {
                    if (!cell) return <div key={i} style={{ minHeight: '5rem', borderBottom: '1px solid rgba(255,255,255,0.03)', borderRight: i % 7 !== 6 ? '1px solid rgba(255,255,255,0.03)' : 'none' }} />;

                    const isHoliday = cell.ttEntry && !cell.ttEntry.isCollegeDay;
                    const raw = cell.ttEntry?.originalStatus || '';
                    const isWorkingDay = raw.startsWith('Working Day');
                    const isMon = i % 7 === 1;
                    const showWorkingDay = isWorkingDay && isMon;
                    const isGeneric = !raw || raw.startsWith('College Day') || raw === 'Sunday' || raw === 'Saturday' || raw === 'Holiday' || (isWorkingDay && !isMon);
                    const eventLabel = isGeneric ? '' : (showWorkingDay ? raw : raw.replace(/\s*-\s*Holiday$/i, ''));
                    const isSun = i % 7 === 0;
                    const isSat = i % 7 === 6;

                    return (
                      <div
                        key={i}
                        style={{
                          minHeight: '5rem',
                          padding: '0.3rem',
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          borderRight: isSat ? 'none' : '1px solid rgba(255,255,255,0.04)',
                          background: cell.isToday ? 'rgba(99,102,241,0.1)' : isHoliday ? 'rgba(239,68,68,0.04)' : 'transparent',
                          display: 'flex', flexDirection: 'column', gap: '0.2rem',
                          transition: 'background 0.2s',
                        }}
                      >
                        {/* Day number header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: '1.5rem', height: '1.5rem', borderRadius: '50%',
                            fontSize: '0.75rem', fontWeight: 700, lineHeight: 1,
                            background: cell.isToday ? '#6366f1' : 'transparent',
                            color: cell.isToday ? '#fff' : isHoliday ? '#f87171' : isSun ? '#fb923c' : isSat ? '#fbbf24' : '#cbd5e1',
                          }}>
                            {cell.day}
                          </span>
                          {cell.shirt && cell.pant && (
                            <div style={{ display: 'flex', gap: '2px' }}>
                              <img src={cell.shirt.image} alt="" style={{ width: '22px', height: '22px', borderRadius: '3px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} />
                              <img src={cell.pant.image} alt="" style={{ width: '22px', height: '22px', borderRadius: '3px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} />
                            </div>
                          )}
                        </div>

                        {/* Event badge */}
                        {eventLabel ? (
                          <div style={{
                            fontSize: '0.6rem', fontWeight: 600, lineHeight: 1.35,
                            padding: '2px 5px', borderRadius: '4px',
                            borderLeft: `2px solid ${isHoliday ? '#f87171' : isWorkingDay ? '#60a5fa' : '#34d399'}`,
                            background: isHoliday ? 'rgba(248,113,113,0.1)' : isWorkingDay ? 'rgba(96,165,250,0.08)' : 'rgba(52,211,153,0.08)',
                            color: isHoliday ? '#fca5a5' : isWorkingDay ? '#93c5fd' : '#6ee7b7',
                            wordBreak: 'break-word',
                          }}>
                            {eventLabel}
                          </div>
                        ) : isHoliday ? (
                          <div style={{
                            fontSize: '0.6rem', fontWeight: 600, padding: '2px 5px',
                            borderRadius: '4px', borderLeft: '2px solid #f87171',
                            background: 'rgba(248,113,113,0.1)', color: '#fca5a5',
                          }}>Holiday</div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        );
      })()}



      {/* All Examination Timetable */}
      {stats.examTt && stats.examTt.length > 0 && (
        <section className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0 }}>
               <Calendar size={18} style={{ color: '#ef4444' }} /> Final Exam Schedule
            </h3>
            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.6rem', borderRadius: '0.4rem' }}>
              CSD 2026
            </span>
          </div>
          
          {/* Interactive Focus Deck logic */}
          {(() => {
            const nextTargetIdx = (stats?.examTt || []).findIndex(e => {
                  const now = new Date();
                  const [y, m, d] = e.date.split('-');
                  return now < new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10), 15, 0, 0);
            });
            const computedFocusIdx = userExamIdx !== null ? userExamIdx : (nextTargetIdx === -1 && stats?.examTt?.length ? stats.examTt.length - 1 : Math.max(0, nextTargetIdx));
            
            return (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Tracker Dots */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem 0 1.5rem', gap: '0.4rem' }}>
                   {stats.examTt.map((e, idx) => {
                     const now = new Date();
                     const isFocused = idx === computedFocusIdx;
                     const [y, m, d] = e.date.split('-');
                     const examDate3PM = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10), 15, 0, 0);
                     const isPast = now >= examDate3PM;
                     return (
                         <button 
                           key={idx}
                           onClick={() => setUserExamIdx(idx)}
                           style={{ 
                             width: isFocused ? '24px' : '8px', 
                             height: '8px', 
                             borderRadius: '4px',
                             padding: 0,
                             border: 'none',
                             background: isFocused ? '#3b82f6' : isPast ? '#10b981' : 'rgba(255,255,255,0.2)',
                             transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                             cursor: 'pointer',
                             boxShadow: isFocused ? '0 0 10px rgba(59,130,246,0.4)' : 'none'
                           }}
                         />
                     );
                   })}
                </div>

                {/* Interactive Deck Card */}
                <div style={{ position: 'relative', width: '100%', minHeight: '160px' }}>
                  <AnimatePresence mode="wait">
                    {stats.examTt.length > 0 && stats.examTt[computedFocusIdx] && (() => {
                       const e = stats.examTt[computedFocusIdx];
                       const now = new Date();
                       const [y, m, d] = e.date.split('-');
                       const examDateRaw = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10), 15, 0, 0);
                       const isPast = now >= examDateRaw;
                       const isNextActive = !isPast && (computedFocusIdx === 0 || now >= new Date(parseInt(stats.examTt[computedFocusIdx-1].date.split('-')[0]), parseInt(stats.examTt[computedFocusIdx-1].date.split('-')[1])-1, parseInt(stats.examTt[computedFocusIdx-1].date.split('-')[2]), 15, 0, 0));
                       
                       // relative days calculation
                       const msPerDay = 1000 * 60 * 60 * 24;
                       const diffDays = Math.ceil((new Date(y, m-1, d).getTime() - new Date(new Date().setHours(0,0,0,0)).getTime()) / msPerDay);
                       let relativeText = "";
                       if (isPast) relativeText = "Exam Completed";
                       else if (diffDays === 0) relativeText = "Exam Today!";
                       else if (diffDays === 1) relativeText = "Exam Tomorrow";
                       else relativeText = `in ${diffDays} days`;

                       return (
                       <motion.div 
                         key={computedFocusIdx}
                         initial={{ opacity: 0, y: 15, filter: 'blur(4px)' }} 
                         animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} 
                         exit={{ opacity: 0, y: -15, filter: 'blur(4px)' }}
                         transition={{ duration: 0.3 }}
                         drag="x"
                         dragConstraints={{ left: 0, right: 0 }}
                         dragElastic={0.2}
                         onDragEnd={(e, { offset }) => {
                           if (offset.x < -40 && computedFocusIdx < stats.examTt.length - 1) {
                             setUserExamIdx(computedFocusIdx + 1);
                           } else if (offset.x > 40 && computedFocusIdx > 0) {
                             setUserExamIdx(computedFocusIdx - 1);
                           }
                         }}
                         style={{ 
                           background: isPast ? 'rgba(255,255,255,0.02)' : isNextActive ? 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.03))' : 'rgba(255,255,255,0.05)',
                           border: isPast ? '1px solid rgba(255,255,255,0.05)' : isNextActive ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(255,255,255,0.1)',
                           borderRadius: '1.25rem', padding: '1.5rem', width: '100%', boxSizing: 'border-box',
                           boxShadow: isPast || !isNextActive ? 'none' : '0 10px 30px rgba(59,130,246,0.1)',
                           backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
                           display: 'flex', flexDirection: 'column', gap: '1.25rem', cursor: 'grab'
                         }}
                       >
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                           <div>
                              <span style={{ fontSize: '0.8rem', color: isPast ? '#94a3b8' : '#93c5fd', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  {new Date(e.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
                              </span>
                              <h4 style={{ margin: '0.3rem 0 0 0', fontSize: '1.3rem', color: isPast ? '#94a3b8' : 'white', fontWeight: 800, lineHeight: 1.2 }}>
                                 {e.subject}
                              </h4>
                           </div>
                           <div style={{ 
                              width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                              background: isPast ? 'rgba(52,211,153,0.1)' : 'rgba(59,130,246,0.2)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                           }}>
                              {isPast ? <CheckCircle2 size={22} color="#34d399" /> : <Sparkles size={22} color="#60a5fa" />}
                           </div>
                         </div>

                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '0.2rem' }}>
                           <span style={{ 
                               fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', padding: '0.5rem 0.9rem', borderRadius: '0.6rem',
                               background: isNextActive ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                               color: isNextActive ? '#fff' : '#64748b', boxShadow: isNextActive ? '0 4px 10px rgba(59,130,246,0.2)' : 'none'
                             }}>
                               {isPast ? 'Done' : isNextActive ? 'Study Now' : 'Upcoming'}
                           </span>
                           <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>
                              {relativeText}
                           </span>
                         </div>
                       </motion.div>
                       );
                    })()}
                  </AnimatePresence>
                </div>
              </div>
            );
          })()}
        </section>
      )}

      {/* CGPA Architect Section */}
      {academicData && (
        <section className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#c4b5fd', display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0 }}>
               <TrendingUp size={18} style={{ color: '#8b5cf6' }} /> CGPA Architect
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={async () => {
                  if (confirm('Reset all academic data?')) {
                    const fresh = {
                      semesters: Array.from({ length: 8 }, (_, i) => ({ id: i + 1, sgpa: 0, credits: 20, isCompleted: false })),
                      targetCgpa: 8.5
                    };
                    setAcademicDataState(fresh);
                    await setAcademicData(fresh);
                  }
                }}
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.4rem', fontSize: '0.65rem', color: '#fca5a5', padding: '0.2rem 0.5rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Reset Data
              </button>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.6rem', borderRadius: '0.4rem', fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>
                {academicData.semesters.filter(s => s.isCompleted).length} OF 8 COMPLETED
              </div>
            </div>
          </div>

          <div className="responsive-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1.5rem' }}>
            
            {/* Analysis Card */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {(() => {
                const compSems = academicData.semesters.filter(s => s.isCompleted && s.sgpa > 0);
                const totalPoints = compSems.reduce((acc, s) => acc + (s.sgpa * s.credits), 0);
                const totalCredits = compSems.reduce((acc, s) => acc + s.credits, 0);
                const currentCgpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "0.00";
                
                const remainingSems = academicData.semesters.filter(s => !s.isCompleted);
                const remainingCredits = remainingSems.reduce((acc, s) => acc + s.credits, 0);
                
                const targetPointsNeeded = (academicData.targetCgpa * (totalCredits + remainingCredits)) - totalPoints;
                const rawRequiredAvg = remainingCredits > 0 ? (targetPointsNeeded / remainingCredits) : 0;
                const requiredAvgSgpa = Math.max(0, rawRequiredAvg).toFixed(2);
                const isImpossible = rawRequiredAvg > 10;

                return (
                  <>
                    <div style={{ padding: '1.25rem', borderRadius: '1rem', background: 'linear-gradient(135deg, rgba(139,92,246,0.1), transparent)', border: '1px solid rgba(139,92,246,0.3)', textAlign: 'center' }}>
                       <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Current CGPA</span>
                       <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'white', margin: '0.25rem 0' }}>{currentCgpa}</div>
                       <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden', width: '60%', margin: '0.5rem auto' }}>
                          <motion.div initial={{ width: 0 }} animate={{ width: `${(parseFloat(currentCgpa) / 10) * 100}%` }} style={{ height: '100%', background: '#8b5cf6' }} />
                       </div>
                    </div>

                    <div style={{ padding: '1.25rem', borderRadius: '1rem', background: isImpossible ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.03)', border: isImpossible ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(255,255,255,0.1)' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>Target: {Number(academicData.targetCgpa).toFixed(2)}</span>
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: isImpossible ? '#f87171' : '#34d399', textTransform: 'uppercase' }}>
                            {isImpossible ? 'Extreme Goal' : 'On Track'}
                          </span>
                       </div>
                       <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                          <span style={{ fontSize: '1.5rem', fontWeight: 800, color: isImpossible ? '#f43f5e' : 'white' }}>
                            {isImpossible ? '10.00' : requiredAvgSgpa}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: isImpossible ? '#f43f5e' : '#64748b', fontWeight: 600 }}>
                            {isImpossible ? 'max SGPA exceeded' : 'avg. SGPA needed'}
                          </span>
                       </div>
                       <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.5rem', lineHeight: 1.4 }}>
                         To reach your goal of <strong>{Number(academicData.targetCgpa).toFixed(2)}</strong>, you need to maintain at least {requiredAvgSgpa} in S6, S7, and S8.
                       </p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                       <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, whiteSpace: 'nowrap' }}>Set Target:</span>
                       <input 
                         type="range" min="0" max="10" step="0.01" 
                         value={academicData.targetCgpa} 
                         onChange={async (e) => {
                           const newVal = Math.round(Math.min(10, Math.max(0, parseFloat(e.target.value) || 0)) * 100) / 100;
                           const next = { ...academicData, targetCgpa: newVal };
                           setAcademicDataState(next);
                           await setAcademicData(next);
                         }} 
                         style={{ flex: 1, accentColor: '#8b5cf6', height: '4px' }}
                       />
                       <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: '0.4rem', overflow: 'hidden' }}>
                         <button onClick={async () => {
                            const val = Math.round(Math.max(0, academicData.targetCgpa - 0.01) * 100) / 100;
                            const next = { ...academicData, targetCgpa: val };
                            setAcademicDataState(next);
                            await setAcademicData(next);
                         }} style={{ background: 'transparent', border: 'none', borderRight: '1px solid #334155', padding: '0.2rem 0.4rem', color: '#94a3b8', cursor: 'pointer', fontWeight: 900 }}>-</button>
                         <div style={{ width: '40px', padding: '0.2rem 0', color: 'white', fontSize: '0.85rem', fontWeight: 700, textAlign: 'center' }}>
                           {Number(academicData.targetCgpa).toFixed(2)}
                         </div>
                         <button onClick={async () => {
                            const val = Math.round(Math.min(10, academicData.targetCgpa + 0.01) * 100) / 100;
                            const next = { ...academicData, targetCgpa: val };
                            setAcademicDataState(next);
                            await setAcademicData(next);
                         }} style={{ background: 'transparent', border: 'none', borderLeft: '1px solid #334155', padding: '0.2rem 0.4rem', color: '#94a3b8', cursor: 'pointer', fontWeight: 900 }}>+</button>
                       </div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Path Chart */}
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
               <div style={{ height: '180px', width: '100%', position: 'relative', background: 'rgba(255,255,255,0.02)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                  {/* SVG Chart */}
                  <svg width="100%" height="100%" viewBox="0 0 400 180" preserveAspectRatio="none">
                    {(() => {
                      const semesters = academicData.semesters;
                      const compSems = semesters.filter(s => s.isCompleted && s.sgpa > 0);
                      const totalPoints = compSems.reduce((acc, s) => acc + (s.sgpa * s.credits), 0);
                      const totalCredits = compSems.reduce((acc, s) => acc + s.credits, 0);
                      const remainingSems = semesters.filter(s => !s.isCompleted);
                      const remainingCredits = remainingSems.reduce((acc, s) => acc + s.credits, 0);
                      const targetPointsNeeded = (academicData.targetCgpa * (totalCredits + remainingCredits)) - totalPoints;
                      const reqAvgSgpa = Math.min(10, Math.max(0, remainingCredits > 0 ? (targetPointsNeeded / remainingCredits) : 0));

                      const barWidth = 24;
                      const totalWidth = 400;
                      
                      return (
                        <>
                          <defs>
                            <linearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#c084fc" stopOpacity="1" />
                              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.4" />
                            </linearGradient>
                            <linearGradient id="futureBarGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                            </linearGradient>
                            <filter id="barGlow" x="-20%" y="-20%" width="140%" height="140%">
                              <feGaussianBlur stdDeviation="4" result="blur" />
                              <feMerge>
                                <feMergeNode in="blur"/>
                                <feMergeNode in="SourceGraphic"/>
                              </feMerge>
                            </filter>
                          </defs>

                          {/* Horizontal Grid lines */}
                          {[0, 2, 4, 6, 8, 10].map(v => (
                             <g key={v}>
                               <line x1="0" y1={155 - (v/10)*135} x2="400" y2={155 - (v/10)*135} stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="4 4" />
                               <text x="5" y={155 - (v/10)*135 - 4} fill="rgba(255,255,255,0.2)" fontSize="8" fontWeight="700">{v}</text>
                             </g>
                          ))}
                          
                          {/* Holographic Bars */}
                          {semesters.map((s, i) => {
                             const cx = (i + 0.5) * (totalWidth / 8);
                             const x = cx - (barWidth / 2);
                             const isFuture = !s.isCompleted;
                             const val = isFuture ? reqAvgSgpa : s.sgpa;
                             const h = (val / 10) * 135; // max height is 135, base is 155
                             const y = 155 - h;

                             return (
                                <g key={i}>
                                   {isFuture ? (
                                      <>
                                         <motion.rect 
                                            x={x} y={y} width={barWidth} height={Math.max(0, h)} rx="4"
                                            fill="url(#futureBarGradient)" 
                                            stroke="#6366f1" strokeWidth="1.5" strokeDasharray="4 4"
                                            filter="url(#barGlow)"
                                            initial={{ height: 0, opacity: 0, y: 155 }}
                                            animate={{ height: Math.max(0, h), opacity: 1, y }}
                                            transition={{ delay: 0.5 + i * 0.1, type: "spring", stiffness: 80 }}
                                         />
                                         <motion.text x={cx} y={y - 8} fill="#818cf8" fontSize="9" fontWeight="700" textAnchor="middle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 + i * 0.1 }}>
                                            {reqAvgSgpa > 0 ? reqAvgSgpa.toFixed(2) : ''}
                                         </motion.text>
                                      </>
                                   ) : (
                                      <>
                                         <motion.rect 
                                            x={x} y={y} width={barWidth} height={Math.max(0, h)} rx="4"
                                            fill="url(#barGradient)" 
                                            filter="url(#barGlow)"
                                            initial={{ height: 0, y: 155 }}
                                            animate={{ height: Math.max(0, h), y }}
                                            transition={{ delay: i * 0.08, type: "spring", stiffness: 100 }}
                                         />
                                         {val > 0 && (
                                           <motion.text x={cx} y={y - 8} fill="white" fontSize="10" fontWeight="800" textAnchor="middle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 + i * 0.08 }}>
                                              {val.toFixed(2)}
                                           </motion.text>
                                         )}
                                      </>
                                   )}
                                   {/* Axis Label */}
                                   <text x={cx} y="175" fill={isFuture ? "#475569" : "#cbd5e1"} fontSize="10" fontWeight="800" textAnchor="middle">
                                      S{s.id}
                                   </text>
                                </g>
                             );
                          })}
                        </>
                      );
                    })()}
                  </svg>
               </div>
               
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '0.2rem', marginTop: '0.75rem' }}>
                  {academicData.semesters.map((s) => (
                    <button 
                      key={s.id}
                      onClick={() => setEditingSem(editingSem === s.id ? null : s.id)}
                      style={{ 
                        padding: '0.4rem 0.2rem', 
                        borderRadius: '0.5rem', 
                        background: editingSem === s.id ? '#8b5cf6' : s.isCompleted ? 'rgba(139,92,246,0.1)' : 'rgba(255,255,255,0.03)',
                        border: editingSem === s.id ? '1px solid #a78bfa' : s.isCompleted ? '1px solid rgba(139,92,246,0.3)' : '1px solid rgba(255,255,255,0.05)',
                        transition: 'all 0.2s',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ fontSize: '0.6rem', fontWeight: 800, color: editingSem === s.id ? 'white' : '#94a3b8', textTransform: 'uppercase' }}>S{s.id}</div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 900, color: editingSem === s.id ? 'white' : s.isCompleted ? 'white' : '#64748b' }}>{s.sgpa > 0 ? s.sgpa.toFixed(1) : '-'}</div>
                    </button>
                  ))}
               </div>

               {/* Quick Edit Popup */}
               <AnimatePresence>
                 {editingSem && (
                   <motion.div 
                     initial={{ opacity: 0, y: 10 }} 
                     animate={{ opacity: 1, y: 0 }} 
                     exit={{ opacity: 0, y: 10 }}
                     style={{ 
                       position: 'absolute', bottom: '60px', left: 0, right: 0, zIndex: 50,
                       background: '#1e293b', border: '1px solid #334155', borderRadius: '0.75rem', padding: '1rem',
                       boxShadow: '0 10px 25px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: '0.75rem'
                     }}
                   >
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'white' }}>Semester {editingSem} Details</span>
                       <button onClick={() => setEditingSem(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><Check size={18} /></button>
                     </div>
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                            <label style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, display: 'block' }}>GPA (0-10)</label>
                            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: '0.4rem', overflow: 'hidden' }}>
                              <button onClick={async () => {
                                 const val = Math.round(Math.max(0, academicData.semesters[editingSem - 1].sgpa - 0.01) * 100) / 100;
                                 const nextSems = [...academicData.semesters];
                                 nextSems[editingSem - 1] = { ...nextSems[editingSem - 1], sgpa: val, isCompleted: val > 0 };
                                 const next = { ...academicData, semesters: nextSems };
                                 setAcademicDataState(next); await setAcademicData(next);
                              }} style={{ background: 'transparent', border: 'none', borderRight: '1px solid #334155', padding: '0.1rem 0.4rem', color: '#94a3b8', cursor: 'pointer', fontWeight: 900 }}>-</button>
                              <div style={{ width: '36px', padding: '0.1rem 0', color: 'white', fontSize: '0.8rem', fontWeight: 800, textAlign: 'center' }}>
                                {Number(academicData.semesters[editingSem - 1].sgpa).toFixed(2)}
                              </div>
                              <button onClick={async () => {
                                 const val = Math.round(Math.min(10, academicData.semesters[editingSem - 1].sgpa + 0.01) * 100) / 100;
                                 const nextSems = [...academicData.semesters];
                                 nextSems[editingSem - 1] = { ...nextSems[editingSem - 1], sgpa: val, isCompleted: val > 0 };
                                 const next = { ...academicData, semesters: nextSems };
                                 setAcademicDataState(next); await setAcademicData(next);
                              }} style={{ background: 'transparent', border: 'none', borderLeft: '1px solid #334155', padding: '0.1rem 0.4rem', color: '#94a3b8', cursor: 'pointer', fontWeight: 900 }}>+</button>
                            </div>
                          </div>
                          <input 
                            type="range" step="0.01" min="0" max="10"
                            value={academicData.semesters[editingSem - 1].sgpa}
                            onChange={async (e) => {
                               const rawVal = parseFloat(e.target.value);
                               const val = Math.round((isNaN(rawVal) ? 0 : Math.min(10, Math.max(0, rawVal))) * 100) / 100;
                               const nextSems = [...academicData.semesters];
                               nextSems[editingSem - 1] = { 
                                 ...nextSems[editingSem - 1], 
                                 sgpa: val, 
                                 isCompleted: val > 0 // Automatically mark completed if value > 0
                               };
                               const next = { ...academicData, semesters: nextSems };
                               setAcademicDataState(next);
                               await setAcademicData(next);
                            }}
                            style={{ width: '100%', accentColor: '#8b5cf6', height: '4px', marginTop: '0.5rem' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>CREDITS</label>
                          <input 
                            type="number" min="0" max="40"
                            value={academicData.semesters[editingSem - 1].credits}
                            onChange={async (e) => {
                               const val = parseInt(e.target.value) || 0;
                               const nextSems = [...academicData.semesters];
                               nextSems[editingSem - 1] = { ...nextSems[editingSem - 1], credits: val };
                               const next = { ...academicData, semesters: nextSems };
                               setAcademicDataState(next);
                               await setAcademicData(next);
                            }}
                            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: '0.4rem', padding: '0.4rem', color: 'white', fontSize: '0.9rem', fontWeight: 700 }}
                          />
                        </div>
                     </div>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input 
                          type="checkbox" id="sem-comp" 
                          checked={academicData.semesters[editingSem - 1].isCompleted}
                          onChange={async (e) => {
                             const nextSems = [...academicData.semesters];
                             nextSems[editingSem - 1] = { ...nextSems[editingSem - 1], isCompleted: e.target.checked };
                             const next = { ...academicData, semesters: nextSems };
                             setAcademicDataState(next);
                             await setAcademicData(next);
                          }}
                        />
                        <label htmlFor="sem-comp" style={{ fontSize: '0.75rem', color: '#cbd5e1', fontWeight: 600 }}>Mark as Completed</label>
                     </div>
                   </motion.div>
                 )}
               </AnimatePresence>
            </div>
          </div>
        </section>
      )}

      {/* Class Timetable Upload */}
      <section className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '3rem', height: '3rem', borderRadius: '0.75rem', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {hasClassTt ? <CheckCircle2 size={24} style={{ color: '#34d399' }} /> : <ImageIcon size={24} style={{ color: '#818cf8' }} />}
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white' }}>Class Timetable</h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{hasClassTt ? 'Your timetable is active and displaying on the Dashboard.' : 'Upload an image of your weekly schedule to see daily periods.'}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {classTtSuccess && <span style={{ color: '#34d399', fontSize: '0.85rem', fontWeight: 600 }}>Successfully parsed!</span>}
          <input type="file" accept="image/*" id="class-tt-upload" style={{ display: 'none' }} onChange={(e) => handleClassTimetableUpload(e.target.files?.[0])} />
          <label htmlFor="class-tt-upload" className="btn-hero" style={{ cursor: 'pointer', padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            {classTtUploading ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={14} />}
            {classTtUploading ? 'AI Parsing...' : (hasClassTt ? 'Update Timetable' : 'Upload Image')}
          </label>
        </div>
      </section>

      {/* Middle Row: Wash Tracker + Color Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        
        {/* Wash Tracker */}
        <section className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'white', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Droplets size={16} style={{ color: '#60a5fa' }} /> Wash Tracker
          </h3>
          {stats.washingPants.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#34d399', fontWeight: 600, fontSize: '0.9rem' }}>
              ✨ All pants are clean and ready!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {stats.washingPants.map((p, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem', borderRadius: '0.75rem', background: 'rgba(96, 165, 250, 0.06)', border: '1px solid rgba(96, 165, 250, 0.15)' }}
                >
                  <img src={p.image} alt="" style={{ width: '36px', height: '36px', borderRadius: '0.5rem', objectFit: 'cover', filter: 'grayscale(0.6) brightness(0.7)', border: '1px solid rgba(255,255,255,0.1)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-baseline', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' }}>Washing...</span>
                      <span style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 700, whiteSpace: 'nowrap' }}>{p.remainingDays} day{p.remainingDays !== 1 ? 's' : ''} left</span>
                    </div>
                    <div style={{ height: '4px', borderRadius: '999px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${((2 - p.remainingDays) / 2) * 100}%` }}
                        transition={{ duration: 0.8, delay: i * 0.15 }}
                        style={{ height: '100%', borderRadius: '999px', background: 'linear-gradient(to right, #3b82f6, #60a5fa)' }}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Color Palette */}
        <section className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'white', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Eye size={16} style={{ color: '#a78bfa' }} /> Wardrobe Color Palette
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {Object.entries(stats.colorBuckets).filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1]).map(([cat, count], i) => (
              <motion.div
                key={cat}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
              >
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: colorLabels[cat].color, flexShrink: 0, boxShadow: `0 0 6px ${colorLabels[cat].color}60` }}></div>
                <span style={{ fontSize: '0.75rem', color: '#cbd5e1', fontWeight: 600, width: '55px', flexShrink: 0 }}>{colorLabels[cat].name}</span>
                <div style={{ flex: 1, height: '6px', borderRadius: '999px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(count / stats.maxColorCount) * 100}%` }}
                    transition={{ duration: 0.7, delay: i * 0.1 }}
                    style={{ height: '100%', borderRadius: '999px', background: `linear-gradient(90deg, ${colorLabels[cat].color}99, ${colorLabels[cat].color})` }}
                  />
                </div>
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, width: '20px', textAlign: 'right' }}>{count}</span>
              </motion.div>
            ))}
          </div>
        </section>
      </div>

      {/* Actionable Insights Row */}
      <div className="responsive-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        
        {/* Laundry Forecast */}
        <section className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'white', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Droplets size={16} style={{ color: '#60a5fa' }} /> Laundry Forecast
          </h3>
          {(() => {
            const cleanPants = stats.pants.filter(p => p.washStatus === 'clean');
            const pantDaysLeft = cleanPants.reduce((acc, p) => acc + Math.max(0, 3 - (p.wearCount || 0)), 0);
            const inWash = stats.pants.length - cleanPants.length;
            
            let statusColor = pantDaysLeft > 4 ? '#34d399' : pantDaysLeft > 2 ? '#fbbf24' : '#f87171';
            let statusText = pantDaysLeft > 4 ? 'Looking good!' : pantDaysLeft > 2 ? 'Plan laundry soon' : 'Critical: Do laundry now!';

            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ padding: '1.25rem', borderRadius: '1rem', background: `linear-gradient(135deg, ${statusColor}20, transparent)`, border: `1px solid ${statusColor}40`, textAlign: 'center', minWidth: '100px' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 900, color: statusColor, lineHeight: 1 }}>{pantDaysLeft}</div>
                  <div style={{ fontSize: '0.7rem', color: '#cbd5e1', fontWeight: 700, textTransform: 'uppercase', marginTop: '0.25rem' }}>Days Left</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'white', marginBottom: '0.25rem' }}>{statusText}</div>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>
                    You have <strong>{cleanPants.length}</strong> clean pants left, yielding roughly <strong>{pantDaysLeft}</strong> more outfits before you completely run out. {inWash > 0 ? `(${inWash} pants are currently in the washing pile).` : ''}
                  </p>
                </div>
              </div>
            );
          })()}
        </section>

        {/* Wardrobe Utilization */}
        <section className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'white', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={16} style={{ color: '#a78bfa' }} /> Wardrobe Utilization
          </h3>
          {(() => {
            const totalItems = stats.shirts.length + stats.pants.length;
            const wornItems = stats.shirts.filter(s => s.wearCount > 0).length + stats.pants.filter(p => (p.wearCount || 0) > 0 || p.washStatus === 'in_wash').length;
            const utilizationPct = totalItems > 0 ? Math.round((wornItems / totalItems) * 100) : 0;
            
            return (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem' }}>
                  <div>
                    <span style={{ fontSize: '2rem', fontWeight: 900, color: '#c4b5fd' }}>{utilizationPct}%</span>
                    <span style={{ fontSize: '0.85rem', color: '#94a3b8', marginLeft: '0.5rem' }}>of clothes worn</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600 }}>
                    {wornItems} / {totalItems} items
                  </div>
                </div>
                <div style={{ height: '8px', borderRadius: '999px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden', marginBottom: '0.75rem' }}>
                  <motion.div 
                    initial={{ width: 0 }} animate={{ width: `${utilizationPct}%` }} transition={{ duration: 1 }}
                    style={{ height: '100%', borderRadius: '999px', background: 'linear-gradient(90deg, #8b5cf6, #c084fc)' }}
                  />
                </div>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  {utilizationPct >= 80 ? 'Excellent rotation! You are making the most of your wardrobe.' : utilizationPct >= 50 ? 'Good variety, but you still have unworn items waiting.' : 'You have a lot of neglected clothing picking up dust in the closet.'}
                </p>
              </div>
            );
          })()}
        </section>
      </div>

      {/* Least Worn Items */}
      {stats.leastWornShirts.length > 0 && (
        <section className="glass-panel" style={{ padding: '1.5rem 2rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'white', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={16} style={{ color: '#fb923c' }} /> Hasn't Been Worn Recently
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>These shirts are overdue for an outfit. The AI will prioritize them next!</p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {stats.leastWornShirts.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', padding: '0.75rem', borderRadius: '0.75rem', background: 'rgba(251,146,60,0.05)', border: '1px solid rgba(251,146,60,0.15)', minWidth: '70px' }}
              >
                <img src={s.image} alt="" style={{ width: '48px', height: '48px', borderRadius: '0.5rem', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} />
                <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>{s.wearCount || 0}× worn</span>
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
