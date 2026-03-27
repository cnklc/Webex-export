import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  ArrowRight,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Download,
  RefreshCw,
  Archive
} from 'lucide-react';
import { WebexService, type WebexRoom } from './services/webex';
import { downloadBlob } from './utils/downloadUtils';
import { createRoomZip, createBulkZip } from './utils/zipUtils';

type Step = 'connect' | 'select' | 'download';

const pageVariants = {
  initial: { opacity: 0, scale: 0.98 },
  enter: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, scale: 1.02, transition: { duration: 0.2 } }
};

function App() {
  const [step, setStep] = useState<Step>('connect');
  const [webexToken, setWebexToken] = useState('');
  const [rooms, setRooms] = useState<WebexRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<WebexRoom | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0, status: '' });

  const fetchRooms = async () => {
    if (!webexToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const roomsData = await WebexService.getRooms(webexToken);
      setRooms(roomsData);
      setStep('select');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch rooms. Check your token.');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadSelectedRoom = async () => {
    if (!selectedRoom || !webexToken) return;
    setIsLoading(true);
    setError(null);
    setStep('download');
    
    try {
      setDownloadProgress({ current: 0, total: 100, status: 'Fetching messages...' });
      const messages = await WebexService.getMessages(webexToken, selectedRoom.id);
      
      const filesToDownload: { url: string, name: string }[] = [];
      messages.forEach(msg => {
        if (msg.files) {
          msg.files.forEach((fileUrl, index) => {
            const fileName = fileUrl.split('/').pop() || `file_${msg.id}_${index}`;
            filesToDownload.push({ url: fileUrl, name: fileName });
          });
        }
      });

      const downloadedFiles: { name: string, blob: Blob }[] = [];
      for (let i = 0; i < filesToDownload.length; i++) {
        setDownloadProgress({ 
          current: Math.round(((i + 1) / filesToDownload.length) * 100), 
          total: 100, 
          status: `Downloading file ${i + 1} of ${filesToDownload.length}` 
        });
        const blob = await WebexService.downloadFile(webexToken, filesToDownload[i].url);
        downloadedFiles.push({ name: filesToDownload[i].name, blob });
      }

      setDownloadProgress({ current: 95, total: 100, status: 'Generating ZIP...' });
      const zipBlob = await createRoomZip(selectedRoom.title, messages, downloadedFiles);
      const fileName = `${selectedRoom.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.zip`;
      downloadBlob(zipBlob, fileName);
      
      setDownloadProgress({ current: 100, total: 100, status: 'Export Complete!' });
    } catch (err: any) {
      setError(err.message || 'Failed to download data');
      setStep('select');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadAll = async () => {
    if (!webexToken || rooms.length === 0) return;
    setIsLoading(true);
    setError(null);
    setStep('download');
    
    try {
      const roomsData: any[] = [];
      for (let i = 0; i < rooms.length; i++) {
        const room = rooms[i];
        setDownloadProgress({ 
          current: Math.round((i / rooms.length) * 100), 
          total: 100, 
          status: `Archiving: ${room.title}` 
        });
        
        const messages = await WebexService.getMessages(webexToken, room.id);
        const downloadedFiles: { name: string, blob: Blob }[] = [];
        
        // Attachment download for bulk can be heavy, let's just do it for now
        const roomFiles: string[] = [];
        messages.forEach(msg => msg.files?.forEach(f => roomFiles.push(f)));
        
        for (const fileUrl of roomFiles) {
          try {
            const fileName = fileUrl.split('/').pop() || `file_${Date.now()}`;
            const blob = await WebexService.downloadFile(webexToken, fileUrl);
            downloadedFiles.push({ name: fileName, blob });
          } catch (e) {
            console.error('Failed to download file in bulk:', fileUrl);
          }
        }

        roomsData.push({
          roomTitle: room.title,
          messages,
          files: downloadedFiles
        });
      }
      
      setDownloadProgress({ current: 98, total: 100, status: 'Finalizing Master ZIP...' });
      const masterZipBlob = await createBulkZip(roomsData);
      downloadBlob(masterZipBlob, 'webex_archive_full.zip');
      setDownloadProgress({ current: 100, total: 100, status: 'Bulk Archive Complete!' });
    } catch (err: any) {
      setError(err.message || 'Bulk archive failed');
      setStep('select');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center p-8 w-full min-h-screen">
      <div style={{ position: 'fixed', top: '-10%', left: '-10%', width: '40%', height: '40%', backgroundColor: 'var(--primary-glow)', borderRadius: '50%', filter: 'blur(120px)', opacity: 0.15, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-10%', right: '-10%', width: '40%', height: '40%', backgroundColor: 'var(--accent-glow)', borderRadius: '50%', filter: 'blur(120px)', opacity: 0.15, pointerEvents: 'none' }} />

      <header className="flex flex-col items-center w-full max-w-5xl mb-16 gap-8 relative z-10">
        <div className="flex items-center gap-6">
          <div className="p-4 glass-panel flex items-center justify-center bg-primary-glow" style={{ width: 'auto' }}>
            <Archive className="text-white w-10 h-10" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-white" style={{ fontSize: '2.5rem', fontWeight: 800 }}>Webex<span style={{ color: 'var(--primary-color)' }}>↓</span>Archiver</h1>
            <p className="text-text-secondary">Bundled Download Pro</p>
          </div>
        </div>

        <div className="flex glass-panel p-1 items-center justify-center gap-1" style={{ width: 'auto', borderRadius: '40px', background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--border-color)' }}>
          {['connect', 'select', 'download'].map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className="flex items-center gap-3 px-5 py-2.5 transition-all duration-300"
                style={{
                  borderRadius: '35px',
                  backgroundColor: step === s ? 'var(--primary-color)' : 'transparent',
                  boxShadow: step === s ? '0 0 20px var(--primary-glow)' : 'none',
                  color: step === s ? 'white' : 'var(--text-secondary)',
                  opacity: step === s ? 1 : 0.5,
                  transform: step === s ? 'scale(1.05)' : 'scale(1)',
                  zIndex: step === s ? 2 : 1
                }}
              >
                <span className="flex items-center justify-center font-bold" style={{ width: '24px', height: '24px', backgroundColor: step === s ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)', borderRadius: '50%', fontSize: '11px', border: step === s ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.1)' }}>{i + 1}</span>
                <span style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 800, letterSpacing: '0.05em' }}>{s}</span>
              </div>
              {i < 2 && <div className="mx-4 opacity-10" style={{ width: '20px', height: '1px', backgroundColor: 'var(--text-secondary)' }} />}
            </div>
          ))}
        </div>
      </header>

      <main className="w-full max-w-2xl flex flex-col items-center relative z-10">
        <AnimatePresence mode="wait">
          {step === 'connect' && (
            <motion.div key="connect" variants={pageVariants} initial="initial" animate="enter" exit="exit" className="glass-panel p-10 flex flex-col gap-8 w-full">
              <div className="flex items-center gap-4">
                <Shield className="text-primary-color w-8 h-8" />
                <div>
                  <h2 className="text-white" style={{ fontSize: '1.5rem', fontWeight: 700 }}>Authorize</h2>
                  <p className="text-text-secondary">Enter your Webex Personal Access Token</p>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex items-center relative">
                  <Lock className="absolute left-4 w-5 h-5 text-text-secondary" />
                  <input type="password" className="input-field" style={{ paddingLeft: '50px' }} placeholder="Webex Authenticator Token" value={webexToken} onChange={(e) => setWebexToken(e.target.value)} />
                </div>
                {error && <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error-color)', fontSize: '14px' }}><AlertCircle className="w-5 h-5" /> {error}</div>}
              </div>
              <button className="btn-primary" onClick={fetchRooms} disabled={isLoading || !webexToken}>{isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <>Fetch Spaces <ArrowRight className="w-5 h-5" /></>}</button>
            </motion.div>
          )}

          {step === 'select' && (
            <motion.div key="select" variants={pageVariants} initial="initial" animate="enter" exit="exit" className="glass-panel p-10 flex flex-col gap-6 w-full">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3"><MessageSquare className="text-primary-color w-6 h-6" /><h2 className="text-white" style={{ fontSize: '1.5rem', fontWeight: 700 }}>Select Space</h2></div>
                <div className="flex gap-2">
                  <button className="btn-primary" style={{ height: '36px', padding: '0 16px', fontSize: '12px' }} onClick={downloadAll}><Archive className="w-3 h-3" /> Archive All</button>
                  <button className="btn-secondary" style={{ color: 'var(--text-secondary)', fontSize: '12px' }} onClick={() => setStep('connect')}><RefreshCw className="w-3 h-3"/> Reset</button>
                </div>
              </div>
              <div className="flex flex-col gap-3 custom-scrollbar" style={{ maxHeight: '380px', overflowY: 'auto', paddingRight: '8px' }}>
                {rooms.map((room) => (
                  <div key={room.id} className={`room-card ${selectedRoom?.id === room.id ? 'selected' : ''}`} onClick={() => setSelectedRoom(room)}>
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', fontWeight: 800, color: 'var(--primary-color)' }}>{room.title.charAt(0)}</div>
                    <div className="flex flex-col flex-1"><span className="text-white font-bold">{room.title}</span><span className="text-text-secondary" style={{ fontSize: '11px', textTransform: 'uppercase' }}>{room.type} • {new Date(room.created).toLocaleDateString()}</span></div>
                    {selectedRoom?.id === room.id && <CheckCircle2 className="text-primary-color w-6 h-6" />}
                  </div>
                ))}
              </div>
              <button className="btn-primary" onClick={downloadSelectedRoom} disabled={!selectedRoom}>Download Bundle <Download className="w-5 h-5" /></button>
            </motion.div>
          )}

          {step === 'download' && (
            <motion.div key="download" variants={pageVariants} initial="initial" animate="enter" exit="exit" className="glass-panel p-10 flex flex-col gap-10 items-center justify-center w-full">
              <div className="flex flex-col items-center gap-6">
                <div className="flex items-center justify-center rounded-full" style={{ width: '100px', height: '100px', backgroundColor: 'rgba(79, 70, 229, 0.1)', border: '2px solid var(--primary-color)' }}><Archive className={`text-primary-color w-10 h-10 ${isLoading ? 'animate-bounce' : ''}`} /></div>
                <div className="flex flex-col items-center"><h2 className="text-white font-black" style={{ fontSize: '2.5rem' }}>{downloadProgress.current}%</h2><p className="text-text-secondary">{downloadProgress.status}</p></div>
              </div>
              <div className="flex flex-col w-full gap-2">
                <div className="flex justify-between text-xs font-bold text-text-secondary"><span>ARCHIVE PROGRESS</span><span className="text-primary-color">{downloadProgress.current}%</span></div>
                <div className="w-full h-2 rounded-full" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}><motion.div className="h-full rounded-full" style={{ background: 'var(--primary-color)' }} initial={{ width: 0 }} animate={{ width: `${downloadProgress.current}%` }} /></div>
              </div>
              <div className="flex gap-4 w-full"><button className="btn-primary flex-1" onClick={() => setStep('select')} disabled={isLoading}>{isLoading ? 'Packing...' : 'Back to Spaces'}</button></div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
