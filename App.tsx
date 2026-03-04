
import React, { useState, useEffect, useCallback } from 'react';
import { Logo, COLORS } from './constants';
import { BookConfig, TrimSize, Genre, GENRE_FONTS } from './types';
import CoverCanvas from './components/CoverCanvas';
import { generateBookArt } from './services/geminiService';
import CheckoutForm from './components/CheckoutForm';

const INITIAL_CONFIG: BookConfig = {
  trimSize: TrimSize.SIZE_6_9,
  pageCount: 150,
  title: '',
  subtitle: '',
  author: '',
  blurb: '',
  genre: Genre.THRILLER,
  fontFamily: 'Montserrat',
  spineFontFamily: 'Montserrat',
  fontStyle: 'Capitals',
  mainColor: '#FFFFFF',
  accentColor: '#D4AF37',
  aiPrompt: 'A shadowy figure standing in the rain with glowing neon signs behind them.',
};

// ─── Toast / Confirm helpers ─────────────────────────────────
type ToastType = 'success' | 'error' | 'info';
interface Toast { id: number; message: string; type: ToastType; }
interface ConfirmState { message: string; onConfirm: () => void; }

const App: React.FC = () => {
  const [config, setConfig] = useState<BookConfig>(INITIAL_CONFIG);
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  // Restore free user status from localStorage on load
  const [isFreeUser, setIsFreeUser] = useState(() => localStorage.getItem('bcb_free_registered') === 'true');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [exportedCovers, setExportedCovers] = useState(() => parseInt(localStorage.getItem('bcb_exports_used') || '0'));
  const [subscriptionDate, setSubscriptionDate] = useState<Date | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [subscriberName, setSubscriberName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [freeRegisterError, setFreeRegisterError] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  // true = cover has unsaved changes since last export (starts true so first export always works)
  const [coverDirty, setCoverDirty] = useState(true);
  // Paid user login
  const [subscriberPassword, setSubscriberPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loggedInEmail, setLoggedInEmail] = useState('');

  const showToast = (message: string, type: ToastType = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  };

  const showConfirm = (message: string, onConfirm: () => void) => {
    setConfirmState({ message, onConfirm });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: name === 'pageCount' ? parseInt(value) || 0 : value
    }));
    setCoverDirty(true); // any field change marks cover as needing a fresh export
  };

  const handleAiGeneration = async () => {
    setIsGenerating(true);
    const imageUrl = await generateBookArt(config.aiPrompt);
    if (imageUrl) {
      setConfig(prev => ({ ...prev, generatedImageUrl: imageUrl }));
      setCoverDirty(true); // new AI art = cover changed
    }
    setIsGenerating(false);
  };

  const handleCancelSubscription = () => {
    showConfirm('Are you sure you want to cancel your Elite subscription?', async () => {
      try {
        await fetch(`/api/payments/${encodeURIComponent(loggedInEmail)}`, { method: 'DELETE' });
        await fetch('/api/cancel-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: loggedInEmail }),
        });
      } catch (err) {
        console.warn('Could not update records:', err);
      }
      setIsPaid(false);
      setShowDashboard(false);
      setSubscriptionDate(null);
      setSubscriberName('');
      setSubscriberPassword('');
      setLoggedInEmail('');
      setExportedCovers(0);
      showToast('Your Elite Subscription has been cancelled.', 'info');
    });
  };

  const handleLogin = async () => {
    const email = subscriberName.toLowerCase().trim();
    if (!email.includes('@') || !subscriberPassword) {
      setLoginError('Please enter your email and password.');
      return;
    }
    setLoginError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: subscriberPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.message || 'Login failed.');
        return;
      }
      setLoggedInEmail(data.email);
      setExportedCovers(data.quotaUsed);
      setSubscriptionDate(new Date(data.subscriptionDate));
      setIsPaid(true);
      setShowPaymentModal(false);
      showToast(`Welcome back! ${data.quotaLimit - data.quotaUsed} covers remaining.`, 'success');
    } catch {
      setLoginError('Could not connect to server. Please try again.');
    }
  };

  const handleRegisterFree = async () => {
    if (!subscriberName.includes('@')) {
      setFreeRegisterError('Please enter a valid email address.');
      return;
    }

    // ✅ Local duplicate check — blocks re-registration even after refresh or server downtime
    const registeredEmail = localStorage.getItem('bcb_free_email');
    if (registeredEmail) {
      if (registeredEmail === subscriberName.toLowerCase().trim()) {
        setFreeRegisterError('This email is already registered.');
      } else {
        setFreeRegisterError('A free account already exists on this device.');
      }
      return;
    }

    setFreeRegisterError('');
    try {
      const res = await fetch('/api/sync-free', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: subscriberName.replace(/[^a-zA-Z0-9]/g, '_'),
          email: subscriberName.toLowerCase().trim(),
        }),
      });
      const data = await res.json();
      if (res.status === 409) {
        setFreeRegisterError(data.message || 'This email is already registered.');
        return;
      }
      if (!res.ok) {
        setFreeRegisterError('Something went wrong. Please try again.');
        return;
      }
    } catch (err) {
      console.warn('Could not sync free user to DB:', err);
      // Server offline — still enforce local-only registration
    }

    // ✅ Persist to localStorage so the same browser/device can never re-register
    localStorage.setItem('bcb_free_registered', 'true');
    localStorage.setItem('bcb_free_email', subscriberName.toLowerCase().trim());
    localStorage.setItem('bcb_exports_used', '0');
    setIsFreeUser(true);
    setExportedCovers(0);
    setShowPaymentModal(false);
  };

  const openPaymentModal = () => {
    setSubscriberName('');
    setSubscriberPassword('');
    setUserEmail('');
    setFreeRegisterError('');
    setLoginError('');
    setShowPaymentModal(true);
  };

  // "Finish Cover" in step 4 — no quota deducted, just signals cover is ready
  const handleFinishCover = () => {
    if (!isPaid && !isFreeUser) {
      openPaymentModal();
      return;
    }
    showToast('Your cover is ready! Click Export PDF in the top bar to download.', 'success');
  };

  // "Export PDF" header button — this is the only action that deducts quota
  const handleExportPDF = () => {
    if (!isPaid && !isFreeUser) {
      openPaymentModal();
      return;
    }
    if (!isPaid && isFreeUser && exportedCovers >= 1) {
      showToast('Free users get 1 cover. Upgrade to unlock 30 covers/month!', 'error');
      openPaymentModal();
      return;
    }
    if (isPaid && exportedCovers >= 30) {
      showToast('You have reached your monthly limit of 30 covers.', 'error');
      return;
    }
    // ✅ Paid users: no quota deducted if nothing changed since last export
    if (isPaid && !coverDirty) {
      showToast('No changes detected. Edit your cover to export a new version.', 'info');
      return;
    }
    const next = exportedCovers + 1;
    setExportedCovers(next);
    localStorage.setItem('bcb_exports_used', String(next));
    setCoverDirty(false);
    // Sync quota to DB for logged-in paid users
    if (loggedInEmail) {
      fetch('/api/update-quota', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loggedInEmail, quotaUsed: next }),
      }).catch(err => console.warn('Could not sync quota:', err));
    }
    showToast(`Cover exported! ${isPaid ? 30 - next : 0} quota remaining.`, 'success');
    handleDirectExportPDF();
  };

  // ─── Direct PDF export — no account / payment required ───────
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const handleDirectExportPDF = async () => {
    const coverEl = document.getElementById('cover-wrap');
    if (!coverEl) { showToast('Cover preview not found. Please wait a moment.', 'error'); return; }
    if (isExportingPDF) return;
    setIsExportingPDF(true);
    try {
      // Capture exact rendered dimensions (CSS transforms don't affect offsetWidth/Height)
      const coverWidth = coverEl.offsetWidth;
      const coverHeight = coverEl.offsetHeight;

      // Clone the cover so we strip elements without touching the live preview
      const clone = coverEl.cloneNode(true) as HTMLElement;
      // Strip watermark (rotate-45 overlay)
      clone.querySelector('.rotate-45')?.remove();
      // Strip preview guide lines (dashed borders / spine markers)
      clone.querySelectorAll('.border-dashed').forEach(el => el.remove());

      // Tailwind CDN resolves all utility classes (text-white, leading-relaxed, etc.)
      // so colours in the headless browser match what the user sees in the app.
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Montserrat:wght@400;700;900&family=Great+Vibes&family=Cinzel:wght@700&family=Orbitron:wght@400;700&family=Crimson+Text:ital,wght@0,400;1,700&family=Bebas+Neue&family=Libre+Baskerville:wght@700&family=Special+Elite&display=block" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: ${coverWidth}px; height: ${coverHeight}px; overflow: hidden; }
  </style>
</head>
<body>${clone.outerHTML}</body>
</html>`;

      const res = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, coverWidth, coverHeight }),
      });

      if (!res.ok) {
        let errMsg = 'PDF generation failed.';
        try {
          const errBody = await res.json();
          errMsg = errBody.message || errMsg;
        } catch {
          errMsg = await res.text().catch(() => errMsg);
        }
        console.error('[generate-pdf] Server error:', errMsg);
        showToast(errMsg, 'error');
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'book-cover.pdf';
      a.click();
      URL.revokeObjectURL(url);
      showToast('PDF downloaded! ✓', 'success');
    } catch (err) {
      console.error('[generate-pdf] Fetch error:', err);
      showToast('Export failed — is the server running on port 4000?', 'error');
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="h-16 bg-white border-b flex items-center justify-between px-3 sm:px-8 sticky top-0 z-40 shadow-sm">
        <Logo />
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden md:flex gap-1">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className={`h-1 w-8 rounded-full ${step >= s ? 'bg-yellow-500' : 'bg-slate-200'}`} />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleExportPDF}
              className="bg-slate-900 text-white px-3 py-2 sm:px-6 sm:py-2 rounded-full font-bold hover:bg-slate-800 transition shadow-md text-[11px] sm:text-sm whitespace-nowrap"
            >
              {isPaid ? 'Export PDF' : isFreeUser ? `Export PDF (${1 - exportedCovers} left)` : 'Remove Watermark'}
            </button>
          </div>
          {isPaid && (
            <button
              onClick={() => setShowDashboard(true)}
              className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-tr from-yellow-400 to-yellow-600 text-white rounded-full flex items-center justify-center font-bold font-serif text-sm sm:text-lg shadow-lg border-2 border-white hover:scale-105 transition"
              title="Dashboard"
            >
              {subscriberName ? subscriberName.charAt(0).toUpperCase() : 'U'}
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Sidebar - Controls */}
        <aside className="w-full md:w-[400px] bg-white border-r overflow-y-auto p-6 space-y-8 h-[calc(100vh-64px)]">

          {/* STEP 1: DIMENSIONS */}
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-left duration-300">
              <h3 className="text-xl font-bold border-b pb-2">1. Book Dimensions</h3>
              <div>
                <label className="block text-sm font-semibold mb-2">Trim Size (KDP Standard)</label>
                <select
                  name="trimSize"
                  value={config.trimSize}
                  onChange={handleInputChange}
                  className="w-full p-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none"
                >
                  <option value={TrimSize.SIZE_5_8}>5" x 8"</option>
                  <option value={TrimSize.SIZE_55_85}>5.5" x 8.5"</option>
                  <option value={TrimSize.SIZE_6_9}>6" x 9" (Most Popular)</option>
                  <option value={TrimSize.SIZE_85_11}>8.5" x 11"</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Page Count</label>
                <input
                  type="number"
                  name="pageCount"
                  value={config.pageCount}
                  onChange={handleInputChange}
                  min="24"
                  max="800"
                  className="w-full p-3 bg-slate-50 border rounded-xl"
                />
                <p className="text-xs text-slate-500 mt-2">Spine width is auto-calculated based on page count.</p>
              </div>
              <button
                onClick={() => setStep(2)}
                className="w-full bg-yellow-500 text-black font-bold py-4 rounded-xl hover:bg-yellow-400 transition"
              >
                Next: Book Details
              </button>
            </div>
          )}

          {/* STEP 2: DETAILS */}
          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-left duration-300">
              <h3 className="text-xl font-bold border-b pb-2">2. Cover Content</h3>
              <div className="space-y-4">
                <input
                  placeholder="Book Title"
                  name="title"
                  value={config.title}
                  onChange={handleInputChange}
                  className="w-full p-3 bg-slate-50 border rounded-xl"
                />
                <input
                  placeholder="Subtitle (Optional)"
                  name="subtitle"
                  value={config.subtitle}
                  onChange={handleInputChange}
                  className="w-full p-3 bg-slate-50 border rounded-xl"
                />
                <input
                  placeholder="Author Name"
                  name="author"
                  value={config.author}
                  onChange={handleInputChange}
                  className="w-full p-3 bg-slate-50 border rounded-xl"
                />
                <textarea
                  placeholder="Back Cover Blurb"
                  name="blurb"
                  rows={4}
                  value={config.blurb}
                  onChange={handleInputChange}
                  className="w-full p-3 bg-slate-50 border rounded-xl text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep(1)} className="flex-1 bg-slate-100 p-4 rounded-xl font-bold">Back</button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!config.title.trim() || !config.author.trim() || !config.blurb.trim()}
                  className={`flex-[2] p-4 rounded-xl font-bold transition ${(!config.title.trim() || !config.author.trim() || !config.blurb.trim()) ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-yellow-500 hover:bg-yellow-400'}`}
                >
                  Next: AI Art
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: ART */}
          {step === 3 && (
            <div className="space-y-6 animate-in slide-in-from-left duration-300">
              <h3 className="text-xl font-bold border-b pb-2">3. Cover Art (AI)</h3>
              <div>
                <label className="block text-sm font-semibold mb-2">Describe your vision</label>
                <textarea
                  placeholder="e.g., A shadowy man with the moon behind him, dark cinematic atmosphere"
                  name="aiPrompt"
                  rows={4}
                  value={config.aiPrompt}
                  onChange={handleInputChange}
                  className="w-full p-3 bg-slate-50 border rounded-xl text-sm"
                />
              </div>
              <button
                onClick={handleAiGeneration}
                disabled={isGenerating}
                className={`w-full py-4 rounded-xl font-bold shadow-lg transition flex items-center justify-center gap-2 ${isGenerating ? 'bg-slate-400 cursor-not-allowed' : 'bg-black text-white hover:bg-slate-800'
                  }`}
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : 'Generate AI Art'}
              </button>
              <div className="flex gap-2">
                <button onClick={() => setStep(2)} className="flex-1 bg-slate-100 p-4 rounded-xl font-bold">Back</button>
                <button onClick={() => setStep(4)} className="flex-[2] bg-yellow-500 p-4 rounded-xl font-bold">Next: Typography</button>
              </div>
            </div>
          )}

          {/* STEP 4: TYPOGRAPHY */}
          {step === 4 && (
            <div className="space-y-6 animate-in slide-in-from-left duration-300">
              <h3 className="text-xl font-bold border-b pb-2">4. Typography</h3>

              <div>
                <label className="block text-sm font-semibold mb-2">Book Genre</label>
                <select
                  name="genre"
                  value={config.genre}
                  onChange={handleInputChange}
                  className="w-full p-3 bg-slate-50 border rounded-xl"
                >
                  {Object.values(Genre).map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Title Font (Genre Optimized)</label>
                <div className="grid grid-cols-2 gap-2">
                  {GENRE_FONTS[config.genre].map(font => (
                    <button
                      key={font}
                      onClick={() => { setConfig(prev => ({ ...prev, fontFamily: font })); setCoverDirty(true); }}
                      className={`p-3 border rounded-xl text-center text-sm transition ${config.fontFamily === font ? 'bg-black text-white' : 'bg-slate-50 hover:bg-slate-100'
                        }`}
                      style={{ fontFamily: `"${font}"` }}
                    >
                      {font}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Spine Font</label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {['Montserrat', 'Crimson Text', 'Cinzel'].map(f => (
                    <button
                      key={f}
                      onClick={() => { setConfig(prev => ({ ...prev, spineFontFamily: f })); setCoverDirty(true); }}
                      className={`px-4 py-2 rounded-full whitespace-nowrap border ${config.spineFontFamily === f ? 'bg-slate-900 text-white' : 'bg-white'}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Text Color</label>
                <div className="flex gap-2">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => { setConfig(prev => ({ ...prev, mainColor: c })); setCoverDirty(true); }}
                      className={`w-10 h-10 rounded-full border-2 ${config.mainColor === c ? 'border-yellow-500 ring-2 ring-yellow-200' : 'border-slate-200'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Font Style</label>
                <div className="flex gap-2">
                  {(['Serif', 'Sans-Serif', 'Capitals'] as const).map(style => (
                    <button
                      key={style}
                      onClick={() => { setConfig(prev => ({ ...prev, fontStyle: style })); setCoverDirty(true); }}
                      className={`flex-1 p-3 border rounded-xl text-sm ${config.fontStyle === style ? 'bg-black text-white' : 'bg-slate-50'}`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setStep(3)} className="flex-1 bg-slate-100 p-4 rounded-xl font-bold">Back</button>
                <button onClick={handleFinishCover} className="flex-[2] bg-yellow-500 p-4 rounded-xl font-bold">Finish Cover</button>
              </div>
            </div>
          )}
        </aside>

        {/* Right Content - Live Preview */}
        <section className="flex-1 bg-slate-200 p-4 md:p-12 flex flex-col items-center justify-center overflow-auto relative">
          <div className="absolute top-8 left-8 bg-white/80 backdrop-blur px-4 py-2 rounded-full text-xs font-bold text-slate-500 uppercase tracking-widest border border-white/20 shadow-sm z-10">
            Live KDP Compliance Preview
          </div>

          <div className="scale-[0.5] sm:scale-[0.7] md:scale-100 transition-transform origin-center">
            <CoverCanvas config={config} isPaid={isPaid} />
          </div>

          {/* Controls Footer */}
          <div className="mt-12 flex gap-4 text-slate-500 text-sm font-medium">
            <div className="flex items-center gap-2 bg-white/50 px-4 py-2 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              300 DPI Ready
            </div>
            <div className="flex items-center gap-2 bg-white/50 px-4 py-2 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              CMYK Profile
            </div>
            <div className="flex items-center gap-2 bg-white/50 px-4 py-2 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              Bleed Calculated
            </div>
          </div>

        </section>
      </main>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200 relative">
            <button
              onClick={() => setShowPaymentModal(false)}
              className="absolute top-3 right-3 z-10 text-slate-400 hover:text-slate-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Email capture before showing Stripe form */}
            {!userEmail ? (
              <div className="p-4">
                {/* Header */}
                <h2 className="text-2xl font-black text-slate-900 mb-0.5">Upgrade to Pro</h2>
                <p className="text-slate-600 text-sm mb-3">Unlock unlimited professional KDP covers</p>

                {/* Price box */}
                <div className="flex items-center justify-between bg-slate-100 rounded-xl px-3 py-2 mb-3">
                  <span className="font-bold text-slate-800 text-base">Elite Subscription</span>
                  <span className="font-black text-slate-900 text-base">$9.00 / month</span>
                </div>

                {/* Features */}
                <ul className="space-y-1 mb-3">
                  {['Remove all watermarks', 'Generate 30 elite covers/month', 'High-res 300DPI PDF exports'].map(f => (
                    <li key={f} className="flex items-center gap-2 text-slate-900 text-sm">
                      <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                {/* Email */}
                <input
                  type="email"
                  placeholder="Your email address"
                  value={subscriberName}
                  onChange={(e) => setSubscriberName(e.target.value)}
                  className="w-full p-2 mb-1.5 bg-white border-2 border-yellow-400 rounded-lg outline-none focus:border-yellow-500 text-slate-900 placeholder:text-slate-500 transition text-sm"
                />

                {/* Password */}
                <div className="relative mb-2">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password (min 6 chars)"
                    value={subscriberPassword}
                    onChange={(e) => setSubscriberPassword(e.target.value)}
                    className="w-full p-2 pr-9 bg-white border-2 border-slate-300 rounded-lg outline-none focus:border-yellow-400 text-slate-900 placeholder:text-slate-500 transition text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showPassword
                      ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                      : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    }
                  </button>
                </div>

                {/* Log In */}
                <button
                  disabled={!subscriberName.includes('@') || !subscriberPassword}
                  onClick={handleLogin}
                  className="w-full border-2 border-slate-900 text-slate-900 bg-white py-2 rounded-lg font-bold text-sm hover:bg-slate-900 hover:text-white transition disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                  Log In to Existing Account
                </button>
                {loginError && (
                  <p className="text-red-500 text-sm text-center mt-1 mb-1 font-medium">{loginError}</p>
                )}

                {/* Divider */}
                <div className="flex items-center gap-2 my-2">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-xs text-slate-400">or new subscription</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>

                {/* Subscribe button */}
                <button
                  disabled={!subscriberName.includes('@') || subscriberPassword.length < 6}
                  onClick={() => setUserEmail(subscriberName)}
                  className="w-full bg-slate-900 text-white py-2 rounded-lg font-bold text-sm hover:bg-slate-700 transition disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Subscribe with Stripe
                </button>
                <p className="text-center text-xs text-slate-500 mt-1">Secure billing · your password sets your login</p>

                {/* Register Free */}
                <div className="flex items-center gap-2 mt-2 mb-2">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-xs text-slate-400">or</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
                <button
                  disabled={!subscriberName.includes('@')}
                  onClick={handleRegisterFree}
                  className="w-full border-2 border-slate-800 text-slate-900 bg-white py-2 rounded-lg font-bold text-sm hover:bg-slate-100 hover:border-slate-900 transition disabled:opacity-40"
                >
                  ✦ Register Free — 1 free cover export
                </button>
                {freeRegisterError && (
                  <p className="text-red-500 text-sm text-center mt-1 font-medium">{freeRegisterError}</p>
                )}
              </div>
            ) : (
              <CheckoutForm
                amount={900}
                currency="usd"
                customerEmail={userEmail}
                onSuccess={async () => {
                  // Register paid subscriber in DB
                  try {
                    await fetch('/api/register-paid', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email: userEmail, password: subscriberPassword }),
                    });
                  } catch (err) {
                    console.warn('Could not register subscriber:', err);
                  }
                  // Log order to DB
                  try {
                    await fetch('/api/orders', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        userId: userEmail.replace(/[^a-zA-Z0-9]/g, '_'),
                        items: [{ plan: 'Elite', covers: 30 }],
                        totalAmount: 9.00,
                      }),
                    });
                  } catch (err) {
                    console.warn('Could not log order:', err);
                  }
                  setLoggedInEmail(userEmail);
                  setIsPaid(true);
                  setSubscriptionDate(new Date());
                  setExportedCovers(0);
                  setShowPaymentModal(false);
                  showToast('Welcome to Elite! You have 30 covers this month.', 'success');
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Dashboard Modal */}
      {showDashboard && subscriptionDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-serif font-black text-slate-800">Your Atelier</h2>
              </div>
              <button onClick={() => setShowDashboard(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="text-center mb-8">
              <p className="font-serif italic text-slate-600 mb-4 leading-relaxed">
                "A beautiful cover is the beginning of a magnificent story."
              </p>
              <div className="inline-block bg-yellow-100 text-yellow-800 px-5 py-2 rounded-full font-bold shadow-sm">
                {30 - exportedCovers} / 30 Covers Remaining
              </div>
            </div>

            <div className="space-y-3 bg-slate-50 p-5 rounded-2xl border text-sm text-slate-600">
              <div className="flex justify-between items-center group">
                <span>Subscribed</span>
                <span className="font-medium text-slate-900">{subscriptionDate.toLocaleDateString()} {subscriptionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between items-center group">
                <span>Renews in</span>
                <span className="font-medium text-slate-900">
                  {30 - Math.floor((new Date().getTime() - subscriptionDate.getTime()) / (1000 * 60 * 60 * 24))} days
                </span>
              </div>
              <div className="flex justify-between items-center group pt-2 border-t">
                <span>Status</span>
                <span className="font-bold text-emerald-600">Elite Active</span>
              </div>
            </div>

            <button
              onClick={handleCancelSubscription}
              className="mt-6 w-full py-3 rounded-xl border-2 border-red-100 text-red-500 font-bold hover:bg-red-50 hover:border-red-200 transition"
            >
              Cancel Subscription
            </button>
          </div>
        </div>
      )}
      {/* ── Toast Notifications ───────────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-2xl shadow-xl text-sm font-medium max-w-xs animate-in slide-in-from-right duration-300 pointer-events-auto
              ${t.type === 'success' ? 'bg-emerald-600 text-white'
                : t.type === 'error' ? 'bg-red-500 text-white'
                  : 'bg-slate-800 text-white'}`}
          >
            <span className="text-base leading-none mt-0.5">
              {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}
            </span>
            {t.message}
          </div>
        ))}
      </div>

      {/* ── Confirm Dialog ────────────────────────────────────── */}
      {confirmState && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <p className="text-slate-800 font-semibold text-base mb-5">{confirmState.message}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmState(null)}
                className="flex-1 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition"
              >Cancel</button>
              <button
                onClick={() => { confirmState.onConfirm(); setConfirmState(null); }}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition"
              >Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
