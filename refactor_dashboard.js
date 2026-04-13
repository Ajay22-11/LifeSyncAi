const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.jsx', 'utf8');

code = code.replace(/\{\/\* Main Display Area \*\/\}[\s\S]*?\{\/\* Special Event Modal \*\/\}\n\s*\{showEventModal[^\n]*\n/, 
`      {/* Today Outfit Focus */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
            <Sparkles size={20} style={{ color: '#818cf8' }} /> Today's Outfit
          </h3>
          <TodayOutfitPreview />
      </motion.section>\n`);

code = code.replace('export default function Dashboard() {',
`function TodayOutfitPreview() {
  const [outfit, setOutfit] = React.useState(null);
  React.useEffect(() => {
    (async () => {
      const history = await getHistory();
      const td = getTodayString();
      const existing = history.find(h => h.date === td);
      if (existing) setOutfit(existing);
    })();
  }, []);

  return (
    <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
      {outfit ? (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '0.5rem', overflow: 'hidden', background: '#1e293b' }}>
             <img src={outfit.shirt?.image || outfit.shirtImage} alt="Shirt" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ width: '80px', height: '80px', borderRadius: '0.5rem', overflow: 'hidden', background: '#1e293b' }}>
             <img src={outfit.pant?.image || outfit.pantImage} alt="Pant" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        </div>
      ) : (
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>No outfit selected for today.<br/>Go to the Stylist tab to generate one.</p>
      )}
    </div>
  );
}

export default function Dashboard() {`
);

fs.writeFileSync('src/components/Dashboard.jsx', code);
console.log('Dashboard refactored successfully');
