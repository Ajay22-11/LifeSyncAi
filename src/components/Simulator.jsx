import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, SkipForward, RotateCcw, CalendarDays, Shirt, Scissors, Droplets, CheckCircle2, AlertCircle } from 'lucide-react';
import { getShirts, getPants, getHistory, setHistory } from '../utils/engine';
import { getDominantColor, classifyColor, calculateMatchScore } from '../utils/colorMatcher';

export default function Simulator() {
  const [simResults, setSimResults] = useState([]);
  const [running, setRunning] = useState(false);
  const [totalDays, setTotalDays] = useState(14);
  const [shirtsSnap, setShirtsSnap] = useState([]);
  const [pantsSnap, setPantsSnap] = useState([]);

  useEffect(() => {
    loadSnap();
  }, []);

  const loadSnap = async () => {
    const s = await getShirts();
    const p = await getPants();
    setShirtsSnap(s);
    setPantsSnap(p);
  };

  const runSimulation = async () => {
    setRunning(true);
    setSimResults([]);

    const shirts = await getShirts();
    const pants = await getPants();

    if (shirts.length === 0 || pants.length === 0) {
      setSimResults([{ day: 1, error: 'Add at least 1 shirt and 1 pant first.' }]);
      setRunning(false);
      return;
    }

    // Work with deep-copied local state (no writes to DB)
    let simShirts = shirts.map(s => ({ ...s, wearCount: 0, lastWorn: null }));
    let simPants = pants.map(p => ({ ...p, wearCount: 0, washStatus: 'clean', daysInWash: 0, lastWorn: null }));

    const results = [];
    const today = new Date();

    for (let d = 0; d < totalDays; d++) {
      const simDate = new Date(today);
      simDate.setDate(today.getDate() + d);
      const dateStr = `${simDate.getFullYear()}-${String(simDate.getMonth() + 1).padStart(2, '0')}-${String(simDate.getDate()).padStart(2, '0')}`;
      const dayName = simDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

      // Progress washing pants
      simPants = simPants.map(p => {
        if (p.washStatus === 'in_wash') {
          const newDays = (p.daysInWash || 0) + 1;
          if (newDays >= 2) {
            return { ...p, washStatus: 'clean', daysInWash: 0, wearCount: 0 };
          }
          return { ...p, daysInWash: newDays };
        }
        return p;
      });

      // Reset shirt cycle if all worn
      const allWorn = simShirts.every(s => s.wearCount > 0);
      if (allWorn) {
        simShirts = simShirts.map(s => ({ ...s, wearCount: 0 }));
      }

      let availableShirts = simShirts.filter(s => s.wearCount === 0);
      if (availableShirts.length === 0) availableShirts = simShirts;

      let availablePants = simPants.filter(p => p.washStatus === 'clean' && p.wearCount < 1);

      if (availablePants.length === 0) {
        results.push({ day: d + 1, date: dayName, error: 'All pants under washing!', pantsStatus: simPants.map(p => ({ id: p.id, status: p.washStatus, daysInWash: p.daysInWash })) });
        // Add result with delay for animation
        setSimResults([...results]);
        await new Promise(r => setTimeout(r, 150));
        continue;
      }

      // AI Color matching
      let bestScore = -1;
      let bestCombos = [];

      for (const s of availableShirts) {
        const sColor = await getDominantColor(s.image);
        const sCat = classifyColor(sColor);
        for (const p of availablePants) {
          const pColor = await getDominantColor(p.image);
          const pCat = classifyColor(pColor);
          const score = calculateMatchScore(sCat, pCat);
          if (score > bestScore) {
            bestScore = score;
            bestCombos = [{ shirt: s, pant: p, score }];
          } else if (score === bestScore) {
            bestCombos.push({ shirt: s, pant: p, score });
          }
        }
      }

      bestCombos.sort((a, b) => {
        const aT = (a.shirt.lastWorn ? new Date(a.shirt.lastWorn).getTime() : 0) + (a.pant.lastWorn ? new Date(a.pant.lastWorn).getTime() : 0);
        const bT = (b.shirt.lastWorn ? new Date(b.shirt.lastWorn).getTime() : 0) + (b.pant.lastWorn ? new Date(b.pant.lastWorn).getTime() : 0);
        return aT - bT;
      });

      const chosen = bestCombos[0];

      // Update local state
      simShirts = simShirts.map(s => {
        if (s.id === chosen.shirt.id) return { ...s, wearCount: s.wearCount + 1, lastWorn: dateStr };
        return s;
      });
      simPants = simPants.map(p => {
        if (p.id === chosen.pant.id) return { ...p, wearCount: 1, washStatus: 'in_wash', daysInWash: 0, lastWorn: dateStr };
        return p;
      });

      const shirtIdx = shirts.findIndex(s => s.id === chosen.shirt.id) + 1;
      const pantIdx = pants.findIndex(p => p.id === chosen.pant.id) + 1;

      results.push({
        day: d + 1,
        date: dayName,
        shirtImage: chosen.shirt.image,
        pantImage: chosen.pant.image,
        shirtLabel: `Shirt #${shirtIdx}`,
        pantLabel: `Pant #${pantIdx}`,
        score: chosen.score,
        pantsStatus: simPants.map(p => ({ id: p.id, status: p.washStatus, daysInWash: p.daysInWash }))
      });

      setSimResults([...results]);
      await new Promise(r => setTimeout(r, 150));
    }

    setRunning(false);
  };

  const reset = () => {
    setSimResults([]);
  };

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto">
      
      {/* Controls */}
      <section className="glass-panel p-6 md:p-8">
        <h2 className="text-2xl font-bold flex items-center gap-3 mb-2">
          <CalendarDays className="text-amber-400" size={28} /> Multi-Day Simulator
        </h2>
        <p className="text-gray-400 mb-6">Simulate the AI outfit engine across multiple consecutive days to verify shirt rotation & pant washing cycles.</p>

        <div className="flex flex-wrap items-end gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">Days to Simulate</label>
            <div className="toggle-group">
              {[7, 14, 21, 30].map(n => (
                <button key={n} onClick={() => setTotalDays(n)} className={`toggle-btn ${totalDays === n ? 'active' : ''}`}>{n}</button>
              ))}
            </div>
          </div>

          <button onClick={runSimulation} disabled={running} className="btn-primary px-8 py-3">
            {running ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Simulating...</> : <><Play size={18} /> Run Simulation</>}
          </button>

          {simResults.length > 0 && !running && (
            <button onClick={reset} className="btn-secondary px-6 py-3">
              <RotateCcw size={16} /> Clear
            </button>
          )}
        </div>

        <div className="mt-6 flex gap-4 text-sm">
          <span className="text-gray-500">Wardrobe: <strong className="text-white">{shirtsSnap.length}</strong> shirts, <strong className="text-white">{pantsSnap.length}</strong> pants</span>
        </div>
      </section>

      {/* Results Table */}
      {simResults.length > 0 && (
        <section className="glass-panel p-6 md:p-8 overflow-x-auto">
          <h3 className="text-xl font-bold mb-6">Simulation Results</h3>
          <div className="flex flex-col gap-3">
            {/* Header */}
            <div className="grid grid-cols-[60px_130px_1fr_1fr_80px] gap-4 text-xs font-bold text-gray-400 uppercase tracking-wider pb-2 border-b border-white/10">
              <span>Day</span>
              <span>Date</span>
              <span>Shirt</span>
              <span>Pant</span>
              <span>Score</span>
            </div>

            <AnimatePresence>
              {simResults.map((r, idx) => (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  key={idx}
                  className={`grid grid-cols-[60px_130px_1fr_1fr_80px] gap-4 items-center py-3 rounded-xl px-3 ${r.error ? 'bg-rose-900/10 border border-rose-500/20' : 'bg-white/[0.02] hover:bg-white/[0.05]'} transition-colors`}
                >
                  <span className="text-lg font-extrabold text-white">{r.day}</span>
                  <span className="text-sm text-gray-300 font-medium">{r.date}</span>

                  {r.error ? (
                    <span className="col-span-2 text-rose-300 flex items-center gap-2 text-sm">
                      <AlertCircle size={16} /> {r.error}
                    </span>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <img src={r.shirtImage} className="w-10 h-10 rounded-lg object-cover border border-white/10 shadow" alt="" />
                        <span className="text-sm font-medium text-blue-300">{r.shirtLabel}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <img src={r.pantImage} className="w-10 h-10 rounded-lg object-cover border border-white/10 shadow" alt="" />
                        <span className="text-sm font-medium text-purple-300">{r.pantLabel}</span>
                      </div>
                    </>
                  )}

                  {!r.error && (
                    <span className={`text-sm font-extrabold ${r.score >= 9 ? 'text-emerald-400' : r.score >= 7 ? 'text-blue-400' : r.score >= 5 ? 'text-amber-400' : 'text-rose-400'}`}>
                      {r.score}/10
                    </span>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Summary */}
          {!running && simResults.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 p-4 bg-black/30 rounded-xl border border-white/10">
              <h4 className="font-bold mb-3 text-gray-200">Simulation Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-extrabold text-white">{simResults.filter(r => !r.error).length}</div>
                  <div className="text-xs text-gray-400 uppercase">Outfits Generated</div>
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-rose-400">{simResults.filter(r => r.error).length}</div>
                  <div className="text-xs text-gray-400 uppercase">Skipped (Washing)</div>
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-emerald-400">
                    {simResults.filter(r => !r.error).length > 0
                      ? (simResults.filter(r => !r.error).reduce((s, r) => s + r.score, 0) / simResults.filter(r => !r.error).length).toFixed(1)
                      : '—'}
                  </div>
                  <div className="text-xs text-gray-400 uppercase">Avg AI Score</div>
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-indigo-400">
                    {new Set(simResults.filter(r => !r.error).map(r => r.shirtLabel)).size}
                  </div>
                  <div className="text-xs text-gray-400 uppercase">Unique Shirts Used</div>
                </div>
              </div>
            </motion.div>
          )}
        </section>
      )}
    </div>
  );
}
