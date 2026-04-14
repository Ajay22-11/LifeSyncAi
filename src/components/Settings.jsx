import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Cpu, Droplets, Palette, Cloud, Info, 
  X, Save, RotateCcw, Download, Trash2, 
  CheckCircle2, AlertTriangle, Zap, Shield, HelpCircle
} from 'lucide-react';
import { getSettings, setSettings, getSessionEmail } from '../utils/engine';

const categories = [
  { id: 'profile', label: 'Personalization', icon: User, color: '#6366f1' },
  { id: 'engine', label: 'Smart Engine', icon: Cpu, color: '#a78bfa' },
  { id: 'laundry', label: 'Laundry', icon: Droplets, color: '#60a5fa' },
  { id: 'data', label: 'Cloud & Data', icon: Cloud, color: '#34d399' },
  { id: 'about', label: 'About', icon: Info, color: '#94a3b8' }
];

const accentPresets = [
  { name: 'Indigo', color: '#6366f1', glow: 'rgba(99, 102, 241, 0.4)' },
  { name: 'Rose', color: '#f43f5e', glow: 'rgba(244, 63, 94, 0.4)' },
  { name: 'Emerald', color: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' },
  { name: 'Amber', color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' },
  { name: 'Sky', color: '#0ea5e9', glow: 'rgba(14, 165, 233, 0.4)' },
  { name: 'Obsidian', color: '#475569', glow: 'rgba(71, 85, 105, 0.4)' }
];

export default function Settings({ isOpen, onClose, onSave, updateInfo, onCheckForUpdates }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [settings, setLocalSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [error, setError] = useState(null);
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (isOpen) {
      const load = async () => {
        setLoading(true);
        try {
          const s = await getSettings();
          setLocalSettings(s);
          setEmail(getSessionEmail());
        } catch (err) {
          setError('Failed to load settings from cloud.');
        } finally {
          setLoading(false);
        }
      };
      load();
    }
  }, [isOpen]);

  const handleUpdate = (key, value) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await setSettings(settings);
      
      // Apply visual settings immediately to :root
      const root = document.documentElement;
      const preset = accentPresets.find(p => p.color === settings.accentColor) || accentPresets[0];
      root.style.setProperty('--accent', preset.color);
      root.style.setProperty('--accent-glow', preset.glow);
      root.style.setProperty('--glass-blur', settings.glassIntensity === 'Low' ? '8px' : settings.glassIntensity === 'High' ? '24px' : '16px');
      root.style.setProperty('--anim-speed', settings.animSpeed === 'Fast' ? '0.15s' : settings.animSpeed === 'Relaxed' ? '0.5s' : '0.3s');

      setShowSaved(true);
      if (onSave) onSave(); // Notify App to refresh global state
      setTimeout(() => setShowSaved(false), 2000);
    } catch (err) {
      console.error('Save failed:', err);
      setError('Sync failed. Please check your connection.');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const data = await getSettings(); // This now comes from the broad academic_data sync
      // Actually let's export EVERYTHING
      const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lifesync_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError('Export failed.');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }} 
          />

          {/* Modal Container */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="glass-panel"
            style={{ 
              width: '100%', maxWidth: '1000px', height: '85vh', 
              display: 'grid', gridTemplateColumns: '260px 1fr',
              overflow: 'hidden', padding: 0
            }}
          >
            {/* Sidebar */}
            <aside style={{ borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white' }}>Settings</h3>
                <p style={{ fontSize: '0.7rem', color: '#64748b' }}>Configure your experience</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveTab(cat.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.85rem 1rem', borderRadius: '0.75rem',
                      border: 'none', cursor: 'pointer',
                      background: activeTab === cat.id ? 'rgba(255,255,255,0.08)' : 'transparent',
                      color: activeTab === cat.id ? 'white' : '#94a3b8',
                      transition: 'all 0.2s', fontWeight: 600, fontSize: '0.85rem'
                    }}
                  >
                    <cat.icon size={16} style={{ color: activeTab === cat.id ? cat.color : '#64748b' }} />
                    <span style={{ flex: 1, textAlign: 'left' }}>{cat.label}</span>
                  </button>
                ))}
              </div>

              <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {error && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.75rem', borderRadius: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <AlertTriangle size={14} style={{ color: '#ef4444' }} />
                    <span style={{ fontSize: '0.65rem', color: '#fca5a5' }}>{error}</span>
                  </div>
                )}
                <button 
                  onClick={handleSave} 
                  disabled={saving || loading} 
                  className="btn-primary" 
                  style={{ width: '100%', padding: '0.85rem' }}
                >
                  {saving ? 'Syncing...' : showSaved ? <><CheckCircle2 size={16} /> Saved</> : <><Save size={16} /> Sync Changes</>}
                </button>
              </div>
            </aside>

            {/* Main Content Pane */}
            <main style={{ padding: '2.5rem', position: 'relative', overflowY: 'auto' }} className="hide-scroll">
               <button 
                 onClick={onClose}
                 style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', padding: '0.5rem', color: '#94a3b8', cursor: 'pointer' }}
               >
                 <X size={20} />
               </button>

               {loading ? (
                 <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem' }}>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}>
                      <RotateCcw size={32} style={{ color: 'var(--accent)' }} />
                    </motion.div>
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Fetching cloud profile...</p>
                 </div>
               ) : (
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                >
                    {activeTab === 'profile' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            <section>
                                <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', marginBottom: '1.5rem' }}>Personalization</h4>
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem', fontWeight: 700 }}>Display Name</label>
                                    <input 
                                        type="text" value={settings.userName} 
                                        onChange={(e) => handleUpdate('userName', e.target.value)}
                                        style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.85rem', borderRadius: '0.75rem', color: 'white', outline: 'none' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1rem', fontWeight: 700 }}>Style Persona</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                                        {['Balanced', 'Minimalist', 'Bold', 'Professional'].map(p => (
                                            <button 
                                                key={p} onClick={() => handleUpdate('stylePersona', p)}
                                                style={{ 
                                                    padding: '1rem', borderRadius: '0.75rem', border: `2px solid ${settings.stylePersona === p ? 'var(--accent)' : 'rgba(255,255,255,0.05)'}`,
                                                    background: settings.stylePersona === p ? 'rgba(99, 102, 241, 0.1)' : 'rgba(0,0,0,0.2)',
                                                    color: settings.stylePersona === p ? 'white' : '#94a3b8',
                                                    fontWeight: 700, cursor: 'pointer'
                                                }}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}

                    {activeTab === 'engine' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            <section>
                                <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', marginBottom: '1.5rem' }}>AI Smart Engine</h4>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                    <div>
                                        <p style={{ color: 'white', fontWeight: 700, margin: 0 }}>Diversity Mode</p>
                                        <p style={{ color: '#64748b', fontSize: '0.75rem', margin: 0 }}>Variety vs Aesthetic Match</p>
                                    </div>
                                    <div style={{ background: 'black', padding: '0.3rem', borderRadius: '0.75rem', display: 'flex' }}>
                                        {['Variety', 'Aesthetic'].map(m => (
                                            <button 
                                                key={m} onClick={() => handleUpdate('diversityMode', m)}
                                                style={{ padding: '0.4rem 1rem', border: 'none', background: settings.diversityMode === m ? 'rgba(255,255,255,0.1)' : 'transparent', color: settings.diversityMode === m ? 'white' : '#64748b', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem' }}
                                            >
                                                {m}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                        <span style={{ color: 'white', fontWeight: 700 }}>Repeat Buffer</span>
                                        <span style={{ color: 'var(--accent)', fontWeight: 800 }}>{settings.repeatBuffer} Days</span>
                                    </div>
                                    <input 
                                        type="range" min="0" max="14" step="1" 
                                        value={settings.repeatBuffer} 
                                        onChange={(e) => handleUpdate('repeatBuffer', parseInt(e.target.value))}
                                        className="settings-slider"
                                        style={{ width: '100%', appearance: 'none', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px' }}
                                    />
                                </div>
                            </section>
                        </div>
                    )}

                    {activeTab === 'laundry' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            <section>
                                <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', marginBottom: '1.5rem' }}>Laundry Settings</h4>
                                <div style={{ marginBottom: '2rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                        <span style={{ color: 'white', fontWeight: 700 }}>Wash Duration</span>
                                        <span style={{ color: '#60a5fa', fontWeight: 800 }}>{settings.washDuration} Days</span>
                                    </div>
                                    <input 
                                        type="range" min="1" max="7" 
                                        value={settings.washDuration} 
                                        onChange={(e) => handleUpdate('washDuration', parseInt(e.target.value))}
                                        style={{ width: '100%', appearance: 'none', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <p style={{ color: 'white', fontWeight: 700, margin: 0 }}>Holiday Logic</p>
                                        <p style={{ color: '#64748b', fontSize: '0.75rem', margin: 0 }}>Pause laundry cycle during holidays</p>
                                    </div>
                                    <button 
                                        onClick={() => handleUpdate('holidaySync', !settings.holidaySync)}
                                        style={{ 
                                            width: '50px', height: '26px', borderRadius: '13px', 
                                            background: settings.holidaySync ? 'var(--accent)' : 'rgba(255,255,255,0.05)', 
                                            position: 'relative', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
                                            transition: 'background 0.3s ease',
                                            boxShadow: settings.holidaySync ? `0 0 10px var(--accent-glow)` : 'none'
                                        }}
                                    >
                                        <motion.div 
                                          animate={{ x: settings.holidaySync ? 26 : 2 }} 
                                          style={{ 
                                            width: '20px', height: '20px', background: 'white', 
                                            borderRadius: '50%', position: 'absolute', top: 2,
                                            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                                          }} 
                                        />
                                    </button>
                                </div>
                            </section>
                        </div>
                    )}


                    {activeTab === 'data' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                             <section>
                                <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', marginBottom: '1.5rem' }}>Cloud Connectivity</h4>
                                <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '2rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                                        <div style={{ padding: '0.75rem', background: 'rgba(52, 211, 153, 0.1)', borderRadius: '50%', color: '#34d399' }}><Shield size={20} /></div>
                                        <div>
                                            <p style={{ color: 'white', fontWeight: 700, margin: 0 }}>Sync Logged In As</p>
                                            <p style={{ color: '#64748b', fontSize: '0.75rem', margin: 0 }}>{email}</p>
                                        </div>
                                    </div>
                                    <button onClick={handleExport} className="btn-secondary" style={{ width: '100%', gap: '0.5rem' }}><Download size={16} /> Export Wardrobe JSON</button>
                                </div>

                                <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '2rem' }}>
                                    <h5 style={{ color: 'white', fontWeight: 700, marginBottom: '1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <RotateCcw size={16} style={{ color: 'var(--accent)' }} /> System Updates
                                    </h5>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                                {updateInfo?.message || 'Check for new features and style engine improvements.'}
                                            </span>
                                        </div>

                                        {updateInfo?.state === 'ready' ? (
                                            <button 
                                                onClick={() => window.electronAPI.restartApp()}
                                                className="btn-primary" 
                                                style={{ width: '100%', gap: '0.5rem', background: 'linear-gradient(135deg, #10b981, #34d399)' }}
                                            >
                                                <Zap size={16} /> Install & Restart
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={onCheckForUpdates} 
                                                disabled={updateInfo?.state === 'checking' || updateInfo?.state === 'downloading'}
                                                className="btn-secondary" 
                                                style={{ width: '100%', gap: '0.5rem' }}
                                            >
                                                {updateInfo?.state === 'checking' ? 'Connecting to Cloud...' : 
                                                 updateInfo?.state === 'downloading' ? 'Downloading...' : 
                                                 <><RotateCcw size={16} /> Check for Updates</>}
                                            </button>
                                        )}
                                    </div>
                                 </div>

                                <button 
                                    style={{ width: '100%', padding: '1.25rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}
                                >
                                    <Trash2 size={24} style={{ color: '#ef4444' }} />
                                    <div style={{ textAlign: 'left' }}>
                                        <p style={{ color: '#ef4444', fontWeight: 700, margin: 0 }}>Reset Account</p>
                                        <p style={{ color: '#94a3b8', fontSize: '0.65rem', margin: 0 }}>Wipe all data from the database permanently.</p>
                                    </div>
                                </button>
                             </section>
                        </div>
                    )}

                    {activeTab === 'about' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            <section style={{ textAlign: 'center', padding: '2rem' }}>
                                <div style={{ width: '80px', height: '80px', background: 'var(--accent)', borderRadius: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 10px 30px var(--accent-glow)' }}>
                                    <Zap size={40} color="white" fill="white" />
                                </div>
                                <h4 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', marginBottom: '0.25rem' }}>LifeSync AI</h4>
                                <p style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Version 2.0-Alpha</p>
                                
                                <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6, margin: '2rem 0' }}>
                                    LifeSync is an advanced AI-driven wardrobe engine designed to personalize your style and automate your daily decisions. Developed with love for efficiency and aesthetics.
                                </p>

                                <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem' }}>
                                    <a href="#" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 700, fontSize: '0.85rem' }}>Privacy</a>
                                    <a href="#" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 700, fontSize: '0.85rem' }}>Terms</a>
                                    <a href="#" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 700, fontSize: '0.85rem' }}>Review</a>
                                </div>
                            </section>
                        </div>
                    )}
                </motion.div>
               )}
            </main>
          </motion.div>
          <style>{`
            .hide-scroll::-webkit-scrollbar { display: none; }
            input[type=range]::-webkit-slider-thumb {
                appearance: none;
                width: 18px;
                height: 18px;
                border-radius: 50%;
                background: white;
                border: 3px solid var(--accent);
                cursor: pointer;
                box-shadow: 0 0 10px rgba(0,0,0,0.3);
            }
          `}</style>
        </div>
      )}
    </AnimatePresence>
  );
}
