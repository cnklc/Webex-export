import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  ArrowRight, 
  MessageSquare, 
  Settings, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Lock,
  MessageCircle,
  Download,
  ChevronRight,
  Clock,
  ExternalLink
} from 'lucide-react';

type Step = 'connect' | 'select' | 'configure' | 'migrate';

interface Room {
  id: string;
  title: string;
  type: string;
  created: string;
}

const pageVariants = {
  initial: { opacity: 0, scale: 0.98 },
  enter: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, scale: 1.02, transition: { duration: 0.2 } }
};

function App() {
  const [step, setStep] = useState<Step>('connect');
  const [webexToken, setWebexToken] = useState('');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [downloadLocal, setDownloadLocal] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [migrationResults, setMigrationResults] = useState<any>(null);

  const fetchRooms = async () => {
    if (!webexToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:3001/api/webex/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: webexToken })
      });
      const data = await response.json();
      if (response.ok) {
        setRooms(data.items);
        setStep('select');
      } else {
        setError(data.message || 'Failed to fetch rooms');
      }
    } catch (err) {
      setError('Connection refused. Is the server running?');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadAll = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:3001/api/webex/download-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: webexToken })
      });
      const data = await response.json();
      if (response.ok) {
        alert('Bulk download complete! Check the server downloads folder.');
      } else {
        setError(data.message || 'Bulk download failed');
      }
    } catch (err) {
      setError('Communication error with server');
    } finally {
      setIsLoading(false);
    }
  };

  const startMigration = async () => {
    if (!selectedRoom) return;
    setIsLoading(true);
    setError(null);
    setStep('migrate');
    try {
      const response = await fetch('http://localhost:3001/api/teams/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          webexToken, 
          roomId: selectedRoom.id,
          teamsConfig: {
            tenantId: '00000000-0000-0000-0000-000000000000', 
            clientId: '00000000-0000-0000-0000-000000000000',
            clientSecret: 'SECRET'
          },
          teamId: 'TEAM_ID',
          channelName: 'Webex Import',
          options: {
            downloadLocal: downloadLocal
          }
        })
      });
      const data = await response.json();
      if (response.ok) {
        setMigrationResults(data);
      } else {
        setError(data.message || 'Migration failed');
      }
    } catch (err) {
      setError('Migration failed. Check server logs.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center p-8 w-full min-h-screen">
      {/* Background Blobs (Fixed Position) */}
      <div style={{ position: 'fixed', top: '-10%', left: '-10%', width: '40%', height: '40%', backgroundColor: 'var(--primary-glow)', borderRadius: '50%', filter: 'blur(120px)', opacity: 0.2, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-10%', right: '-10%', width: '40%', height: '40%', backgroundColor: 'var(--accent-glow)', borderRadius: '50%', filter: 'blur(120px)', opacity: 0.2, pointerEvents: 'none' }} />

      <header className="flex flex-col items-center w-full max-w-5xl mb-16 gap-8 relative z-10">
        <div className="flex items-center gap-6">
          <div className="p-4 glass-panel flex items-center justify-center bg-primary-glow" style={{ width: 'auto' }}>
            <UploadCloud className="text-white w-10 h-10" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-white" style={{ fontSize: '2.5rem', fontWeight: 800 }}>Webex<span style={{ color: 'var(--primary-color)' }}>→</span>Teams</h1>
            <p className="text-text-secondary">Migration Suite Pro v1.0</p>
          </div>
        </div>
        
        <div className="flex glass-panel p-2 items-center justify-center gap-2" style={{ width: 'auto', borderRadius: '40px' }}>
          {['connect', 'select', 'configure', 'migrate'].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
               <div 
                 className="flex items-center gap-2 px-4 py-2" 
                 style={{ 
                   borderRadius: '30px', 
                   backgroundColor: step === s ? 'var(--primary-color)' : 'transparent',
                   color: step === s ? 'white' : 'var(--text-secondary)',
                   opacity: step === s ? 1 : 0.6,
                   fontSize: '12px',
                   fontWeight: 700
                 }}
               >
                 <span className="flex items-center justify-center" style={{ width: '20px', height: '20px', border: '1px solid currentColor', borderRadius: '50%', fontSize: '10px' }}>{i + 1}</span>
                 <span style={{ textTransform: 'capitalize' }}>{s}</span>
               </div>
               {i < 3 && <ChevronRight className="w-4 h-4 text-text-secondary opacity-30" />}
            </div>
          ))}
        </div>
      </header>

      <main className="w-full max-w-2xl flex flex-col items-center relative z-10">
        <AnimatePresence mode="wait">
          {step === 'connect' && (
            <motion.div 
              key="connect" variants={pageVariants} initial="initial" animate="enter" exit="exit"
              className="glass-panel p-10 flex flex-col gap-8"
            >
              <div className="flex items-center gap-4">
                 <Shield className="text-primary-color w-8 h-8" />
                 <div>
                   <h2 className="text-white" style={{ fontSize: '1.5rem', fontWeight: 700 }}>Secure Authorization</h2>
                   <p className="text-text-secondary">Enter your Webex Bearer Token to begin</p>
                 </div>
              </div>
              
              <div className="flex flex-col gap-4">
                <div className="flex items-center relative">
                  <Lock className="absolute left-4 w-5 h-5 text-text-secondary" />
                  <input 
                    type="password" className="input-field" style={{ paddingLeft: '50px' }}
                    placeholder="Webex Bot/Auth Token"
                    value={webexToken}
                    onChange={(e) => setWebexToken(e.target.value)}
                  />
                </div>
                {error && <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error-color)', fontSize: '14px' }}>
                  <AlertCircle className="w-5 h-5" /> {error}
                </div>}
              </div>

              <button className="btn-primary" onClick={fetchRooms} disabled={isLoading || !webexToken}>
                {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <>Continue <ArrowRight className="w-5 h-5" /></>}
              </button>
            </motion.div>
          )}

          {step === 'select' && (
            <motion.div 
              key="select" variants={pageVariants} initial="initial" animate="enter" exit="exit"
              className="glass-panel p-10 flex flex-col gap-6"
            >
              <div className="flex items-center justify-between gap-4">
                 <div className="flex items-center gap-3">
                   <MessageSquare className="text-primary-color w-6 h-6" />
                   <h2 className="text-white" style={{ fontSize: '1.5rem', fontWeight: 700 }}>Select a Space</h2>
                 </div>
                 <div className="flex gap-2">
                    <button className="btn-primary" style={{ height: '36px', padding: '0 16px', fontSize: '12px' }} onClick={downloadAll}>
                      {isLoading ? <Loader2 className="animate-spin w-3 h-3"/> : <Download className="w-3 h-3"/>}
                      Export All
                    </button>
                    <button className="btn-secondary" style={{ color: 'var(--text-secondary)', fontSize: '12px', background: 'transparent', border: 'none', cursor: 'pointer' }} onClick={() => setStep('connect')}>Reset</button>
                 </div>
              </div>

              <div className="flex flex-col gap-3 custom-scrollbar" style={{ maxHeight: '380px', overflowY: 'auto', paddingRight: '8px' }}>
                {rooms.map((room) => (
                  <div 
                    key={room.id} className={`room-card ${selectedRoom?.id === room.id ? 'selected' : ''}`}
                    onClick={() => setSelectedRoom(room)}
                  >
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', fontWeight: 800, color: 'var(--primary-color)' }}>{room.title.charAt(0)}</div>
                    <div className="flex flex-col flex-1">
                      <span className="text-white font-bold">{room.title}</span>
                      <span className="text-text-secondary" style={{ fontSize: '11px', textTransform: 'uppercase' }}>{room.type} • {new Date(room.created).toLocaleDateString()}</span>
                    </div>
                    {selectedRoom?.id === room.id && <CheckCircle2 className="text-primary-color w-6 h-6" />}
                  </div>
                ))}
              </div>

              <button className="btn-primary" onClick={() => setStep('configure')} disabled={!selectedRoom}>
                Configure Selection <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}

          {step === 'configure' && (
            <motion.div 
              key="configure" variants={pageVariants} initial="initial" animate="enter" exit="exit"
              className="glass-panel p-10 flex flex-col gap-8"
            >
              <div className="flex items-center gap-4">
                 <Settings className="text-primary-color w-8 h-8" />
                 <div>
                    <h2 className="text-white" style={{ fontSize: '1.5rem', fontWeight: 700 }}>Cloud Connector</h2>
                    <p className="text-text-secondary">Set target Microsoft environment</p>
                 </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 800 }}>AZURE IDENTITY</label>
                  <input className="input-field" placeholder="Tenant ID / Application ID" />
                </div>
                <div className="flex flex-col gap-2">
                  <label style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 800 }}>TARGET DESTINATION</label>
                  <input className="input-field" placeholder="Team ID / Channel Name" />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl" style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)' }}>
                <div className="flex flex-col">
                  <span className="text-sm font-bold">Local File Buffer</span>
                  <span className="text-text-secondary" style={{ fontSize: '11px' }}>Keep sample data on server disk</span>
                </div>
                <div 
                  className="flex items-center cursor-pointer" 
                  style={{ width: '50px', height: '26px', backgroundColor: downloadLocal ? 'var(--success-color)' : 'rgba(255,255,255,0.1)', borderRadius: '20px', padding: '4px', transition: '0.3s' }}
                  onClick={() => setDownloadLocal(!downloadLocal)}
                >
                  <div style={{ width: '18px', height: '18px', backgroundColor: 'white', borderRadius: '50%', transform: downloadLocal ? 'translateX(24px)' : 'translateX(0)', transition: '0.3s' }} />
                </div>
              </div>

              <div className="flex gap-4">
                <button className="btn-primary" style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)' }} onClick={() => setStep('select')}>Back</button>
                <button className="btn-primary" onClick={startMigration}>Start Sync <ArrowRight className="w-5 h-5" /></button>
              </div>
            </motion.div>
          )}

          {step === 'migrate' && (
            <motion.div 
              key="migrate" variants={pageVariants} initial="initial" animate="enter" exit="exit"
              className="glass-panel p-10 flex flex-col gap-10 items-center justify-center"
            >
               <div className="flex flex-col items-center gap-6">
                  <div className="flex items-center justify-center rounded-full" style={{ width: '100px', height: '100px', backgroundColor: 'rgba(79, 70, 229, 0.1)', border: '2px solid var(--primary-color)' }}>
                    <UploadCloud className="text-primary-color w-10 h-10 animate-bounce" />
                  </div>
                  <div className="flex flex-col items-center">
                    <h2 className="text-white font-black" style={{ fontSize: '2rem' }}>Migrating Data</h2>
                    <p className="text-text-secondary">{selectedRoom?.title}</p>
                  </div>
               </div>

               <div className="flex flex-col w-full gap-2">
                  <div className="flex justify-between text-xs font-bold text-text-secondary">
                    <span>PROGRESS STATUS</span>
                    <span className="text-primary-color">BATCH PROCESSING</span>
                  </div>
                  <div className="w-full h-2 rounded-full" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                    <motion.div className="h-full rounded-full" style={{ background: 'var(--primary-color)', width: '60%' }} animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.5 }} />
                  </div>
               </div>

               <button className="btn-primary" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error-color)' }} onClick={() => setStep('connect')}>Terminate Session</button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="mt-20 flex gap-12 text-text-secondary" style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '2px', opacity: 0.5 }}>
         <div className="flex items-center gap-2 underline decoration-primary-color">CLOUD-MESH</div>
         <div className="flex items-center gap-2 underline decoration-accent-color">SECURE-IO</div>
         <div className="flex items-center gap-2 text-white">PORT:3001</div>
      </footer>
    </div>
  );
}

export default App;
