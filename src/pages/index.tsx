import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Sparkles, Calendar, Apple, Smile, Heart, Shield, ArrowRight, CheckCircle, Sun, Moon } from 'lucide-react';
import { useStore } from '../store/useStore';
import { motion } from 'framer-motion';

export default function LandingPage() {
  const router = useRouter();
  const { user, darkMode, toggleDarkMode } = useStore();

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('nyra_token');
      const cachedStr = localStorage.getItem('nyra_cached_user');
      let cachedUser = null;
      if (cachedStr) {
        try { cachedUser = JSON.parse(cachedStr); } catch (e) {}
      }
      const currentUser = user || cachedUser;
      if (token && currentUser) {
        if (currentUser.role === 'partner') {
          router.replace('/partner');
        } else {
          router.replace('/dashboard');
        }
      }
    }
  }, [user, router]);

  const features = [
    {
      title: 'AI Health Assistant',
      desc: 'Personalized insights adapting to your unique cycle, sleep patterns, and daily inputs. Ask Nyra anything about your wellness.',
      icon: Sparkles,
      color: 'text-primary bg-primary/10 border border-primary/20',
      span: 'md:col-span-2',
    },
    {
      title: 'Cycle Tracking',
      desc: 'Precision tracking with predictive symptom analysis and fertility predictions.',
      icon: Calendar,
      color: 'text-secondary bg-secondary/10 border border-secondary/20',
      span: 'md:col-span-1',
    },
    {
      title: 'Nutrition Guidance',
      desc: 'Phase-specific recipes and dietary recommendations to support hormonal balance.',
      icon: Apple,
      color: 'text-tertiary bg-tertiary/10 border border-tertiary/20',
      span: 'md:col-span-1',
    },
    {
      title: 'Mood Insights',
      desc: 'Correlate emotional patterns with your biological rhythms and view monthly patterns.',
      icon: Smile,
      color: 'text-error bg-error/10 border border-error/20',
      span: 'md:col-span-1',
    },
    {
      title: 'Partner Support System',
      desc: 'Share updates securely and communicate privately with stickers and emoji reactions.',
      icon: Heart,
      color: 'text-primary bg-primary/10 border border-primary/20',
      span: 'md:col-span-1',
    },
  ];

  const benefits = [
    'Understand emotional changes before they occur',
    'Sync nutrition and exercise with your body rhythm',
    'Simulate private communication with partner code sync',
    'Receive suggestions from a specialized wellness companion',
  ];

  return (
    <div className="bg-nebula min-h-screen text-on-background relative overflow-x-hidden transition-colors duration-300">
      
      {/* Top Navigation bar */}
      <nav className="flex justify-between items-center w-full px-container-padding-mobile md:px-container-padding-desktop h-16 sticky top-0 z-50 bg-white/70 dark:bg-[#0d0818]/85 backdrop-blur-xl border-b border-white/40 dark:border-[#3a2d58]/60 shadow-sm transition-colors duration-300">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Nyra Logo" className="w-9 h-9 rounded-2xl object-cover shadow-sm border-2 border-primary/20" />
          <span className="font-serif font-bold text-xl text-primary dark:text-[#d4b8ff] tracking-tight">Nyra</span>
        </div>

        <div className="hidden md:flex items-center gap-gutter">
          <a href="#features" className="font-semibold text-xs text-[#3d3050] dark:text-[#c8bedd] hover:text-primary dark:hover:text-[#d4b8ff] transition-colors">Features</a>
          <a href="#benefits" className="font-semibold text-xs text-[#3d3050] dark:text-[#c8bedd] hover:text-primary dark:hover:text-[#d4b8ff] transition-colors">Benefits</a>
          <a href="#privacy" className="font-semibold text-xs text-[#3d3050] dark:text-[#c8bedd] hover:text-primary dark:hover:text-[#d4b8ff] transition-colors">Privacy</a>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-2 rounded-xl text-[#3d3050] dark:text-[#c8bedd] hover:text-primary dark:hover:text-[#d4b8ff] hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          <Link href="/login" className="font-semibold text-xs text-primary dark:text-[#d4b8ff] px-3 py-1.5 rounded-xl hover:bg-primary/10 transition-colors">
            Log In
          </Link>
          <Link href="/login" className="font-semibold text-xs bg-gradient-to-r from-primary to-secondary text-white px-4 sm:px-5 py-2 rounded-2xl hover:opacity-95 shadow-md shadow-primary/20 transition-all hover:scale-[1.02]">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex flex-col items-center justify-center px-container-padding-mobile md:px-container-padding-desktop pt-12 pb-16 overflow-hidden">
        <div className="max-w-4xl mx-auto text-center z-10 space-y-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-white/70 dark:bg-[#16102a]/80 border border-white/60 dark:border-[#3a2d58]/60 backdrop-blur-md shadow-sm"
          >
            <Sparkles className="text-tertiary w-4 h-4 animate-pulse" />
            <span className="font-bold text-xs text-[#3d3050] dark:text-[#c8bedd] uppercase tracking-wider">Your AI Health Companion</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-serif font-bold text-4xl md:text-6xl lg:text-7xl leading-tight text-[#18003d] dark:text-[#eee6ff]"
          >
            Understand Your Body. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-tertiary">Predict Your Needs.</span> <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-tertiary to-secondary">Feel Supported.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base md:text-xl text-[#3d3050] dark:text-[#c8bedd] max-w-2xl mx-auto font-medium"
          >
            Nyra is a personal AI companion that helps women track menstrual health, predict symptoms, improve nutrition, manage self-care routines, and coordinate private partner support.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <button 
              onClick={() => router.push('/login')}
              className="w-full sm:w-auto font-bold text-sm bg-gradient-to-r from-primary to-secondary text-white px-8 py-4 rounded-2xl hover:opacity-95 shadow-lg shadow-primary/20 hover:scale-[1.03] transition-all transform flex items-center justify-center gap-2"
            >
              Start Your Journey <ArrowRight className="w-4 h-4" />
            </button>
            <a 
              href="#features"
              className="w-full sm:w-auto font-bold text-sm text-[#3d3050] dark:text-[#c8bedd] border border-primary/30 dark:border-primary/40 bg-white/40 dark:bg-[#1c1230]/60 backdrop-blur-sm px-8 py-4 rounded-2xl hover:bg-white/80 dark:hover:bg-[#261d48] text-center transition-colors"
            >
              Explore Features
            </a>
          </motion.div>
        </div>

        {/* Abstract Illustration Area */}
        <div className="relative w-full max-w-5xl mx-auto mt-12 h-36 md:h-64 z-0">
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent z-10 h-full"></div>
          <div className="absolute inset-0 flex justify-center items-end opacity-30">
            <div className="w-64 h-64 md:w-96 md:h-96 rounded-full bg-gradient-to-tr from-primary to-tertiary blur-3xl"></div>
            <div className="absolute w-48 h-48 md:w-72 md:h-72 rounded-full bg-gradient-to-br from-secondary to-primary blur-2xl translate-x-20 -translate-y-10"></div>
          </div>
        </div>
      </section>

      {/* Main Sections */}
      <main className="max-w-[1200px] mx-auto px-container-padding-mobile md:px-container-padding-desktop pb-24 space-y-24">
        
        {/* Features Bento Grid */}
        <section id="features" className="scroll-mt-20">
          <div className="text-center mb-12">
            <h2 className="font-serif font-bold text-3xl md:text-5xl text-[#18003d] dark:text-[#eee6ff] mb-4">Holistic Wellness, Reimagined</h2>
            <p className="text-base md:text-lg text-[#3d3050] dark:text-[#c8bedd] font-medium">Everything you need to sync with your body's rhythm.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div key={idx} className={`glass-card bg-white/70 dark:bg-[#16102a]/80 border border-white/60 dark:border-[#3a2d58]/60 rounded-2xl p-8 flex flex-col justify-between group relative overflow-hidden transition-all duration-300 hover:shadow-md hover:scale-[1.01] ${feat.span}`}>
                  <div className="absolute -top-10 -left-10 w-32 h-32 bg-primary/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative z-10 space-y-4">
                    <div className={`w-12 h-12 rounded-2xl ${feat.color} flex items-center justify-center`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-serif font-semibold text-2xl text-[#18003d] dark:text-[#eee6ff]">{feat.title}</h3>
                    <p className="text-base text-[#3d3050] dark:text-[#c8bedd] leading-relaxed font-medium">{feat.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Benefits Section */}
        <section id="benefits" className="scroll-mt-20 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="font-serif font-bold text-3xl md:text-4xl text-[#18003d] dark:text-[#eee6ff] leading-tight">
              Designed to support you at every stage of your cycle
            </h2>
            <p className="text-base text-[#3d3050] dark:text-[#c8bedd] leading-relaxed font-medium">
              Nyra integrates clinical precision with an organic, high-end feel. It monitors your body patterns, calculates fertility and symptoms, and offers wellness support so you feel healthy and prepared.
            </p>
            <ul className="space-y-3 pt-2">
              {benefits.map((benefit, idx) => (
                <li key={idx} className="flex items-center gap-3 font-semibold text-sm text-[#18003d] dark:text-[#eee6ff]">
                  <CheckCircle className="text-primary dark:text-[#d4b8ff] w-5 h-5 shrink-0" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
          <div className="glass-card bg-white/70 dark:bg-[#16102a]/80 border border-white/60 dark:border-[#3a2d58]/60 rounded-2xl p-6 md:p-8 flex flex-col gap-6 relative overflow-hidden shadow-sm">
            <div className="absolute -right-12 -top-12 w-48 h-48 bg-tertiary/20 rounded-full blur-3xl"></div>
            <div className="flex justify-between items-center z-10 border-b border-black/8 dark:border-[#3a2d58]/60 pb-4">
              <div>
                <span className="font-bold text-xs text-primary uppercase tracking-wider">Current Rhythm</span>
                <h4 className="font-serif font-bold text-2xl text-[#18003d] dark:text-[#eee6ff]">Luteal Phase</h4>
              </div>
              <span className="bg-white/60 dark:bg-[#1c1230] text-[#18003d] dark:text-[#eee6ff] px-4 py-1.5 rounded-xl text-sm font-semibold border border-white/50 dark:border-[#3a2d58]/60 shadow-sm">Day 24</span>
            </div>
            <div className="space-y-4 z-10">
              <div className="flex justify-between text-sm">
                <span className="text-[#3d3050] dark:text-[#c8bedd] font-semibold">Expected Period</span>
                <span className="font-bold text-[#18003d] dark:text-[#eee6ff]">In 4 Days</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#3d3050] dark:text-[#c8bedd] font-semibold">Energy Level</span>
                <span className="text-tertiary font-bold">Low Energy</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#3d3050] dark:text-[#c8bedd] font-semibold">Craving</span>
                <span className="text-secondary font-bold">Chocolate</span>
              </div>
            </div>
            <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary/30 rounded-xl p-4 text-xs italic text-primary dark:text-[#d4b8ff] z-10 font-medium">
              &quot;Nyra AI Suggestion: Offer her extra emotional support and prepare a cozy warm evening at home.&quot;
            </div>
          </div>
        </section>

        {/* Privacy Section */}
        <section id="privacy" className="scroll-mt-20 glass-card bg-white/70 dark:bg-[#16102a]/80 border border-white/60 dark:border-[#3a2d58]/60 rounded-2xl p-8 md:p-12 relative overflow-hidden text-center max-w-4xl mx-auto shadow-sm">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-secondary/20 rounded-full blur-3xl"></div>
          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto text-primary dark:text-[#d4b8ff] border border-primary/20 shadow-inner">
              <Shield className="w-8 h-8" />
            </div>
            <h2 className="font-serif font-bold text-3xl text-[#18003d] dark:text-[#eee6ff]">Your Data is Secure and Private</h2>
            <p className="text-base text-[#3d3050] dark:text-[#c8bedd] leading-relaxed font-medium">
              We believe health data should remain personal. Nyra features military-grade encryption, doesn&apos;t sell logs to advertising trackers, and offers Anonymous Account logins. You control exactly what gets shared with your partner.
            </p>
          </div>
        </section>

        {/* Call to Action */}
        <section className="text-center bg-gradient-to-br from-primary/10 to-tertiary/10 dark:from-primary/20 dark:to-tertiary/20 rounded-2xl p-8 md:p-16 border border-white/60 dark:border-[#3a2d58]/60 space-y-6">
          <h2 className="font-serif font-bold text-3xl md:text-5xl text-[#18003d] dark:text-[#eee6ff]">Ready to sync with your rhythm?</h2>
          <p className="text-base md:text-lg text-[#3d3050] dark:text-[#c8bedd] max-w-xl mx-auto font-medium">
            Get personalized AI insights, smart logs, nutrition recommendations, and seamless partner pairing inside Nyra.
          </p>
          <button 
            onClick={() => router.push('/login')}
            className="font-bold text-sm bg-gradient-to-r from-primary to-secondary text-white px-8 py-4 rounded-2xl hover:opacity-95 shadow-lg shadow-primary/20 hover:scale-[1.03] transition-all"
          >
            Create Your Free Account
          </button>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-black/8 dark:border-[#3a2d58]/40 py-8 text-center text-xs text-[#3d3050] dark:text-[#c8bedd] font-medium">
        &copy; {new Date().getFullYear()} Nyra. All rights reserved. Built with clinical care and premium design.
      </footer>

    </div>
  );
}
