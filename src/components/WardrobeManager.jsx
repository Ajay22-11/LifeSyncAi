import React, { useState, useEffect, useCallback } from 'react';
import { UploadCloud, Trash2, Shirt, Scissors, Sparkles, RefreshCw } from 'lucide-react';
import { getShirts, getPants, addShirt, addPant, removeShirt, removePant, resetItemState } from '../utils/engine';
import { resizeImage } from '../utils/imageHelper';
import { motion, AnimatePresence } from 'framer-motion';

export default function WardrobeManager({ settings }) {
  const [shirts, setShirts] = useState([]);
  const [pants, setPants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [dragShirt, setDragShirt] = useState(false);
  const [dragPant, setDragPant] = useState(false);

  const loadWardrobe = async () => {
    setLoading(true);
    try {
      const s = await getShirts();
      const p = await getPants();
      setShirts(s);
      setPants(p);
    } catch(err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadWardrobe();
  }, []);

  const processImages = async (files, type) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        const base64Img = await resizeImage(file, 1080, 1080); // Higher res for clear display
        if (type === 'shirt') await addShirt(base64Img);
        else await addPant(base64Img);
      }
      await loadWardrobe();
    } catch (err) {
      console.error(err);
      alert('Failed to process one or more images');
    }
    setUploading(false);
  };

  const handleDrop = useCallback((e, type) => {
    e.preventDefault();
    if (type === 'shirt') setDragShirt(false);
    else setDragPant(false);
    
    const files = e.dataTransfer.files;
    processImages(files, type);
  }, []);

  const handleRemove = async (id, type) => {
    if (type === 'shirt') await removeShirt(id);
    else await removePant(id);
    loadWardrobe();
  };

  const handleReset = async (id, type) => {
    await resetItemState(type, id);
    loadWardrobe();
  };

  if (loading && shirts.length === 0 && pants.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
         <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 md:gap-10 w-full max-w-6xl mx-auto">
      
      {uploading && (
        <div className="fixed top-20 right-10 z-50 bg-indigo-600 font-bold px-6 py-3 rounded-full flex items-center gap-3 animate-pulse shadow-2xl">
          <UploadCloud size={24} /> Saving items securely...
        </div>
      )}

      {/* Shirts Section */}
      <section className="glass-panel p-6 md:p-8">
        <div className="flex justify-between items-center mb-6 border-b border-gray-700/50 pb-4">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <Shirt className="text-blue-400" /> <span>Shirts Dashboard</span>
          </h2>
          <span className="text-sm font-bold text-blue-300 bg-blue-500/10 border border-blue-500/20 px-4 py-1.5 rounded-full shadow-inner flex items-center gap-2">
            <Sparkles size={14} className="text-blue-400" /> {shirts.length} items
          </span>
        </div>

        <div className="clothing-grid">
          {/* Dropzone for Shirt */}
          <div 
            className={`dropzone ${dragShirt ? 'dragging' : ''} cloth-item add-zone`}
            onDragOver={(e) => { e.preventDefault(); setDragShirt(true); }}
            onDragLeave={(e) => { e.preventDefault(); setDragShirt(false); }}
            onDrop={(e) => handleDrop(e, 'shirt')}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
          >
            <input type="file" multiple accept="image/*" id="shirt-upload" style={{ display: 'none' }} onChange={(e) => processImages(e.target.files, 'shirt')} />
            <UploadCloud size={36} className="text-indigo-400 mb-2 opacity-80" />
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#d1d5db', textAlign: 'center' }}>Drop Images<br/>Here</span>
            <label htmlFor="shirt-upload" className="btn-browse">BROWSE</label>
          </div>

          <AnimatePresence>
            {shirts.map((shirt, idx) => (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                key={shirt.id} className="cloth-item group relative"
              >
                <div className="image-container">
                  <img src={shirt.image} alt="Shirt" />
                </div>
                <div className="delete-overlay">
                  <button 
                    onClick={() => handleRemove(shirt.id, 'shirt')} 
                    className="btn-delete"
                    title="Delete Shirt"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <div className="cloth-status">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', alignItems: 'center' }}>
                    {shirt.wearCount > 0 ? (
                      <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }}>Worn ({shirt.wearCount}x)</span>
                    ) : (
                      <span className="badge badge-clean">Fresh</span>
                    )}
                    {shirt.wearCount > 0 && (
                      <button onClick={() => handleReset(shirt.id, 'shirt')} style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#cbd5e1', padding: '0.2rem 0.5rem', borderRadius: '999px', cursor: 'pointer', marginTop: '0.2rem', transition: 'background 0.2s' }} onMouseOver={e=>e.currentTarget.style.background='rgba(255,255,255,0.2)'} onMouseOut={e=>e.currentTarget.style.background='rgba(255,255,255,0.1)'}>
                        Mark Unworn
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>

      {/* Pants Section */}
      <section className="glass-panel p-6 md:p-8">
        <div className="flex justify-between items-center mb-6 border-b border-gray-700/50 pb-4">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <Scissors className="text-purple-400" /> <span>Pants Dashboard</span>
          </h2>
          <span className="text-sm font-bold text-purple-300 bg-purple-500/10 border border-purple-500/20 px-4 py-1.5 rounded-full shadow-inner flex items-center gap-2">
            <Sparkles size={14} className="text-purple-400" /> {pants.length} items
          </span>
        </div>

        <div className="clothing-grid">
          {/* Dropzone for Pant */}
          <div 
            className={`dropzone ${dragPant ? 'dragging' : ''} cloth-item add-zone`}
            onDragOver={(e) => { e.preventDefault(); setDragPant(true); }}
            onDragLeave={(e) => { e.preventDefault(); setDragPant(false); }}
            onDrop={(e) => handleDrop(e, 'pant')}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
          >
            <input type="file" multiple accept="image/*" id="pant-upload" style={{ display: 'none' }} onChange={(e) => processImages(e.target.files, 'pant')} />
            <UploadCloud size={36} className="text-purple-400 mb-2 opacity-80" />
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#d1d5db', textAlign: 'center' }}>Drop Images<br/>Here</span>
            <label htmlFor="pant-upload" className="btn-browse">BROWSE</label>
          </div>

          <AnimatePresence>
            {pants.map((pant, idx) => (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                key={pant.id} className="cloth-item group relative"
              >
                <div className="image-container">
                  <img src={pant.image} alt="Pant" />
                </div>
                <div className="delete-overlay">
                  <button 
                    onClick={() => handleRemove(pant.id, 'pant')} 
                    className="btn-delete"
                    title="Delete Pant"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <div className="cloth-status">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', alignItems: 'center' }}>
                    {pant.washStatus === 'in_wash' ? (
                      <span className="badge badge-wash"><RefreshCw size={12} className="animate-spin-slow" /> Washing ({pant.daysInWash}/2 Days)</span>
                    ) : (
                      <span className="badge badge-clean">Clean & Ready</span>
                    )}
                    {(pant.wearCount > 0 || pant.washStatus === 'in_wash') && (
                      <button onClick={() => handleReset(pant.id, 'pant')} style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#cbd5e1', padding: '0.2rem 0.5rem', borderRadius: '999px', cursor: 'pointer', marginTop: '0.2rem', transition: 'background 0.2s' }} onMouseOver={e=>e.currentTarget.style.background='rgba(255,255,255,0.2)'} onMouseOut={e=>e.currentTarget.style.background='rgba(255,255,255,0.1)'}>
                        Mark Clean
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}
