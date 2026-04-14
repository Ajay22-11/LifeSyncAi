import React, { useState, useEffect } from 'react';
import { Shirt, Sparkles, BarChart3, Cloud, LogOut, Info, Settings as SettingsIcon, DownloadCloud } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Stylist from './components/Stylist';
import WardrobeManager from './components/WardrobeManager';
import Insights from './components/Insights';
import SettingsModal from './components/Settings';
import { getSessionEmail, setSessionEmail, getSettings } from './utils/engine';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import './index.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userEmail, setUserEmail] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [inputEmail, setInputEmail] = useState('');
  const [settings, setSettings] = useState(null);
  const [updateInfo, setUpdateInfo] = useState({ state: 'idle', message: '' });

  const refreshSettings = async () => {
    const s = await getSettings();
    setSettings(s);
    applyTheme(s);
  };

  const applyTheme = (s) => {
    const root = document.documentElement;
    const presets = [
      { color: '#6366f1', glow: 'rgba(99, 102, 241, 0.4)' },
      { color: '#f43f5e', glow: 'rgba(244, 63, 94, 0.4)' },
      { color: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' },
      { color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' },
      { color: '#0ea5e9', glow: 'rgba(14, 165, 233, 0.4)' },
      { color: '#475569', glow: 'rgba(71, 85, 105, 0.4)' }
    ];
    const preset = presets.find(p => p.color === s.accentColor) || presets[0];
    root.style.setProperty('--accent', preset.color);
    root.style.setProperty('--accent-glow', preset.glow);
    root.style.setProperty('--glass-blur', s.glassIntensity === 'Low' ? '8px' : s.glassIntensity === 'High' ? '24px' : '16px');
    root.style.setProperty('--anim-speed', s.animSpeed === 'Fast' ? '0.15s' : s.animSpeed === 'Relaxed' ? '0.5s' : '0.3s');
  };

  useEffect(() => {
    const email = getSessionEmail();
    if (email) setUserEmail(email);
    refreshSettings();

    // -- CLOUD AUTO-UPDATE SYNC (Mobile + Desktop) --
    const initUpdates = async () => {
      // 1. Mobile OTA (Capgo)
      try {
        const result = await CapacitorUpdater.sync();
        if (result && result.version) {
          setUpdateInfo({ state: 'available', message: `Update v${result.version} applied. Restart to see changes.` });
        }
      } catch (e) {
        console.warn('OTA Sync not available on web/desktop');
      }

      // 2. Desktop (Electron)
      if (window.electronAPI) {
        window.electronAPI.onUpdateAvailable(() => {
          setUpdateInfo({ state: 'downloading', message: 'Downloading new style engine update...' });
        });
        window.electronAPI.onUpdateDownloaded(() => {
          setUpdateInfo({ state: 'ready', message: 'Cloud update ready. Restart app to finish setup.' });
        });
        window.electronAPI.onUpdateNotAvailable(() => {
          setUpdateInfo({ state: 'up-to-date', message: 'LifeSync AI is up to date.' });
          setTimeout(() => setUpdateInfo({ state: 'idle', message: '' }), 3000);
        });
        window.electronAPI.onUpdateError((msg) => {
          setUpdateInfo({ state: 'error', message: `Update Error: ${msg}` });
          setTimeout(() => setUpdateInfo({ state: 'idle', message: '' }), 5000);
        });
      }
    };
    initUpdates();
  }, []);

  const handleManualCheckForUpdates = async () => {
    setUpdateInfo({ state: 'checking', message: 'Checking cloud for updates...' });
    
    // Desktop Check
    if (window.electronAPI) {
      await window.electronAPI.checkForUpdates();
    } 
    
    // Mobile Check
    try {
      const result = await CapacitorUpdater.sync();
      if (result && result.version) {
        setUpdateInfo({ state: 'available', message: `Update v${result.version} downloaded.` });
      } else {
        setUpdateInfo({ state: 'up-to-date', message: 'All mobile assets are current.' });
        setTimeout(() => setUpdateInfo({ state: 'idle', message: '' }), 3000);
      }
    } catch (e) {
      if (!window.electronAPI) {
        setUpdateInfo({ state: 'error', message: 'Update check failed.' });
      }
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (!inputEmail.includes('@')) return alert('Please enter a valid email');
    setSessionEmail(inputEmail);
    setUserEmail(inputEmail);
  };

  const handleLogout = () => {
    localStorage.removeItem('lifesync_user_email');
    setUserEmail(null);
  };

  if (!userEmail) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="glass-panel" style={{ padding: '3rem', maxWidth: '400px', width: '90%', textAlign: 'center' }}>
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ width: '5rem', height: '5rem', background: 'rgba(96, 165, 250, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <Cloud size={40} style={{ color: '#60a5fa' }} />
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white', marginBottom: '0.5rem' }}>Cloud Sync</h1>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Enter your email to sync your wardrobe and data across your laptop and mobile.</p>
          </div>
          
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input 
              type="email" 
              placeholder="Enter your email" 
              value={inputEmail}
              onChange={(e) => setInputEmail(e.target.value)}
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '0.75rem',
                padding: '0.8rem 1rem',
                color: 'white',
                fontSize: '1rem',
                outline: 'none'
              }}
              required
            />
            <button type="submit" className="btn-hero" style={{ width: '100%', padding: '0.8rem' }}>
              Start Syncing
            </button>
          </form>
          <p style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: '#64748b' }}>
            Data is saved securely to your private Supabase cloud.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Cloud Update Notification Toast */}
      {updateInfo.state !== 'idle' && (
        <div 
          className="glass-panel" 
          style={{ 
            position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)', 
            zIndex: 9999, padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem',
            border: '1px solid var(--accent)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            animation: 'slideUp 0.3s ease-out'
          }}
        >
          <div style={{ background: 'var(--accent)', padding: '0.4rem', borderRadius: '50%', display: 'flex' }}>
            <DownloadCloud size={16} color="white" />
          </div>
          <span style={{ color: 'white', fontWeight: 600, fontSize: '0.85rem' }}>{updateInfo.message}</span>
          {updateInfo.state === 'ready' && (
            <button 
              onClick={() => window.electronAPI.restartApp()}
              style={{ padding: '0.25rem 0.75rem', borderRadius: '0.5rem', background: 'white', color: 'black', border: 'none', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}
            >
              Restart Now
            </button>
          )}
          <button onClick={() => setUpdateInfo({ state: 'idle' })} style={{ color: '#94a3b8', background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
        </div>
      )}

      <header className="app-header glass-panel" style={{ 
        padding: '0.75rem 1.5rem', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        flexDirection: 'row',
        height: '72px',
        position: 'sticky',
        top: 0,
        zIndex: 1000
      }}>
        {/* Left: Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.5rem', background: 'var(--accent-glow)', borderRadius: '0.5rem', color: 'var(--accent)' }}>
            <Sparkles size={20} />
          </div>
          <h1 className="app-title" style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, background: 'linear-gradient(to right, white, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', whiteSpace: 'nowrap' }}>LifeSync <span className="mobile-hide">AI v1.0.1 ☁️</span></h1>
        </div>

        {/* Center: Navigation */}
        <nav className="nav-links desktop-nav" style={{ 
           width: 'auto', 
           background: 'rgba(0,0,0,0.2)', 
           padding: '0.25rem', 
           borderRadius: '0.75rem',
           display: 'flex',
           gap: '0.25rem'
        }}>
          <button onClick={() => setActiveTab('dashboard')} className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`} style={{ padding: '0.5rem 1rem' }}>
             <Cloud size={16} /> <span>Home</span>
          </button>
          <button onClick={() => setActiveTab('stylist')} className={`nav-btn ${activeTab === 'stylist' ? 'active' : ''}`} style={{ padding: '0.5rem 1rem' }}>
             <Sparkles size={16} /> <span className="mobile-hide">Stylist</span>
          </button>
          <button onClick={() => setActiveTab('wardrobe')} className={`nav-btn ${activeTab === 'wardrobe' ? 'active' : ''}`} style={{ padding: '0.5rem 1rem' }}>
             <Shirt size={16} /> <span className="mobile-hide">Wardrobe</span>
          </button>
          <button onClick={() => setActiveTab('insights')} className={`nav-btn ${activeTab === 'insights' ? 'active' : ''}`} style={{ padding: '0.5rem 1rem' }}>
             <BarChart3 size={16} /> <span className="mobile-hide">Insights</span>
          </button>
        </nav>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="mobile-hide" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingRight: '0.5rem', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
             <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399', boxShadow: '0 0 10px #34d399', animation: 'pulse 2s infinite' }} />
             <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 800 }}>Synced</span>
          </div>

          <button 
            onClick={() => setIsSettingsOpen(true)}
            style={{ 
              width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s'
            }}
            className="header-action-btn"
          >
            <SettingsIcon size={18} />
          </button>

          <button 
            onClick={handleLogout}
            style={{ 
              height: '38px', padding: '0 1rem', borderRadius: '0.75rem', background: 'rgba(239, 68, 68, 0.05)',
              border: '1px solid rgba(239, 68, 68, 0.1)', color: '#f87171', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.75rem', transition: '0.2s'
            }}
            className="header-action-btn"
          >
            <LogOut size={16} /> <span className="mobile-hide">Logout</span>
          </button>
        </div>
      </header>

      {/* Mobile navigation */}
      <nav className="nav-links mobile-nav">
        <button onClick={() => setActiveTab('dashboard')} className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}>
          <Cloud size={18} /> <span>Home</span>
        </button>
        <button onClick={() => setActiveTab('stylist')} className={`nav-btn ${activeTab === 'stylist' ? 'active' : ''}`}>
          <Sparkles size={18} /> <span>Stylist</span>
        </button>
        <button onClick={() => setActiveTab('wardrobe')} className={`nav-btn ${activeTab === 'wardrobe' ? 'active' : ''}`}>
          <Shirt size={18} /> <span>Wardrobe</span>
        </button>
        <button onClick={() => setActiveTab('insights')} className={`nav-btn ${activeTab === 'insights' ? 'active' : ''}`}>
          <BarChart3 size={18} /> <span>Insights</span>
        </button>
      </nav>

      <main style={{ flex: 1, minHeight: '60vh' }}>
        {activeTab === 'dashboard' && <Dashboard settings={settings} />}
        {activeTab === 'stylist' && <Stylist settings={settings} />}
        {activeTab === 'wardrobe' && <WardrobeManager settings={settings} />}
        {activeTab === 'insights' && <Insights settings={settings} />}

        <SettingsModal 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
          onSave={refreshSettings}
          updateInfo={updateInfo}
          onCheckForUpdates={handleManualCheckForUpdates}
        />
      </main>
    </div>
  );
}
