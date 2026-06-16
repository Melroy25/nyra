import React, { useState } from 'react';
import { useNyraStore } from '../store/useNyraStore';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, X, Calendar, ShieldCheck, Sparkles, Apple, Sun, Moon, Heart, Mail, Lock, User, Loader2 } from 'lucide-react';
import logoImg from '../assets/logo.png';

export const LandingPage: React.FC = () => {
  const { setView, darkMode, toggleDarkMode, updateProfile } = useNyraStore();
  const { signUp, signIn, signInWithGoogle } = useAuth();
  const [showLearnMore, setShowLearnMore] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === 'signup' && !fullName.trim()) {
      setErrorMsg('Please enter your name');
      return;
    }
    if (!email.trim()) {
      setErrorMsg('Please enter your email');
      return;
    }
    if (!password.trim() || password.length < 6) {
      setErrorMsg('Password must be at least 6 characters');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);
    
    try {
      if (authMode === 'signup') {
        await signUp(email.trim(), password, fullName.trim());
        updateProfile({ name: fullName.trim() });
        setShowAuthModal(false);
        setView('onboarding');
      } else {
        const user = await signIn(email.trim(), password);
        updateProfile({ name: user.displayName || email.split('@')[0] });
        setShowAuthModal(false);
        // App.tsx will auto-navigate to dashboard via auth listener
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMsg('');
    setIsSubmitting(true);
    
    try {
      const user = await signInWithGoogle();
      updateProfile({ name: user.displayName || 'User' });
      setShowAuthModal(false);
      // App.tsx will auto-navigate via auth listener
    } catch (err: any) {
      setErrorMsg(err.message || 'Google sign-in failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Drifting emojis configuration positioned safely outside the central cycle card
  const floatingEmojis = [
    { emoji: '✨', bg: 'bg-purple-100/80', delay: 0, x: -105, y: -85, duration: 16 },
    { emoji: '🌸', bg: 'bg-pink-100/80', delay: 0, x: 125, y: 0, duration: 24 },
    { emoji: '🧘‍♀️', bg: 'bg-teal-100/80', delay: 0.1, x: -125, y: 0, duration: 26 },
    { emoji: '🥗', bg: 'bg-emerald-100/80', delay: 0.2, x: 105, y: -80, duration: 20 },
    { emoji: '⚡', bg: 'bg-amber-100/80', delay: 0.3, x: 105, y: 80, duration: 22 },
    { emoji: '😴', bg: 'bg-indigo-100/80', delay: 0.4, x: -105, y: 85, duration: 18 },
    { emoji: '💧', bg: 'bg-blue-100/80', delay: 0.5, x: 0, y: -120, duration: 14 },
    { emoji: '🩸', bg: 'bg-rose-100/80', delay: 0.6, x: 0, y: 120, duration: 18 },
  ];

  return (
    <div className="flex-1 flex flex-col justify-around p-5 bg-gradient-to-b from-white via-bgsoft to-purple-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950/25 h-[100dvh] overflow-hidden pb-8">
      
      {/* Brand Header */}
      <div className="flex justify-between items-center py-2">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md bg-white flex items-center justify-center border border-purple-100/30">
            <img src={logoImg} alt="Nyra Logo" className="w-full h-full object-cover" />
          </div>
        </div>
        
        {/* Theme Toggle Button */}
        <button 
          onClick={toggleDarkMode}
          className="w-9 h-9 rounded-full bg-purple-50 dark:bg-white/10 flex items-center justify-center text-textpurple dark:text-slate-300 hover:bg-purple-100 dark:hover:bg-white/20 transition-colors cursor-pointer"
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {darkMode ? <Sun className="w-4.5 h-4.5 text-amber-500 fill-amber-500" /> : <Moon className="w-4.5 h-4.5" />}
        </button>
      </div>

      {/* Hero Visual Area */}
      <div className="my-auto py-4 flex flex-col items-center justify-center relative">
        {/* Animated Gradient Background Glow */}
        <div className="absolute w-64 h-64 bg-primary/20 rounded-full blur-3xl -z-10 animate-pulse-ring"></div>
        
        {/* Central Glowing Cycle Ring */}
        <div className="relative w-48 h-48 flex items-center justify-center">
          {/* Main outer rotating ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 rounded-full border-[6px] border-dashed border-primary/30 glow-ring"
          />
          
          {/* Inner ring */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-4 rounded-full border-[3px] border-accent/40"
          />

          {/* Central Core Display */}
          <div className="w-32 h-32 rounded-full bg-white/85 backdrop-blur-md flex flex-col items-center justify-center shadow-lg border border-purple-100/70 z-10 text-center px-2">
            <Heart className="w-8 h-8 text-accent fill-accent animate-pulse" />
            <span className="text-xs font-bold tracking-widest text-textpurple uppercase mt-2">Nyra</span>
            <span className="text-[10px] text-slate-400 italic font-medium mt-0.5">the one you need</span>
          </div>

          {/* Floating Orbiting Emojis */}
          {floatingEmojis.map((item, idx) => {
            return (
              <motion.div
                key={idx}
                initial={{ x: 0, y: 0, opacity: 0, scale: 0.1 }}
                animate={{ x: item.x, y: item.y, opacity: 1, scale: 1 }}
                transition={{ 
                  type: 'tween',
                  ease: 'easeOut',
                  duration: 4.5,
                  delay: item.delay 
                }}
                style={{
                  position: 'absolute',
                  transformOrigin: 'center'
                }}
                className="z-20"
              >
                <motion.div
                  animate={{
                    y: [0, -12, 10, -5, 0],
                    x: [0, 8, -10, 12, 0],
                    scale: [1, 1.08, 0.92, 1.05, 1],
                    rotate: [0, 5, -5, 3, 0]
                  }}
                  transition={{
                    duration: item.duration,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: item.delay
                  }}
                  className={`w-10 h-10 rounded-full ${item.bg} flex items-center justify-center shadow-md border border-white/90 text-lg select-none`}
                >
                  {item.emoji}
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Copywriting & Action Area */}
      <div className="flex flex-col gap-3 text-center pb-2">
        <div>
          <h1 className="font-serif text-2xl font-extrabold tracking-tight text-textpurple leading-tight">
            Understand Your Cycle.
            <br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Predict Your Needs.
            </span>
          </h1>
          <p className="text-slate-500 text-xs mt-2 leading-relaxed max-w-sm mx-auto px-4">
            AI-powered cycle tracking, symptom insights, mood prediction and personalized nutrition guidance.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-2 px-2">
          <button
            onClick={() => { setAuthMode('signup'); setShowAuthModal(true); }}
            className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-primary to-accent text-white font-semibold flex items-center justify-center gap-2 hover:opacity-95 transition-opacity shadow-lg shadow-primary/20 cursor-pointer text-sm"
          >
            Get Started
            <ArrowRight className="w-4.5 h-4.5" />
          </button>
          
          <div className="flex gap-2">
            <button
              onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
              className="flex-1 py-2.5 px-4 rounded-2xl bg-white/70 border border-purple-100 text-textpurple font-semibold hover:bg-white transition-colors cursor-pointer text-xs"
            >
              Log In
            </button>
            <button
              onClick={() => setShowLearnMore(true)}
              className="flex-1 py-2.5 px-4 rounded-2xl bg-white/70 border border-purple-100 text-textpurple font-semibold hover:bg-white transition-colors cursor-pointer text-xs"
            >
              Learn More
            </button>
          </div>
        </div>
      </div>

      {/* Learn More Modal Dialog */}
      <AnimatePresence>
        {showLearnMore && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950 z-40"
              onClick={() => setShowLearnMore(false)}
            />
            <motion.div 
              initial={{ opacity: 0, y: 150 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 150 }}
              className="absolute bottom-0 left-0 right-0 max-h-[80%] bg-white rounded-t-[32px] p-6 z-50 border-t border-purple-100 flex flex-col text-left overflow-y-auto text-textpurple"
            >
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-serif text-xl font-bold">Discover Nyra</h3>
                <button 
                  onClick={() => setShowLearnMore(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/20"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex gap-3.5 items-start p-3 bg-purple-50/50 rounded-2xl border border-purple-100/40">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center text-primary shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Smart Period Tracker</h4>
                    <p className="text-xs text-slate-500 mt-1">Logs symptoms, flow levels, and calculates personalized fertile and ovulation phases based on historical trends.</p>
                  </div>
                </div>

                <div className="flex gap-3.5 items-start p-3 bg-purple-50/50 rounded-2xl border border-purple-100/40">
                  <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center text-accent shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">AI Wellness Assistant</h4>
                    <p className="text-xs text-slate-500 mt-1">An empathetic AI wellness companion built to help answer physiological questions about bloating, cravings, and mood changes.</p>
                  </div>
                </div>

                <div className="flex gap-3.5 items-start p-3 bg-purple-50/50 rounded-2xl border border-purple-100/40">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100/50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500 dark:text-emerald-400 shrink-0">
                    <Apple className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Cycle-Based Nutrition</h4>
                    <p className="text-xs text-slate-500 mt-1">Provides tailored diet suggestions and recipes matching your cycle phase, including explanations for sugar and salt cravings.</p>
                  </div>
                </div>

                <div className="flex gap-3.5 items-start p-3 bg-purple-50/50 rounded-2xl border border-purple-100/40">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500 dark:text-indigo-400 shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Data Privacy First</h4>
                    <p className="text-xs text-slate-500 mt-1">All health details are logged client-side only. Your details are private, protected, and exports are fully user-controlled.</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowLearnMore(false);
                  setView('onboarding');
                }}
                className="mt-6 w-full py-3.5 rounded-2xl bg-gradient-to-r from-primary to-accent text-white font-semibold text-center"
              >
                Start Onboarding
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Auth Modal Dialog */}
      <AnimatePresence>
        {showAuthModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/60 z-40 backdrop-blur-xs"
              onClick={() => setShowAuthModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, y: 150 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 150 }}
              className="absolute bottom-0 left-0 right-0 max-h-[90%] bg-white dark:bg-slate-900 rounded-t-[32px] p-6 z-50 border-t border-purple-100 dark:border-slate-800 flex flex-col text-left overflow-y-auto text-textpurple dark:text-slate-100"
            >
              <form onSubmit={handleAuthSubmit} className="flex flex-col">
                <div className="flex justify-between items-center mb-5">
                  <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl w-48">
                    <button
                      type="button"
                      onClick={() => { setAuthMode('login'); setErrorMsg(''); }}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        authMode === 'login' 
                          ? 'bg-white dark:bg-slate-700 text-textpurple dark:text-white shadow-sm' 
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      Log In
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAuthMode('signup'); setErrorMsg(''); }}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        authMode === 'signup' 
                          ? 'bg-white dark:bg-slate-700 text-textpurple dark:text-white shadow-sm' 
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      Sign Up
                    </button>
                  </div>
                  
                  <button 
                    type="button"
                    onClick={() => setShowAuthModal(false)}
                    className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/20"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Title */}
                <div className="mb-5">
                  <h3 className="font-serif text-2xl font-bold text-textpurple dark:text-white">
                    {authMode === 'login' ? 'Welcome back to Nyra' : 'Create your account'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {authMode === 'login' ? 'Sign in to sync your cycle and wellness logs' : 'Start tracking and understanding your body today'}
                  </p>
                </div>

                {/* Error Message */}
                {errorMsg && (
                  <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs rounded-xl font-medium">
                    {errorMsg}
                  </div>
                )}

                {/* Auth Form */}
                <div className="space-y-4">
                  {authMode === 'signup' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type="text"
                          placeholder="Aria Smith"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-primary/50 text-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Username or Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="aria@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-primary/50 text-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-primary/50 text-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 mt-2 rounded-2xl bg-gradient-to-r from-primary to-accent text-white font-semibold text-center shadow-lg shadow-primary/20 hover:opacity-95 transition-opacity cursor-pointer text-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isSubmitting ? 'Please wait...' : (authMode === 'login' ? 'Log In' : 'Sign Up')}
                  </button>
                </div>

                {/* Divider */}
                <div className="relative flex py-5 items-center">
                  <div className="flex-grow border-t border-purple-50 dark:border-slate-800"></div>
                  <span className="flex-shrink mx-3 text-slate-400 dark:text-slate-500 text-[10px] uppercase font-bold tracking-wider">Or continue with</span>
                  <div className="flex-grow border-t border-purple-50 dark:border-slate-800"></div>
                </div>

                {/* Google OAuth Button */}
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  className="w-full py-3 px-4 rounded-2xl bg-white dark:bg-slate-800 border border-purple-100 dark:border-slate-700 text-textpurple dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors flex items-center justify-center gap-2.5 cursor-pointer text-sm mb-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" width="24" height="24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Google
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
