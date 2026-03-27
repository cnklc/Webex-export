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
  MessageCircle
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

            <div className="p-4 bg-surface-color rounded-xl">
              <h3 className="text-sm font-semibold mb-2">How to get a Token?</h3>
              <ul className="text-xs text-text-secondary list-disc pl-4 flex flex-col gap-1">
                <li>Go to <a href="#" className="text-primary-color underline">Webex for Developers</a></li>
                <li>Create a "Bot" app and copy the Access Token.</li>
                <li>Ensure the Bot is added as a member in the spaces you want to migrate.</li>
              </ul>
            </div>
          </div>
        )}

        {step === 'select' && (
          <div className="glass-panel p-8 card flex flex-col gap-6">
            <div className="flex justify-between items-center mb-2">
               <div className="flex items-center gap-3">
                 <MessageSquare className="text-primary-color w-6 h-6" />
                 <h2 className="text-xl font-bold">Select a Space</h2>
               </div>
               <button 
                 className="p-2 hover:bg-surface-color rounded-lg text-text-secondary"
                 onClick={() => setStep('connect')}
               >
                 Change Token
               </button>
            </div>

            <div className="max-h-96 overflow-y-auto pr-2 flex flex-col gap-3 custom-scrollbar">
              {rooms.map((room) => (
                <div 
                  key={room.id}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex justify-between items-center ${selectedRoom?.id === room.id ? 'bg-primary-color/10 border-primary-color shadow-lg' : 'bg-surface-color border-transparent hover:border-border-color'}`}
                  onClick={() => setSelectedRoom(room)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-color to-accent-color flex items-center justify-center font-bold">
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
                <label className="text-xs uppercase font-bold text-text-secondary">Team Name</label>
                <input className="input-field" placeholder="Acme Logistics" />
              </div>
               <div className="flex flex-col gap-2">
                <label className="text-xs uppercase font-bold text-text-secondary">Channel Name</label>
                <input className="input-field" placeholder="Webex Import" />
              </div>
            </div>

            <div className="flex flex-col gap-3 p-4 bg-surface-color rounded-xl border border-white/5">
              <h3 className="text-sm font-semibold">Migration Options</h3>
              <div className="flex items-center justify-between">
                <div className="text-sm">Download & Re-upload Attachments</div>
                <div className="w-12 h-6 bg-primary-color rounded-full relative p-1 cursor-pointer">
                  <div className="w-4 h-4 bg-white rounded-full absolute right-1" />
                </div>
              </div>
               <div className="flex items-center justify-between">
                <div className="text-sm">Normalize Mentions (@mention)</div>
                <div className="w-12 h-6 bg-primary-color rounded-full relative p-1 cursor-pointer">
                  <div className="w-4 h-4 bg-white rounded-full absolute right-1" />
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
                onClick={() => setStep('migrate')}
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
                 <div className="absolute inset-0 rounded-full border-4 border-primary-color/20" />
                 <div className="absolute inset-0 rounded-full border-4 border-primary-color border-r-transparent animate-spin" />
                 <UploadCloud className="w-10 h-10 text-primary-color" />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold">Migrating...</h2>
                <p className="text-text-secondary mt-1">Transferring {selectedRoom?.title} history</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-sm">
                <span>Total Progress</span>
                <span className="text-primary-color font-bold">42%</span>
              </div>
              <div className="w-full h-3 bg-surface-color rounded-full overflow-hidden border border-white/5">
                <div className="h-full bg-gradient-to-r from-primary-color to-accent-color w-[42%] transition-all duration-1000" />
              </div>
            </div>

            <div className="bg-black/40 rounded-xl p-4 font-mono text-xs flex flex-col gap-2 border border-white/5 h-48 overflow-y-auto custom-scrollbar">
               <div className="text-success-color">[INFO] Starting migration process...</div>
               <div className="text-text-secondary">[INFO] Authorized with Microsoft Graph API</div>
               <div className="text-text-secondary">[INFO] Created team: Acme Logistics</div>
               <div className="text-text-secondary">[INFO] Target channel "Webex Import" locked in Migration Mode</div>
               <div className="text-text-secondary">[INFO] Fetching 1,240 messages from Webex Space...</div>
               <div className="text-white">→ Uploading batch 1/13 (100 messages)</div>
               <div className="text-white">→ Uploading batch 2/13 (100 messages)</div>
               <div className="text-primary-color">→ Normalizing attachments: file_abc.pdf</div>
               <div className="text-text-secondary">... Waiting for server response ...</div>
            </div>

            <div className="flex gap-4">
               <button className="flex-1 p-3 border border-border-color rounded-xl hover:bg-surface-color text-error-color font-semibold">
                 Abort Migration
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
