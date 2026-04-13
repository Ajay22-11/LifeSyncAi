import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Calendar as CalIcon, CheckCircle2, XCircle, FileSpreadsheet, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { getTimetable, setTimetable } from '../utils/engine';
import { motion, AnimatePresence } from 'framer-motion';

export default function TimetableUploader() {
  const [timetable, setTt] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showAll, setShowAll] = useState(false);

  useEffect(() => { loadTimetable(); }, []);

  const loadTimetable = async () => {
    setLoading(true);
    const data = await getTimetable();
    setTt(data);
    setLoading(false);
  };

  const getCellValue = (sheet, r, c) => {
    const addr = XLSX.utils.encode_cell({ r, c });
    const cell = sheet[addr];
    return cell ? cell.v : null;
  };

  const processFile = async (file) => {
    setErrorMsg('');
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setErrorMsg('Please upload a valid Excel or CSV file.');
      return;
    }

    try {
      setLoading(true);
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);

      const monthNames = ['january','february','march','april','may','june','july','august','september','october','november','december'];
      const dayAbbrevs = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
      let allEntries = [];

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet['!ref']) continue;

        const range = XLSX.utils.decode_range(sheet['!ref']);
        const totalRows = range.e.r + 1;
        const totalCols = range.e.c + 1;

        let currentMonth = -1;
        let currentYear = -1;

        for (let r = 0; r < totalRows; r++) {
          // Read ALL cells in this row
          const rowCells = [];
          for (let c = 0; c < totalCols; c++) {
            rowCells.push(getCellValue(sheet, r, c));
          }

          // Combine all non-null text from this row
          const nonNullCells = rowCells.filter(v => v !== null);
          const rowText = nonNullCells.map(v => v.toString()).join(' ');
          const rowLower = rowText.toLowerCase();

          // Check if this row has a month name (e.g. "JULY 2025", "APRIL 2026")
          let foundMonth = -1;
          for (let mi = 0; mi < monthNames.length; mi++) {
            if (rowLower.includes(monthNames[mi])) {
              foundMonth = mi;
              break;
            }
          }
          const yearMatch = rowText.match(/20\d{2}/);

          if (foundMonth >= 0 && yearMatch) {
            currentMonth = foundMonth;
            currentYear = parseInt(yearMatch[0]);
          } else if (foundMonth >= 0 && currentYear > 0) {
            currentMonth = foundMonth;
          }

          // Skip rows until we know the month
          if (currentMonth < 0 || currentYear < 0) continue;

          // Search ALL columns for day number (1-31) and day name
          let dayNum = -1;
          let dayName = '';
          let dayNumCol = -1;
          let dayNameCol = -1;

          for (let c = 0; c < totalCols; c++) {
            const val = rowCells[c];
            if (val === null) continue;

            // Check for day number
            if (dayNum < 0) {
              const num = typeof val === 'number' ? val : parseInt(val);
              if (!isNaN(num) && num >= 1 && num <= 31 && val.toString().trim() === num.toString()) {
                dayNum = num;
                dayNumCol = c;
              }
            }

            // Check for day name
            if (!dayName) {
              const str = val.toString().trim().toUpperCase();
              if (dayAbbrevs.some(d => str === d || str.startsWith(d + 'D') || str.startsWith(d + 'N') || str.startsWith(d + 'S') || str.startsWith(d + 'R'))) {
                // Full match or abbreviated match for MONDAY, TUESDAY, etc.
                dayName = str.slice(0, 3);
                dayNameCol = c;
              }
            }
          }

          // Skip if no day number found in this row
          if (dayNum < 0) continue;

          // Also skip if this is a month-header row where the "month" was already set above
          if (foundMonth >= 0) continue;

          // Build and validate date
          const mm = String(currentMonth + 1).padStart(2, '0');
          const dd = String(dayNum).padStart(2, '0');
          const fullDate = `${currentYear}-${mm}-${dd}`;
          const testDate = new Date(fullDate + 'T00:00:00');
          if (isNaN(testDate.getTime()) || testDate.getDate() !== dayNum) continue;

          // Analyze ALL remaining columns for working day number and description text
          let hasWorkingDayNum = false;
          let workingDayNum = '';
          let descTexts = [];

          for (let c = 0; c < totalCols; c++) {
            // Skip the day number and day name columns
            if (c === dayNumCol || c === dayNameCol) continue;
            
            const val = rowCells[c];
            if (val === null || val === '') continue;
            const str = val.toString().trim();
            if (str === '') continue;

            const num = typeof val === 'number' ? val : parseInt(val);

            // Working day number: a standalone number > 31 (cumulative counter like 74, 75...)
            if (!isNaN(num) && str === num.toString()) {
              if (num > 31) {
                hasWorkingDayNum = true;
                workingDayNum = num.toString();
              }
              continue;
            }

            // Description text (anything that isn't a pure number or day abbreviation)
            if (str.length > 1 && !dayAbbrevs.some(d => str.toUpperCase() === d)) {
              descTexts.push(str);
            }
          }

          const desc = descTexts.join(' ').trim();
          const descLower = desc.toLowerCase();

          // Holiday detection
          const containsHoliday = descLower.includes('holiday');
          const isSunday = dayName === 'SUN';
          const isSaturday = dayName === 'SAT';

          let isHoliday;
          if (containsHoliday) {
            isHoliday = true;
          } else if (hasWorkingDayNum) {
            isHoliday = false;
          } else if (isSunday) {
            isHoliday = true;
          } else if (isSaturday && desc === '') {
            isHoliday = true;
          } else if (desc !== '' && !descLower.includes('working day') && !descLower.includes('examination') && !descLower.includes('commencement') && !descLower.includes('subject')) {
            isHoliday = true;
          } else {
            isHoliday = false;
          }

          const isCollegeDay = !isHoliday;

          let statusText = '';
          if (desc) statusText = desc;
          else if (isCollegeDay && workingDayNum) statusText = `Working Day #${workingDayNum}`;
          else if (isSunday) statusText = 'Sunday';
          else if (isSaturday && isHoliday) statusText = 'Saturday';
          else statusText = isCollegeDay ? 'College Day' : 'Holiday';

          allEntries.push({ date: fullDate, isCollegeDay, originalStatus: statusText, dayName });
        }
      }

      if (allEntries.length === 0) {
        setErrorMsg(`Parser found 0 entries. Month detected: ${allEntries.length === 0 ? 'check console' : 'yes'}. Please check browser console (F12) for debug info.`);
      } else {
        allEntries.sort((a, b) => a.date.localeCompare(b.date));
        const uniqueMap = new Map();
        allEntries.forEach(e => uniqueMap.set(e.date, e));
        const unique = Array.from(uniqueMap.values());
        await setTimetable(unique);
        setTt(unique);
      }
    } catch (err) {
      console.error('Parse Error:', err);
      setErrorMsg('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    processFile(e.dataTransfer.files?.[0]);
  }, []);

  const n = new Date();
  const today = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  const upcoming = timetable.filter(t => t.date >= today);
  const displayDays = showAll ? upcoming : upcoming.slice(0, 30);
  const collegeDays = timetable.filter(t => t.isCollegeDay).length;
  const holidays = timetable.filter(t => !t.isCollegeDay).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '56rem', margin: '0 auto' }}>
      <section className="glass-panel" style={{ padding: '1.5rem 2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <CalIcon style={{ color: '#818cf8' }} size={28} /> Timetable & Holidays
        </h2>
        <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>Upload your college calendar Excel file. The AI will skip outfit suggestions on holidays.</p>
        <div className={`dropzone ${isDragging ? 'dragging' : ''}`} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
          <input type="file" accept=".xlsx, .xls, .csv" id="excel-upload" style={{ display: 'none' }} onChange={(e) => processFile(e.target.files?.[0])} />
          <AnimatePresence>
            {isDragging && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0, background: 'rgba(99, 102, 241, 0.15)', borderRadius: '0.75rem', pointerEvents: 'none' }} />}
          </AnimatePresence>
          <FileSpreadsheet size={48} style={{ color: '#818cf8', marginBottom: '1rem', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Drag & Drop your Excel/CSV</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', maxWidth: '22rem', marginBottom: '1.5rem', textAlign: 'center' }}>
            Supports your college calendar with month headers and date rows.
          </p>
          <label htmlFor="excel-upload" className="btn-browse" style={{ cursor: 'pointer' }}>
            <Upload size={14} style={{ display: 'inline', marginRight: '0.3rem' }} /> Browse Files
          </label>
        </div>
        {errorMsg && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(220, 38, 38, 0.1)', border: '1px solid rgba(220, 38, 38, 0.3)', borderRadius: '0.75rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', color: '#fca5a5' }}>
            <AlertCircle size={20} style={{ color: '#ef4444', flexShrink: 0, marginTop: '0.1rem' }} />
            <pre style={{ fontSize: '0.75rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>{errorMsg}</pre>
          </motion.div>
        )}
      </section>

      {timetable.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          <div className="stat-card"><div className="stat-info" style={{ textAlign: 'center', width: '100%' }}><span className="stat-value">{timetable.length}</span><span className="stat-label">Total Days</span></div></div>
          <div className="stat-card"><div className="stat-info" style={{ textAlign: 'center', width: '100%' }}><span className="stat-value" style={{ color: '#34d399' }}>{collegeDays}</span><span className="stat-label">College Days</span></div></div>
          <div className="stat-card"><div className="stat-info" style={{ textAlign: 'center', width: '100%' }}><span className="stat-value" style={{ color: '#f87171' }}>{holidays}</span><span className="stat-label">Holidays</span></div></div>
        </div>
      )}

      <section className="glass-panel" style={{ padding: '1.5rem 2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{showAll ? 'Full Schedule' : 'Upcoming Schedule'}</h3>
          <span style={{ fontSize: '0.85rem', color: '#94a3b8', background: 'rgba(0,0,0,0.3)', padding: '0.25rem 0.75rem', borderRadius: '999px' }}>{upcoming.length} upcoming</span>
        </div>
        {loading ? (
          <div style={{ padding: '3rem 0', display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', borderBottom: '2px solid #6366f1', animation: 'spin 1s linear infinite' }}></div>
          </div>
        ) : timetable.length === 0 ? (
          <div style={{ padding: '3rem 0', textAlign: 'center', color: '#64748b', background: 'rgba(0,0,0,0.15)', borderRadius: '0.75rem', fontStyle: 'italic' }}>No schedule loaded. Upload a file above.</div>
        ) : (
          <>
            <div className="calendar-grid">
              {displayDays.length > 0 ? displayDays.map((t, idx) => (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: Math.min(idx * 0.02, 0.5) }} key={idx} className={`calendar-day ${t.isCollegeDay ? 'college-day' : 'holiday-day'}`}>
                  <div className="day-date">{t.dayName ? `${t.dayName} ` : ''}{new Date(t.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                  <div className="day-status" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', marginTop: '0.5rem' }}>
                    {t.isCollegeDay ? <CheckCircle2 size={14} style={{ color: '#34d399' }} /> : <XCircle size={14} style={{ color: '#f87171' }} />}
                    <span style={{ color: t.isCollegeDay ? '#86efac' : '#fca5a5', fontSize: '0.75rem' }}>{t.isCollegeDay ? 'College' : 'Holiday'}</span>
                  </div>
                  {t.originalStatus && !t.originalStatus.startsWith('Working Day #') && !t.originalStatus.startsWith('College Day') && (
                    <div style={{ fontSize: '0.6rem', color: '#94a3b8', marginTop: '0.25rem', textAlign: 'center', lineHeight: 1.3 }}>
                      {t.originalStatus.length > 35 ? t.originalStatus.slice(0, 35) + '…' : t.originalStatus}
                    </div>
                  )}
                </motion.div>
              )) : (
                <div style={{ gridColumn: '1 / -1', padding: '1.5rem', textAlign: 'center', color: '#94a3b8' }}>No upcoming dates.</div>
              )}
            </div>
            {upcoming.length > 30 && (
              <button onClick={() => setShowAll(!showAll)} style={{ marginTop: '1rem', width: '100%', padding: '0.6rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
                {showAll ? <><ChevronUp size={16} /> Show Less</> : <><ChevronDown size={16} /> Show All {upcoming.length} Days</>}
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}
