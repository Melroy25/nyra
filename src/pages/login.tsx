import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Mail, ArrowRight, ShieldCheck, Heart, User, Sun, Moon } from 'lucide-react';
import { useStore } from '../store/useStore';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const router = useRouter();
  const { setUser, connectPartner, darkMode, toggleDarkMode } = useStore();
  
  const [isPartnerLogin, setIsPartnerLogin] = useState(false);
  const [partnerCode, setPartnerCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleNormalUserLogin = () => {
    // Redirect to onboarding to collect details
    router.push('/onboarding');
  };

  const handlePartnerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerCode.trim()) {
      setErrorMsg('Please enter a valid connection code.');
      return;
    }
    
    // Attempt connection
    const success = connectPartner(partnerCode.trim().toUpperCase());
    if (success) {
      router.push('/partner');
    } else {
      setErrorMsg('Invalid connection code. Try using: NYRA-82941');
    }
  };

  return (
    <div className="bg-nebula min-h-screen relative overflow-hidden flex items-center justify-center p-container-padding-mobile md:p-container-padding-desktop transition-colors duration-300">
      
      {/* Dark Mode Toggle at top right */}
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
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-[420px] glass-card bg-white/70 dark:bg-[#16102a]/85 backdrop-blur-2xl border border-white/60 dark:border-[#3a2d58]/60 shadow-2xl rounded-2xl p-8 md:p-10 text-center flex flex-col items-center"
      >
        {/* Logo */}
        <img 
          src="/logo.png" 
          alt="Nyra Logo" 
          className="w-16 h-16 mb-6 rounded-2xl object-cover shadow-sm border-2 border-primary/20 shrink-0" 
        />

        <h1 className="font-serif font-bold text-2xl md:text-3xl text-[#18003d] dark:text-[#eee6ff] mb-2">
          {isPartnerLogin ? 'Partner Login' : 'Welcome to Nyra'}
        </h1>
        <p className="text-sm text-[#3d3050] dark:text-[#c8bedd] mb-8 font-medium">
          {isPartnerLogin 
            ? 'Enter your partner code to view shared updates.' 
            : 'Your companion for cycle wellness and self-care.'}
        </p>

        {!isPartnerLogin ? (
          // Normal User Login Options
          <div className="w-full flex flex-col gap-3">
            <button 
              onClick={handleNormalUserLogin}
              className="w-full h-12 rounded-2xl border border-outline-variant/60 dark:border-[#3a2d58] bg-white/60 dark:bg-[#1c1230]/70 hover:bg-white dark:hover:bg-[#261d48] text-[#18003d] dark:text-[#eee6ff] transition-all duration-300 flex items-center justify-center gap-3 font-semibold text-sm shadow-sm"
            >
              <img src="https://lh3.googleusercontent.com/COxitfgomBU1s3aYY4F5q7HPZ7Ly5tTR503Fc891tHBHOK91DQ-Gq5w3p865R60CqK90=s24" alt="Google" className="w-5 h-5 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              Continue with Google
            </button>

            <button 
              onClick={handleNormalUserLogin}
              className="w-full h-12 rounded-2xl border border-outline-variant/60 dark:border-[#3a2d58] bg-white/60 dark:bg-[#1c1230]/70 hover:bg-white dark:hover:bg-[#261d48] text-[#18003d] dark:text-[#eee6ff] transition-all duration-300 flex items-center justify-center gap-3 font-semibold text-sm shadow-sm"
            >
              <span className="font-bold text-base"></span>
              Continue with Apple
            </button>

            <button 
              onClick={handleNormalUserLogin}
              className="w-full h-12 rounded-2xl border border-outline-variant/60 dark:border-[#3a2d58] bg-white/60 dark:bg-[#1c1230]/70 hover:bg-white dark:hover:bg-[#261d48] text-[#18003d] dark:text-[#eee6ff] transition-all duration-300 flex items-center justify-center gap-3 font-semibold text-sm shadow-sm"
            >
              <Mail className="w-4 h-4 text-primary dark:text-[#d4b8ff]" />
              Continue with Email
            </button>

            <div className="w-full flex items-center gap-4 my-4 opacity-70">
              <div className="flex-1 h-[1px] bg-outline-variant/60 dark:bg-[#3a2d58]"></div>
              <span className="font-bold text-[10px] text-[#3d3050] dark:text-[#c8bedd] uppercase tracking-widest">or</span>
              <div className="flex-1 h-[1px] bg-outline-variant/60 dark:bg-[#3a2d58]"></div>
            </div>

            <button 
              onClick={() => {
                setIsPartnerLogin(true);
                setErrorMsg('');
              }}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white hover:opacity-95 shadow-md shadow-primary/20 transition-opacity flex items-center justify-center gap-2 font-bold text-sm"
            >
              <Heart className="w-4 h-4 fill-current" />
              Login as Partner ❤️
            </button>
          </div>
        ) : (
          // Partner Login Form
          <form onSubmit={handlePartnerSubmit} className="w-full flex flex-col gap-4 text-left">
            <div>
              <label htmlFor="partnerCode" className="block text-xs font-bold text-[#3d3050] dark:text-[#c8bedd] uppercase tracking-wider mb-2">
                Partner Connection Code
              </label>
              <input
                type="text"
                id="partnerCode"
                placeholder="e.g. NYRA-82941"
                value={partnerCode}
                onChange={(e) => {
                  setPartnerCode(e.target.value);
                  setErrorMsg('');
                }}
                className="w-full px-4 py-3 rounded-2xl border border-outline-variant dark:border-[#3a2d58] focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-base font-semibold bg-white/80 dark:bg-[#1c1230] text-[#18003d] dark:text-[#eee6ff] dark:placeholder-[#8a7fa0]"
              />
            </div>

            {errorMsg && (
              <p className="text-xs text-error font-semibold pl-1">{errorMsg}</p>
            )}

            <button
              type="submit"
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white hover:opacity-95 shadow-md shadow-primary/20 transition-opacity flex items-center justify-center gap-2 font-bold text-sm mt-2"
            >
              Connect Partner View <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-center mt-4">
              <button 
                type="button"
                onClick={() => {
                  setIsPartnerLogin(false);
                  setErrorMsg('');
                }}
                className="text-xs text-primary dark:text-[#d4b8ff] font-semibold hover:underline flex items-center justify-center gap-1 mx-auto"
              >
                <User className="w-3.5 h-3.5" /> Back to User Login
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 flex items-center gap-2 text-xs text-[#3d3050] dark:text-[#c8bedd] font-medium">
          <ShieldCheck className="w-4 h-4 text-primary dark:text-[#d4b8ff]" />
          <span>Clinical grade security. Encrypted end-to-end.</span>
        </div>

      </motion.div>
    </div>
  );
}
