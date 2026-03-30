import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WebexService, type WebexRoom } from './services/webex';
import { downloadBlob } from './utils/downloadUtils';
import { createRoomZip, createBulkZip } from './utils/zipUtils';
import { MessageViewer } from './components/MessageViewer';
import {
  Archive as ArchiveIcon,
  Search,
  FileJson,
  Shield,
  ArrowRight,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Download,
  RefreshCw,
  Archive,
  Info,
  ExternalLink,
  User,
  Copy,
  ClipboardPaste,
  ChevronLeft,
  Home
} from 'lucide-react';

type Step = 'connect' | 'select' | 'download' | 'guide' | 'viewer';

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
  const [importedMessages, setImportedMessages] = useState<any[]>([]);
  const [archiveTitle, setArchiveTitle] = useState('');
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem('webex_user_email') || '');

  // Persist email to localStorage
  const handleEmailChange = (email: string) => {
    setUserEmail(email);
    localStorage.setItem('webex_user_email', email);
  };

  const fetchRooms = async () => {
    if (!webexToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const roomsData = await WebexService.getRooms(webexToken);
      setRooms(roomsData);
      setStep('select');
    } catch (err: any) {
      setError(err.message || 'Alanlar alınamadı. Token\'ınızı kontrol edin.');
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
      setDownloadProgress({ current: 0, total: 100, status: 'Mesajlar getiriliyor...' });
      const messages = await WebexService.getMessages(webexToken, selectedRoom.id);

      const filesToDownload: { url: string, name: string }[] = [];
      messages.forEach(msg => {
        if (msg.files) {
          msg.files.forEach((fileUrl, index) => {
            const fileName = fileUrl.split('/').pop() || `dosya_${msg.id}_${index}`;
            filesToDownload.push({ url: fileUrl, name: fileName });
          });
        }
      });

      const downloadedFiles: { name: string, blob: Blob }[] = [];
      for (let i = 0; i < filesToDownload.length; i++) {
        setDownloadProgress({
          current: Math.round(((i + 1) / filesToDownload.length) * 100),
          total: 100,
          status: `Dosya indiriliyor: ${i + 1} / ${filesToDownload.length}`
        });
        const blob = await WebexService.downloadFile(webexToken, filesToDownload[i].url);
        downloadedFiles.push({ name: filesToDownload[i].name, blob });
      }

      setDownloadProgress({ current: 95, total: 100, status: 'ZIP oluşturuluyor...' });
      const zipBlob = await createRoomZip(selectedRoom.title, messages, downloadedFiles);
      const fileName = `${selectedRoom.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.zip`;
      downloadBlob(zipBlob, fileName);

      setDownloadProgress({ current: 100, total: 100, status: 'Dışa Aktarma Tamamlandı!' });
    } catch (err: any) {
      setError(err.message || 'Veriler indirilemedi');
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
          status: `Arşivleniyor: ${room.title}`
        });

        const messages = await WebexService.getMessages(webexToken, room.id);
        const downloadedFiles: { name: string, blob: Blob }[] = [];

        // Attachment download for bulk can be heavy, let's just do it for now
        const roomFiles: string[] = [];
        messages.forEach(msg => msg.files?.forEach(f => roomFiles.push(f)));

        for (const fileUrl of roomFiles) {
          try {
            const fileName = fileUrl.split('/').pop() || `dosya_${Date.now()}`;
            const blob = await WebexService.downloadFile(webexToken, fileUrl);
            downloadedFiles.push({ name: fileName, blob });
          } catch (e) {
            console.error('Toplu indirmede dosya hatası:', fileUrl);
          }
        }

        roomsData.push({
          roomTitle: room.title,
          messages,
          files: downloadedFiles
        });
      }

      setDownloadProgress({ current: 98, total: 100, status: 'Ana ZIP dosyası hazırlanıyor...' });
      const masterZipBlob = await createBulkZip(roomsData);
      downloadBlob(masterZipBlob, 'webex_arşivi_tam.zip');
      setDownloadProgress({ current: 100, total: 100, status: 'Toplu Arşivleme Tamamlandı!' });
    } catch (err: any) {
      setError(err.message || 'Toplu arşivleme başarısız oldu');
      setStep('select');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          setImportedMessages(json);
          setArchiveTitle(file.name.replace('.json', ''));
          setStep('viewer');
          setError(null);
        } else {
          throw new Error('Geçersiz JSON formatı. Mesaj listesi bekleniyor.');
        }
      } catch (err: any) {
        setError(err.message || 'JSON ayrıştırılamadı');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col items-center p-8 w-full min-h-screen">
      <div style={{ position: 'fixed', top: '-10%', left: '-10%', width: '40%', height: '40%', backgroundColor: 'var(--primary-glow)', borderRadius: '50%', filter: 'blur(120px)', opacity: 0.15, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-10%', right: '-10%', width: '40%', height: '40%', backgroundColor: 'var(--accent-glow)', borderRadius: '50%', filter: 'blur(120px)', opacity: 0.15, pointerEvents: 'none' }} />

      <header className="flex flex-col items-center w-full max-w-5xl mb-16 gap-8 relative z-10">
        <div
          className="flex items-center gap-5 cursor-pointer group hover-scale-101 transition-all"
          onClick={() => {
            setStep('connect');
            setSelectedRoom(null);
            setError(null);
          }}
          title="Ana Sayfaya Dön"
        >
          <div className="p-3.5 glass-panel flex items-center justify-center bg-primary-glow group-hover-glow-strong relative" style={{ width: 'auto' }}>
            <ArchiveIcon className="text-white w-9 h-9" />
            {step !== 'connect' && (
              <div className="absolute -bottom-2 -right-2 p-1.5 rounded-full bg-accent-color border border-white-20 shadow-lg">
                <Home size={12} className="text-white" />
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <h1 className="text-white" style={{ fontSize: '2.5rem', fontWeight: 800 }}>Webex<span style={{ color: 'var(--primary-color)' }}>↓</span>Archiver</h1>
            <p className="text-text-secondary">Bundled Download Pro</p>
          </div>
        </div>

        <div className="flex glass-panel p-1.5 items-center justify-center gap-0" style={{ width: 'auto', borderRadius: '40px', background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--border-color)' }}>
          {[
            { id: 'connect', label: 'BAĞLAN', num: 1 },
            { id: 'select', label: 'ALAN SEÇ', num: 2 },
            { id: 'download', label: 'İNDİR', num: 3 },
            { id: 'viewer', label: 'GÖRÜNTÜLE', icon: <Search className="w-4 h-4" /> }
          ].map((s, i, arr) => {
            const isGuide = step === 'guide' && s.id === 'connect';
            const isActive = step === s.id || isGuide;
            const isClickable = s.id === 'viewer' ? importedMessages.length > 0 : true;

            return (
              <div key={s.id} className="flex items-center">
                <div
                  className={`flex items-center gap-3 px-10 py-2.5 transition-all duration-300 ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                  style={{
                    borderRadius: '35px',
                    backgroundColor: isActive ? (s.id === 'viewer' ? 'var(--accent-color)' : 'var(--primary-color)') : 'transparent',
                    boxShadow: isActive ? `0 0 20px ${s.id === 'viewer' ? 'var(--accent-glow)' : 'var(--primary-glow)'}` : 'none',
                    color: isActive ? 'white' : 'var(--text-secondary)',
                    opacity: isActive ? 1 : (isClickable ? 0.8 : 0.4),
                    zIndex: isActive ? 10 : 1
                  }}
                  onClick={() => {
                    if (s.id === 'viewer') {
                      if (importedMessages.length > 0) setStep('viewer');
                    } else if (s.id === 'connect' || (s.id === 'select' && rooms.length > 0) || (s.id === 'download' && selectedRoom)) {
                      setStep(s.id as Step);
                    }
                  }}
                >
                  <span className="flex items-center justify-center font-bold" style={{
                    width: '24px',
                    height: '24px',
                    backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)',
                    borderRadius: '50%',
                    fontSize: '11px',
                    border: isActive ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.1)'
                  }}>
                    {s.num || s.icon}
                  </span>
                  <span style={{ textTransform: 'uppercase', fontSize: '10px', fontWeight: 800, letterSpacing: '0.08em' }}>{s.label}</span>
                </div>
                {i < arr.length - 1 && (
                  <div className="mx-5 opacity-10" style={{ width: '35px', height: '1px', backgroundColor: 'var(--text-secondary)' }} />
                )}
              </div>
            );
          })}
        </div>
      </header>

      <main className="w-full max-w-2xl flex flex-col items-center relative z-10">
        <AnimatePresence mode="wait">
          {step === 'connect' && (
            <motion.div key="connect" variants={pageVariants} initial="initial" animate="enter" exit="exit" className="glass-panel p-10 flex flex-col gap-8 w-full relative overflow-hidden">
              <div
                className="absolute top-6 right-6 p-3 rounded-full cursor-pointer hover-bg-white-5 transition-colors border border-white-10 group"
                onClick={() => setStep('guide')}
                title="Nasıl Token Alırım?"
              >
                <Info className="w-6 h-6 text-text-secondary group-hover-text-primary" />
              </div>
              <div className="flex items-center gap-4">
                <Shield className="text-primary-color w-8 h-8" />
                <div>
                  <h2 className="text-white" style={{ fontSize: '1.5rem', fontWeight: 700 }}>Yetkilendirme</h2>
                  <p className="text-text-secondary">Webex Kişisel Erişim Token'ınızı girin</p>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex items-center relative">
                  <Lock className="absolute left-4 w-5 h-5 text-text-secondary" />
                  <input type="password" className="input-field" style={{ paddingLeft: '50px' }} placeholder="Webex Authenticator Token" value={webexToken} onChange={(e) => setWebexToken(e.target.value)} />
                </div>
                {error && <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error-color)', fontSize: '14px' }}><AlertCircle className="w-5 h-5" /> {error}</div>}
              </div>
              <div className="flex flex-col gap-4">
                <button className="btn-primary" onClick={fetchRooms} disabled={isLoading || !webexToken}>{isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <>Alanları Getir <ArrowRight className="w-5 h-5" /></>}</button>
                <div className="flex items-center gap-4 py-2">
                  <div className="flex-1 h-px bg-white-20"></div>
                  <span className="text-text-secondary text-xs font-bold uppercase tracking-widest opacity-50">VEYA</span>
                  <div className="flex-1 h-px bg-white-20"></div>
                </div>
                <div className="flex flex-col gap-4 p-5 rounded-2xl border border-white-5" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-text-secondary uppercase">E-postanız (Vurgulama İçin)</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary w-4 h-4" />
                      <input
                        type="email"
                        placeholder="ornek@sirket.com"
                        className="input-field"
                        style={{ paddingLeft: '40px', height: '42px', fontSize: '13px' }}
                        value={userEmail}
                        onChange={(e) => handleEmailChange(e.target.value)}
                      />
                    </div>
                  </div>
                  <label
                    className="btn-primary cursor-pointer transition-all w-full flex items-center justify-center gap-3"
                    style={{
                      background: 'linear-gradient(135deg, var(--accent-color), #7c3aed)',
                      height: '56px',
                      borderRadius: '14px',
                      color: 'white'
                    }}
                  >
                    <FileJson className="w-5 h-5 text-white" />
                    <span className="text-white font-black" style={{ fontSize: '15px' }}>Arşivi İçe Aktar ve Görüntüle</span>
                    <input type="file" accept=".json" onChange={handleImport} className="hidden" style={{ display: 'none' }} />
                  </label>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'select' && (
            <motion.div key="select" variants={pageVariants} initial="initial" animate="enter" exit="exit" className="glass-panel p-10 flex flex-col gap-6 w-full">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3"><MessageSquare className="text-primary-color w-6 h-6" /><h2 className="text-white" style={{ fontSize: '1.5rem', fontWeight: 700 }}>Alan Seçin</h2></div>
                <div className="flex gap-2">
                  <button className="btn-primary" style={{ height: '36px', padding: '0 16px', fontSize: '12px' }} onClick={downloadAll}><Archive className="w-3 h-3" /> Tümünü Arşivle</button>
                  <button className="btn-secondary" style={{ color: 'var(--text-secondary)', fontSize: '12px' }} onClick={() => setStep('connect')}><RefreshCw className="w-3 h-3" /> Sıfırla</button>
                </div>
              </div>
              <div className="flex flex-col gap-3 custom-scrollbar" style={{ maxHeight: '380px', overflowY: 'auto', paddingRight: '8px' }}>
                {rooms.map((room) => (
                  <div key={room.id} className={`room-card ${selectedRoom?.id === room.id ? 'selected' : ''}`} onClick={() => setSelectedRoom(room)}>
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', fontWeight: 800, color: 'var(--primary-color)' }}>{room.title.charAt(0)}</div>
                    <div className="flex flex-col flex-1"><span className="text-white font-bold">{room.title}</span><span className="text-text-secondary" style={{ fontSize: '11px', textTransform: 'uppercase' }}>{room.type === 'group' ? 'GRUP' : 'BİREYSEL'} • {new Date(room.created).toLocaleDateString('tr-TR')}</span></div>
                    {selectedRoom?.id === room.id && <CheckCircle2 className="text-primary-color w-6 h-6" />}
                  </div>
                ))}
              </div>
              <button className="btn-primary" onClick={downloadSelectedRoom} disabled={!selectedRoom}>Paketi İndir <Download className="w-5 h-5" /></button>
            </motion.div>
          )}

          {step === 'download' && (
            <motion.div key="download" variants={pageVariants} initial="initial" animate="enter" exit="exit" className="glass-panel p-10 flex flex-col gap-10 items-center justify-center w-full">
              <div className="flex flex-col items-center gap-6">
                <div className="flex items-center justify-center rounded-full" style={{ width: '100px', height: '100px', backgroundColor: 'rgba(79, 70, 229, 0.1)', border: '2px solid var(--primary-color)' }}><Archive className={`text-primary-color w-10 h-10 ${isLoading ? 'animate-bounce' : ''}`} /></div>
                <div className="flex flex-col items-center"><h2 className="text-white font-black" style={{ fontSize: '2.5rem' }}>{downloadProgress.current}%</h2><p className="text-text-secondary">{downloadProgress.status}</p></div>
              </div>
              <div className="flex flex-col w-full gap-2">
                <div className="flex justify-between text-xs font-bold text-text-secondary"><span>ARŞİVLEME DURUMU</span><span className="text-primary-color">{downloadProgress.current}%</span></div>
                <div className="w-full h-2 rounded-full" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}><motion.div className="h-full rounded-full" style={{ background: 'var(--primary-color)' }} initial={{ width: 0 }} animate={{ width: `${downloadProgress.current}%` }} /></div>
              </div>
              <div className="flex gap-4 w-full"><button className="btn-primary flex-1" onClick={() => setStep('select')} disabled={isLoading}>{isLoading ? 'Hazırlanıyor...' : 'Alanlara Geri Dön'}</button></div>
            </motion.div>
          )}

          {step === 'guide' && (
            <motion.div key="guide" variants={pageVariants} initial="initial" animate="enter" exit="exit" className="glass-panel p-10 flex flex-col gap-8 w-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl" style={{ border: '1px solid var(--primary-glow)', background: 'rgba(79, 70, 229, 0.1)' }}>
                    <Info className="text-primary-color w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-white" style={{ fontSize: '1.5rem', fontWeight: 700 }}>Nasıl Token Alırım?</h2>
                    <p className="text-text-secondary">Token almak için aşağıdaki adımları takip edin.</p>
                  </div>
                </div>
                <button
                  className="p-3 rounded-full hover-bg-white-5 border border-white-5 transition-all"
                  onClick={() => setStep('connect')}
                >
                  <ChevronLeft className="w-5 h-5 text-text-secondary" />
                </button>
              </div>

              <div className="flex flex-col gap-4">
                {[
                  {
                    icon: <ExternalLink className="w-5 h-5" />,
                    title: "Webex Developer Portal'a Gidin",
                    desc: "https://developer.webex.com/docs/getting-your-personal-access-token adresine gidin.",
                    link: "https://developer.webex.com/docs/getting-your-personal-access-token"
                  },
                  {
                    icon: <User className="w-5 h-5" />,
                    title: "Giriş Yapın",
                    desc: "Webex hesabınızla 'Login' butonuna tıklayarak giriş yapın."
                  },
                  {
                    icon: <User className="w-5 h-5" />,
                    title: "Profil Menüsünü Açın",
                    desc: "Sağ üst köşedeki profil ikonuna tıklayın."
                  },
                  {
                    icon: <Copy className="w-5 h-5" />,
                    title: "Token'ı Kopyalayın",
                    desc: "'Bearer' yazısının yanındaki kopyalama (copy) ikonuna tıklayın."
                  },
                  {
                    icon: <ClipboardPaste className="w-5 h-5" />,
                    title: "Uygulamaya Yapıştırın",
                    desc: "Kopyaladığınız token'ı ana sayfadaki giriş alanına yapıştırın."
                  }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-4 p-5 rounded-2xl border border-white-5 hover-border-primary transition-all" style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
                    <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-primary-glow text-primary-color mt-1">
                      {item.icon}
                    </div>
                    <div className="flex flex-col gap-1">
                      <h4 className="text-white font-bold" style={{ fontSize: '15px' }}>{idx + 1}. {item.title}</h4>
                      <p className="text-text-secondary" style={{ fontSize: '13px', lineHeight: '1.5' }}>{item.desc}</p>
                      {item.link && (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-color flex items-center gap-1.5 mt-2 font-semibold hover-underline"
                          style={{ fontSize: '13px' }}
                        >
                          Adrese Git <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button className="btn-primary" onClick={() => setStep('connect')}>
                <ChevronLeft className="w-5 h-5" /> Geri Dön
              </button>
            </motion.div>
          )}

          {step === 'viewer' && (
            <MessageViewer
              messages={importedMessages}
              onBack={() => setStep('connect')}
              title={archiveTitle}
              initialEmail={userEmail}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
