import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Mail, ArrowRight, ShieldCheck, Heart, User, Sun, Moon, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { apiLogin, apiRegister } from '../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { setUser, darkMode, toggleDarkMode } = useStore();

  // Mode: 'choose' | 'login' | 'register' | 'partner'
  const [mode, setMode] = useState<'choose' | 'login' | 'register' | 'partner'>('choose');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [partnerEmail, setPartnerEmail] = useState('');
  const [partnerPassword, setPartnerPassword] = useState('');
  const [showPartnerPassword, setShowPartnerPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const { token, user } = await apiLogin(email, password);
      localStorage.setItem('nyra_token', token);
      setUser({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        age: user.age,
        dateOfBirth: user.dateOfBirth,
        cycleLength: user.cycleLength || 28,
        periodDuration: user.periodDuration || 5,
        goals: user.goals || [],
        partnerCode: user.partnerCode,
        connectedPartnerCode: user.connectedPartnerId,
      });
      if (!user.onboardingCompleted && user.role === 'user') {
        router.push('/onboarding');
      } else if (user.role === 'partner') {
        router.push('/partner');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setErrorMsg('Please enter your name.'); return; }
    if (password.length < 6) { setErrorMsg('Password must be at least 6 characters.'); return; }
    setErrorMsg('');
    setLoading(true);
    try {
      const { token, user } = await apiRegister(email, password, name, 'user');
      localStorage.setItem('nyra_token', token);
      setUser({
        id: user.id,
        name: user.name,
        email: user.email,
        role: 'user',
        cycleLength: 28,
        periodDuration: 5,
        goals: [],
        partnerCode: user.partnerCode,
      });
      router.push('/onboarding');
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Try a different email.');
    } finally {
      setLoading(false);
    }
  };

  const handlePartnerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerEmail || !partnerPassword) { setErrorMsg('Enter your partner email and password.'); return; }
    setErrorMsg('');
    setLoading(true);
    try {
      const { token, user } = await apiLogin(partnerEmail, partnerPassword);
      if (user.role !== 'partner') {
        setErrorMsg('This account is not a Partner account. Please use regular login.');
        setLoading(false);
        return;
      }
      localStorage.setItem('nyra_token', token);
      setUser({
        id: user.id,
        name: user.name,
        email: user.email,
        role: 'partner',
        cycleLength: 28,
        periodDuration: 5,
        goals: [],
        partnerCode: user.partnerCode,
      });
      router.push('/partner');
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handlePartnerRegister = async () => {
    if (!partnerEmail || !partnerPassword || !name) {
      setErrorMsg('Fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      const { token, user } = await apiRegister(partnerEmail, partnerPassword, name, 'partner');
      localStorage.setItem('nyra_token', token);
      setUser({ id: user.id, name: user.name, email: user.email, role: 'partner', cycleLength: 28, periodDuration: 5, goals: [], partnerCode: user.partnerCode });
      router.push('/partner');
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-nebula min-h-screen relative overflow-hidden flex items-center justify-center p-container-padding-mobile md:p-container-padding-desktop transition-colors duration-300">

      {/* Dark Mode Toggle */}
      <button
        onClick={toggleDarkMode}
        title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        className="absolute top-6 right-6 p-2.5 rounded-2xl glass-card border border-white/40 dark:border-[#3a2d58]/60 text-[#3d3050] dark:text-[#c8bedd] hover:text-primary dark:hover:text-[#d4b8ff] transition-all z-20 shadow-sm"
      >
        {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
      </button>

      {/* Background Blobs */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-primary/15 dark:bg-primary/25 blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-tertiary/15 dark:bg-tertiary/25 blur-[120px]"></div>
      </div>

      <motion.div
        key={mode}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 w-full max-w-[420px] glass-card bg-white/70 dark:bg-[#16102a]/85 backdrop-blur-2xl border border-white/60 dark:border-[#3a2d58]/60 shadow-2xl rounded-2xl p-8 md:p-10 flex flex-col items-center"
      >
        {/* Logo */}
        <img src="/logo.png" alt="Nyra Logo" className="w-16 h-16 mb-5 rounded-2xl object-cover shadow-sm border-2 border-primary/20 shrink-0" />

        {/* ─── CHOOSE MODE ─── */}
        {mode === 'choose' && (
          <>
            <h1 className="font-serif font-bold text-2xl md:text-3xl text-[#18003d] dark:text-[#eee6ff] mb-2 text-center">Welcome to Nyra 🌸</h1>
            <p className="text-sm text-[#3d3050] dark:text-[#c8bedd] mb-8 font-medium text-center">Your companion for cycle wellness and self-care.</p>
            <div className="w-full flex flex-col gap-3">
              <button
                onClick={() => setMode('login')}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-sm shadow-md shadow-primary/20 hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" /> Sign In with Email
              </button>
              <button
                onClick={() => setMode('register')}
                className="w-full py-3.5 px-6 rounded-2xl border border-primary/30 dark:border-primary/40 text-primary dark:text-[#d4b8ff] font-bold text-sm bg-primary/5 dark:bg-primary/10 hover:bg-primary/10 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <User className="w-4 h-4" /> Create Account
              </button>
              <div className="relative flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-black/10 dark:bg-white/10"></div>
                <span className="text-[10px] font-bold text-[#3d3050] dark:text-[#c8bedd] uppercase tracking-wider">Partner?</span>
                <div className="flex-1 h-px bg-black/10 dark:bg-white/10"></div>
              </div>
              <button
                onClick={() => setMode('partner')}
                className="w-full py-3.5 px-6 rounded-2xl border border-tertiary/30 dark:border-tertiary/40 text-tertiary font-bold text-sm bg-tertiary/5 dark:bg-tertiary/10 hover:bg-tertiary/10 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Heart className="w-4 h-4" /> Partner Login / Register
              </button>
            </div>
          </>
        )}

        {/* ─── EMAIL LOGIN ─── */}
        {mode === 'login' && (
          <>
            <h1 className="font-serif font-bold text-2xl text-[#18003d] dark:text-[#eee6ff] mb-1 text-center">Sign In</h1>
            <p className="text-sm text-[#3d3050] dark:text-[#c8bedd] mb-6 font-medium text-center">Welcome back to Nyra 🌸</p>
            <form onSubmit={handleLogin} className="w-full flex flex-col gap-3">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email address" required
                className="w-full px-4 py-3 rounded-2xl border border-outline-variant/40 dark:border-[#3a2d58] bg-white/80 dark:bg-[#1c1230] text-[#18003d] dark:text-[#eee6ff] text-sm font-semibold outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 dark:placeholder-[#8a7fa0]"
              />
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required
                  className="w-full px-4 py-3 rounded-2xl border border-outline-variant/40 dark:border-[#3a2d58] bg-white/80 dark:bg-[#1c1230] text-[#18003d] dark:text-[#eee6ff] text-sm font-semibold outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 dark:placeholder-[#8a7fa0]"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3d3050] dark:text-[#c8bedd] hover:text-primary">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errorMsg && <p className="text-xs font-bold text-red-500 dark:text-red-400 text-center">{errorMsg}</p>}
              <button type="submit" disabled={loading} className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-sm shadow-md shadow-primary/20 hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 mt-1">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ArrowRight className="w-4 h-4" /> Sign In</>}
              </button>
            </form>
            <button onClick={() => { setMode('choose'); setErrorMsg(''); }} className="mt-5 text-xs font-bold text-[#3d3050] dark:text-[#c8bedd] hover:text-primary transition-colors">← Back</button>
          </>
        )}

        {/* ─── REGISTER ─── */}
        {mode === 'register' && (
          <>
            <h1 className="font-serif font-bold text-2xl text-[#18003d] dark:text-[#eee6ff] mb-1 text-center">Create Account</h1>
            <p className="text-sm text-[#3d3050] dark:text-[#c8bedd] mb-6 font-medium text-center">Start your wellness journey 🌸</p>
            <form onSubmit={handleRegister} className="w-full flex flex-col gap-3">
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your first name" required
                className="w-full px-4 py-3 rounded-2xl border border-outline-variant/40 dark:border-[#3a2d58] bg-white/80 dark:bg-[#1c1230] text-[#18003d] dark:text-[#eee6ff] text-sm font-semibold outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 dark:placeholder-[#8a7fa0]"
              />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" required
                className="w-full px-4 py-3 rounded-2xl border border-outline-variant/40 dark:border-[#3a2d58] bg-white/80 dark:bg-[#1c1230] text-[#18003d] dark:text-[#eee6ff] text-sm font-semibold outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 dark:placeholder-[#8a7fa0]"
              />
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (min. 6 chars)" required
                  className="w-full px-4 py-3 rounded-2xl border border-outline-variant/40 dark:border-[#3a2d58] bg-white/80 dark:bg-[#1c1230] text-[#18003d] dark:text-[#eee6ff] text-sm font-semibold outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 dark:placeholder-[#8a7fa0]"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3d3050] dark:text-[#c8bedd] hover:text-primary">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errorMsg && <p className="text-xs font-bold text-red-500 dark:text-red-400 text-center">{errorMsg}</p>}
              <button type="submit" disabled={loading} className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-sm shadow-md shadow-primary/20 hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 mt-1">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ArrowRight className="w-4 h-4" /> Create Account</>}
              </button>
            </form>
            <button onClick={() => { setMode('choose'); setErrorMsg(''); }} className="mt-5 text-xs font-bold text-[#3d3050] dark:text-[#c8bedd] hover:text-primary transition-colors">← Back</button>
          </>
        )}

        {/* ─── PARTNER LOGIN ─── */}
        {mode === 'partner' && (
          <>
            <h1 className="font-serif font-bold text-2xl text-[#18003d] dark:text-[#eee6ff] mb-1 text-center">Partner Access</h1>
            <p className="text-sm text-[#3d3050] dark:text-[#c8bedd] mb-6 font-medium text-center">Sign in or create a partner account 💜</p>
            <div className="w-full flex flex-col gap-3">
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name (for new accounts)" 
                className="w-full px-4 py-3 rounded-2xl border border-outline-variant/40 dark:border-[#3a2d58] bg-white/80 dark:bg-[#1c1230] text-[#18003d] dark:text-[#eee6ff] text-sm font-semibold outline-none focus:border-tertiary focus:ring-1 focus:ring-tertiary/20 dark:placeholder-[#8a7fa0]"
              />
              <input type="email" value={partnerEmail} onChange={e => setPartnerEmail(e.target.value)} placeholder="Partner email address"
                className="w-full px-4 py-3 rounded-2xl border border-outline-variant/40 dark:border-[#3a2d58] bg-white/80 dark:bg-[#1c1230] text-[#18003d] dark:text-[#eee6ff] text-sm font-semibold outline-none focus:border-tertiary focus:ring-1 focus:ring-tertiary/20 dark:placeholder-[#8a7fa0]"
              />
              <div className="relative">
                <input type={showPartnerPassword ? 'text' : 'password'} value={partnerPassword} onChange={e => setPartnerPassword(e.target.value)} placeholder="Password"
                  className="w-full px-4 py-3 rounded-2xl border border-outline-variant/40 dark:border-[#3a2d58] bg-white/80 dark:bg-[#1c1230] text-[#18003d] dark:text-[#eee6ff] text-sm font-semibold outline-none focus:border-tertiary focus:ring-1 focus:ring-tertiary/20 dark:placeholder-[#8a7fa0]"
                />
                <button type="button" onClick={() => setShowPartnerPassword(!showPartnerPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3d3050] dark:text-[#c8bedd] hover:text-tertiary">
                  {showPartnerPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errorMsg && <p className="text-xs font-bold text-red-500 dark:text-red-400 text-center">{errorMsg}</p>}
              <button onClick={handlePartnerLogin} disabled={loading} className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-tertiary to-primary text-white font-bold text-sm shadow-md hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 mt-1">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Heart className="w-4 h-4" /> Sign In as Partner</>}
              </button>
              <button onClick={handlePartnerRegister} disabled={loading} className="w-full py-3 rounded-2xl border border-tertiary/30 text-tertiary font-bold text-sm hover:bg-tertiary/5 transition-all flex items-center justify-center gap-2">
                <User className="w-4 h-4" /> Register as Partner
              </button>
            </div>
            <button onClick={() => { setMode('choose'); setErrorMsg(''); }} className="mt-5 text-xs font-bold text-[#3d3050] dark:text-[#c8bedd] hover:text-primary transition-colors">← Back</button>
          </>
        )}
      </motion.div>
    </div>
  );
}
