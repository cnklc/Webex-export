import { useState } from 'react';
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
  Download
} from 'lucide-react';

type Step = 'connect' | 'select' | 'configure' | 'migrate';

interface Room {
  id: string;
  title: string;
  type: string;
  created: string;
}

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

  return (
    <div className="min-h-screen p-8 flex flex-col items-center">
      <header className="w-full max-w-4xl mb-12 flex justify-between items-center fade-in">
        <div className="flex items-center gap-3">
          <div className="p-3 glass-panel rounded-xl bg-primary-glow">
            <UploadCloud className="text-white w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white">Webex<span className="text-primary-color">→</span>Teams</h1>
            <p className="text-text-secondary text-sm">Migration Assistant v1.0</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {['Connect', 'Select', 'Config', 'Migrate'].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${i <= ['connect', 'select', 'configure', 'migrate'].indexOf(step) ? 'bg-primary-color' : 'bg-surface-color'}`} />
              {i < 3 && <div className="w-8 h-[1px] bg-border-color" />}
            </div>
          ))}
        </div>
      </header>

      <main className="w-full max-w-2xl flex flex-col gap-8 fade-in">
        {step === 'connect' && (
          <div className="glass-panel p-8 card flex flex-col gap-6">
            <div className="flex items-center gap-3 mb-2">
               <Shield className="text-primary-color w-6 h-6" />
               <h2 className="text-xl font-bold">Connect to Webex</h2>
            </div>
            
            <p className="text-text-secondary">
              Enter your Webex Bot Token to begin. We never store your tokens; they are kept only in memory during the migration session.
            </p>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
              <input 
                type="password"
                className="input-field pl-12"
                placeholder="Webex Bot Token..."
                value={webexToken}
                onChange={(e) => setWebexToken(e.target.value)}
              />
            </div>

            {error && (
              <div className="p-4 bg-error-color/10 border border-error-color/20 rounded-xl flex gap-3 text-error-color items-center">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <button 
              className="btn-primary flex items-center justify-center gap-2"
              onClick={fetchRooms}
              disabled={isLoading || !webexToken}
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Continue <ArrowRight className="w-5 h-5" /></>}
            </button>
          </div>
        )}

        {step === 'select' && (
          <div className="glass-panel p-8 card flex flex-col gap-6">
            <div className="flex justify-between items-center mb-2">
               <div className="flex items-center gap-3">
                 <MessageSquare className="text-primary-color w-6 h-6" />
                 <h2 className="text-xl font-bold">Select a Space</h2>
               </div>
               <div className="flex gap-2">
                  <button 
                    className="p-2 px-4 bg-primary-color/10 hover:bg-primary-color/20 rounded-lg text-primary-color text-xs font-bold border border-primary-color/20 flex items-center gap-2"
                    onClick={downloadAll}
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="w-3 h-3 animate-spin"/> : <Download className="w-3 h-3"/>}
                    Download All
                  </button>
                  <button 
                    className="p-2 hover:bg-surface-color rounded-lg text-text-secondary text-xs"
                    onClick={() => setStep('connect')}
                  >
                    Change Token
                  </button>
               </div>
            </div>

            <div className="max-h-96 overflow-y-auto pr-2 flex flex-col gap-3 custom-scrollbar">
              {rooms.map((room) => (
                <div 
                  key={room.id}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex justify-between items-center ${selectedRoom?.id === room.id ? 'bg-primary-color/10 border-primary-color shadow-lg' : 'bg-surface-color border-transparent hover:border-border-color'}`}
                  onClick={() => setSelectedRoom(room)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-color to-accent-color flex items-center justify-center font-bold text-white">
                      {room.title.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{room.title}</h3>
                      <p className="text-xs text-text-secondary">{room.type === 'group' ? 'Group Space' : 'Direct Message'}</p>
                    </div>
                  </div>
                  {selectedRoom?.id === room.id && <CheckCircle2 className="text-primary-color w-6 h-6" />}
                </div>
              ))}
            </div>

            <button 
              className="btn-primary flex items-center justify-center gap-2 mt-4"
              onClick={() => setStep('configure')}
              disabled={!selectedRoom}
            >
              Configure Migration <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {step === 'configure' && (
          <div className="glass-panel p-8 card flex flex-col gap-6">
            <div className="flex items-center gap-3 mb-2">
               <Settings className="text-primary-color w-6 h-6" />
               <h2 className="text-xl font-bold">Target: Microsoft Teams</h2>
            </div>
            
            <p className="text-sm text-text-secondary">
              Configure your Microsoft Teams environment. The channel will be created if it doesn't exist, or locked for "Migration Mode".
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase font-bold text-text-secondary">Tenant ID</label>
                <input className="input-field" placeholder="00000000-0000-0000..." />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase font-bold text-text-secondary">Client ID</label>
                <input className="input-field" placeholder="00000000-0000-0000..." />
              </div>
              <div className="flex flex-col gap-2 col-span-2">
                <label className="text-xs uppercase font-bold text-text-secondary">Client Secret</label>
                <input type="password" className="input-field" placeholder="••••••••••••••••" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase font-bold text-text-secondary">Team ID</label>
                <input className="input-field" placeholder="00000000-0000-0000..." />
              </div>
               <div className="flex flex-col gap-2">
                <label className="text-xs uppercase font-bold text-text-secondary">Channel Name</label>
                <input className="input-field" placeholder="Webex Import" />
              </div>
            </div>

            <div className="flex flex-col gap-4 p-4 bg-surface-color rounded-xl border border-white/5">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Download className="w-4 h-4 text-primary-color" /> 
                Sample Data Options
              </h3>
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm">Save Attachments Locally</span>
                  <span className="text-[10px] text-text-secondary">Saves files to server's /downloads folder</span>
                </div>
                <div 
                  className={`w-12 h-6 rounded-full relative p-1 cursor-pointer transition-colors ${downloadLocal ? 'bg-success-color' : 'bg-white/10'}`}
                  onClick={() => setDownloadLocal(!downloadLocal)}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-all ${downloadLocal ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                className="flex-1 p-3 border border-border-color rounded-xl hover:bg-surface-color transition-all"
                onClick={() => setStep('select')}
              >
                Back
              </button>
              <button 
                className="flex-[2] btn-primary"
                onClick={startMigration}
              >
                Start Migration Phase
              </button>
            </div>
          </div>
        )}

        {step === 'migrate' && (
          <div className="glass-panel p-8 card flex flex-col gap-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-20 h-20 rounded-full bg-primary-color/10 flex items-center justify-center relative">
                 {!migrationResults && !error && (
                   <div className="absolute inset-0 rounded-full border-4 border-primary-color border-r-transparent animate-spin" />
                 )}
                 {migrationResults ? (
                   <CheckCircle2 className="w-10 h-10 text-success-color" />
                 ) : error ? (
                   <AlertCircle className="w-10 h-10 text-error-color" />
                 ) : (
                   <UploadCloud className="w-10 h-10 text-primary-color" />
                 )}
              </div>
              <div>
                <h2 className="text-2xl font-extrabold">
                  {migrationResults ? 'Migration Complete' : error ? 'Migration Failed' : 'Migrating...'}
                </h2>
                <p className="text-text-secondary mt-1">
                  {migrationResults ? `${migrationResults.results.length} messages transferred` : `Transferring ${selectedRoom?.title} history`}
                </p>
              </div>
            </div>

            {!migrationResults && !error && (
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-sm">
                  <span>Total Progress</span>
                  <span className="text-primary-color font-bold">In Progress</span>
                </div>
                <div className="w-full h-3 bg-surface-color rounded-full overflow-hidden border border-white/5">
                  <div className="h-full bg-gradient-to-r from-primary-color to-accent-color w-[60%] animate-pulse" />
                </div>
              </div>
            )}

            <div className="bg-black/40 rounded-xl p-4 font-mono text-xs flex flex-col gap-2 border border-white/5 h-48 overflow-y-auto custom-scrollbar">
               <div className="text-success-color">[INFO] Starting migration process...</div>
               {downloadLocal && <div className="text-primary-color">[INFO] Local download enabled: saving to /downloads/{selectedRoom?.id}</div>}
               {isLoading && <div className="text-text-secondary animate-pulse">[INFO] Processing batches ...</div>}
               {migrationResults && (
                 <>
                   <div className="text-success-color">[SUCCESS] Migration finalized.</div>
                   <div className="text-text-secondary">[INFO] Channel lock removed.</div>
                 </>
               )}
               {error && <div className="text-error-color">[ERROR] {error}</div>}
            </div>

            <div className="flex gap-4">
               <button 
                 className="flex-1 p-3 border border-border-color rounded-xl hover:bg-surface-color font-semibold"
                 onClick={() => {
                   setStep('connect');
                   setMigrationResults(null);
                   setError(null);
                 }}
               >
                 {migrationResults || error ? 'Start New Migration' : 'Abort Migration'}
               </button>
            </div>
          </div>
        )}
      </main>
      
      <footer className="mt-12 text-text-secondary text-xs flex gap-6 fade-in">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4" /> Secure Token Handling
        </div>
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4" /> Migration API Optimized
        </div>
        <div className="flex items-center gap-2 text-primary-color font-bold">
          {new Date().toLocaleTimeString()} • Live Node
        </div>
      </footer>
    </div>
  );
}

export default App;
