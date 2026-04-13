import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ShieldCheck, Activity, RefreshCw, AlertTriangle } from 'lucide-react';
import { reportSystemError } from '../utils/engine';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      phase: 'detecting', // detecting, healing, reported
      count: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  async componentDidCatch(error, errorInfo) {
    const errorCount = parseInt(sessionStorage.getItem('lifesync_error_retry') || '0');
    const newCount = errorCount + 1;
    sessionStorage.setItem('lifesync_error_retry', newCount.toString());

    this.setState({ errorInfo, count: newCount });

    // Step 1: Log the error autonomously
    await reportSystemError(error, errorInfo);

    // Step 2: Autonomous Recovery Logic
    if (newCount === 1) {
      // First attempt: Soft reload
      this.setState({ phase: 'healing' });
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } else if (newCount === 2) {
      // Second attempt: Clear session cache and reload
      this.setState({ phase: 'healing' });
      setTimeout(() => {
        localStorage.removeItem('lifesync_user_data_cache'); // Clear engine cache
        window.location.reload();
      }, 4000);
    } else {
      // Persistent failure: Report to admin and show graceful fall-back
      this.setState({ phase: 'reported' });
    }
  }

  render() {
    if (this.state.hasError) {
      const { phase, count } = this.state;

      return (
        <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem' }}>
          <div className="glass-panel" style={{ padding: '3rem', maxWidth: '500px', width: '100%', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            
            {/* Background Pulse */}
            <motion.div 
              animate={{ opacity: [0.1, 0.3, 0.1], scale: [1, 1.2, 1] }} 
              transition={{ duration: 4, repeat: Infinity }}
              style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)', zIndex: -1 }} 
            />

            <AnimatePresence mode="wait">
              {phase === 'healing' ? (
                <motion.div 
                  key="healing"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}
                >
                  <div style={{ padding: '1.5rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '50%', border: '1px solid var(--accent-glow)' }}>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                       <RefreshCw size={48} style={{ color: 'var(--accent)' }} />
                    </motion.div>
                  </div>
                  <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white', marginBottom: '0.75rem' }}>System Auto-Healing</h1>
                    <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.6 }}>
                      We detected a small hiccup in the interface.<br/>
                      <strong>Attempting to fix this for you automatically.</strong>
                    </p>
                  </div>
                  <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '999px', overflow: 'hidden' }}>
                    <motion.div 
                       initial={{ width: 0 }} 
                       animate={{ width: '100%' }} 
                       transition={{ duration: 3 }}
                       style={{ height: '100%', background: 'var(--accent)', borderRadius: '999px' }} 
                    />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Healing Cycle: {count}/2</span>
                </motion.div>
              ) : (
                <motion.div 
                  key="reported"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}
                >
                  <div style={{ padding: '1.5rem', background: 'rgba(52, 211, 153, 0.1)', borderRadius: '50%', border: '1px solid rgba(52, 211, 153, 0.2)' }}>
                    <ShieldCheck size={48} style={{ color: '#34d399' }} />
                  </div>
                  <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white', marginBottom: '0.75rem' }}>Repair Logged</h1>
                    <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.6 }}>
                      This one's taking a bit longer to heal. Our team has been <strong>automatically notified</strong> with the technical logs.
                    </p>
                  </div>
                  
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '0.75rem', padding: '1rem', width: '100%', textAlign: 'left' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <Activity size={14} style={{ color: '#64748b' }} />
                        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Admin Status</span>
                     </div>
                     <p style={{ fontSize: '0.8rem', color: '#cbd5e1', margin: 0 }}>
                        Issue reported to support desk. We recommend trying again in a few minutes.
                     </p>
                  </div>

                  <button 
                    onClick={() => {
                        sessionStorage.setItem('lifesync_error_retry', '0');
                        window.location.href = '/';
                    }} 
                    className="btn-primary" 
                    style={{ width: '100%' }}
                  >
                    Return to Dashboard
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>
      );
    }
    return this.props.children; 
  }
}


