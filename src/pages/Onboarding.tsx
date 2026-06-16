import React, { useState } from 'react';
import { useNyraStore } from '../store/useNyraStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Smile, Apple, Sparkles, ChevronRight, ChevronLeft, User, Heart, Settings, Sun, Moon } from 'lucide-react';

export const Onboarding: React.FC = () => {
  const { completeOnboarding, darkMode, toggleDarkMode } = useNyraStore();
  const [step, setStep] = useState(0);
  
  // Profile settings state
  const [name, setName] = useState('Aria');
  const [age, setAge] = useState(26);
  const [cycleLength, setCycleLength] = useState(28);
  const [periodLength, setPeriodLength] = useState(5);

  const getPastDateStr = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [lastPeriodStart, setLastPeriodStart] = useState(getPastDateStr(12));
  const [lastPeriodEnd, setLastPeriodEnd] = useState(getPastDateStr(8));

  const slides = [
    {
      title: 'Track Your Cycle',
      desc: 'Get precise predictions for your period, ovulation, and fertile windows. Watch your cycle ring change phases daily.',
      icon: Calendar,
      color: 'text-primary bg-primary/10 border-primary/20',
      element: (
        <div className="w-full p-4 rounded-2xl bg-white border border-purple-100/50 shadow-sm flex flex-col gap-3">
          <div className="flex justify-between items-center pb-2 border-b border-purple-50">
            <span className="text-xs font-semibold text-textpurple">Predicted Cycle</span>
            <span className="text-[10px] text-primary font-bold px-2 py-0.5 rounded-full bg-primary/10">Follicular</span>
          </div>
          <div className="grid grid-cols-7 gap-1.5 text-center text-[10px]">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <span key={i} className="text-slate-400 font-semibold">{d}</span>
            ))}
            {Array.from({ length: 14 }).map((_, i) => {
              const dayNum = i + 8;
              const isPeriod = dayNum >= 8 && dayNum <= 12;
              const isOvulation = dayNum === 21;
              return (
                <div 
                  key={i} 
                  className={`py-1.5 rounded-lg flex flex-col items-center justify-center font-bold ${
                    isPeriod ? 'bg-accent/20 text-accent' : 
                    isOvulation ? 'bg-primary/20 text-primary border border-primary/40' : 'text-textpurple'
                  }`}
                >
                  {dayNum}
                </div>
              );
            })}
          </div>
        </div>
      )
    },
    {
      title: 'Understand Symptoms',
      desc: 'Log daily check-ins like mood, symptoms, cravings, and flow. Nyra charts will reveal patterns and triggers over time.',
      icon: Smile,
      color: 'text-accent bg-accent/10 border-accent/20',
      element: (
        <div className="w-full flex flex-col gap-2.5">
          <div className="flex gap-2">
            <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 flex-1 text-center">😊 Calm</span>
            <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-accent/15 text-accent border border-accent/20 flex-1 text-center">🍫 Chocolate</span>
          </div>
          <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-textpurple">Bloating</span>
            <span className="text-[9px] font-semibold px-2 py-0.5 bg-slate-200 text-slate-500 rounded">Moderate</span>
          </div>
          <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-textpurple">Cramps</span>
            <span className="text-[9px] font-semibold px-2 py-0.5 bg-accent/20 text-accent rounded font-bold">Logged</span>
          </div>
        </div>
      )
    },
    {
      title: 'Personalized Nutrition',
      desc: 'Receive cycle-based advice on what foods support your body today and what to avoid, helping keep your hormones in balance.',
      icon: Apple,
      color: 'text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/25',
      element: (
        <div className="w-full p-4 rounded-2xl bg-white border border-purple-100/50 shadow-sm flex flex-col gap-2 text-left">
          <p className="text-xs font-bold text-textpurple">Optimal Foods For You Today:</p>
          <div className="space-y-1.5 text-[11px] text-slate-500 mt-1">
            <p className="flex items-center gap-1.5"><span className="text-emerald-400">✔</span> Salmon, Leafy greens, Almonds</p>
            <p className="flex items-center gap-1.5"><span className="text-emerald-400">✔</span> Warm herbal teas (Ginger, Mint)</p>
          </div>
          <p className="text-xs font-bold text-textpurple mt-2">Minimize:</p>
          <p className="text-[11px] text-slate-400 flex items-center gap-1.5"><span className="text-rose-300">✖</span> Excess caffeine & salty processed foods</p>
        </div>
      )
    },
    {
      title: 'AI Wellness Assistant',
      desc: 'Ask Nyra anything! From hormonal analysis of sudden sugar cravings to suggestions for lowering period cramps naturally.',
      icon: Sparkles,
      color: 'text-purple-400 bg-purple-50 dark:bg-primary/10 border-purple-100 dark:border-primary/20',
      element: (
        <div className="w-full flex flex-col gap-2 text-left">
          <div className="p-2.5 rounded-2xl bg-purple-50 dark:bg-white/5 text-[10px] text-textpurple self-start max-w-[80%] rounded-tl-none border border-purple-100 dark:border-white/10">
            Why am I craving chocolate 3 days before my period?
          </div>
          <div className="p-2.5 rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 dark:from-primary/20 dark:to-accent/20 text-[10px] text-textpurple self-end max-w-[80%] rounded-tr-none border border-purple-100/40 dark:border-white/10">
            Your progesterone is peaking, which can drop blood sugar and serotonin. Chocolate contains magnesium which your body is naturally seeking!
          </div>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (step < slides.length) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleFinish = () => {
    if (!name.trim()) return;
    completeOnboarding(name, age, cycleLength, periodLength, lastPeriodStart, lastPeriodEnd);
  };

  const currentSlide = slides[step];

  // Slide variants for smooth animation
  const slideVariants = {
    initial: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
    animate: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
  };

  const [dir, setDir] = useState(1);

  const setNextStep = () => {
    setDir(1);
    handleNext();
  };

  const setPrevStep = () => {
    setDir(-dir);
    handleBack();
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-gradient-to-b from-white via-bgsoft to-purple-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950/25 h-full overflow-y-auto">
      {/* Top Header */}
      <div className="flex justify-between items-center py-2">
        <span className="font-serif text-lg font-bold tracking-tight text-textpurple">Welcome to Nyra</span>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-400">Step {step + 1} of {slides.length + 1}</span>
          <button 
            onClick={toggleDarkMode}
            className="w-8 h-8 rounded-full bg-purple-50 dark:bg-white/10 flex items-center justify-center text-textpurple dark:text-slate-300 hover:bg-purple-100 dark:hover:bg-white/20 transition-colors cursor-pointer"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <Sun className="w-4.5 h-4.5 text-amber-500 fill-amber-500" /> : <Moon className="w-4.5 h-4.5" />}
          </button>
        </div>
      </div>

      <div className="my-auto py-4 flex flex-col items-center">
        <AnimatePresence mode="wait" custom={dir}>
          {step < slides.length ? (
            <motion.div
              key={step}
              custom={dir}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              className="w-full flex flex-col items-center text-center"
            >
              {/* Illustration Shell */}
              <div className="relative w-44 h-44 flex items-center justify-center mb-6">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-accent/20 rounded-full blur-xl animate-pulse-ring"></div>
                <div className={`w-28 h-28 rounded-[28px] border flex items-center justify-center shadow-md relative z-10 bg-white ${currentSlide.color}`}>
                  <currentSlide.icon className="w-12 h-12" />
                </div>
              </div>

              <h2 className="text-xl font-bold font-serif text-textpurple mb-2">{currentSlide.title}</h2>
              <p className="text-xs text-slate-500 leading-relaxed max-w-sm mb-6">{currentSlide.desc}</p>
              
              {/* Interactive Sandbox Example */}
              <div className="w-full max-w-sm">
                {currentSlide.element}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="setup"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="w-full text-left"
            >
              {/* Form header */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-primary to-accent text-white flex items-center justify-center shadow-md mx-auto mb-3">
                  <Settings className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold font-serif text-textpurple">Configure Your Cycle</h2>
                <p className="text-xs text-slate-400 mt-1">This configures Nyra to generate your personalized health prediction calendar.</p>
              </div>

              <div className="space-y-4.5 bg-white/70 backdrop-blur-md p-5 rounded-2xl border border-purple-100/50 shadow-sm">
                {/* Name */}
                <div>
                  <label className="block text-xs font-bold text-textpurple mb-1.5 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-primary" /> Your Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter name"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-purple-100 bg-white text-xs text-textpurple focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                {/* Last Period Start & End Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-textpurple mb-1">
                      Last Period Start
                    </label>
                    <input
                      type="date"
                      value={lastPeriodStart}
                      onChange={(e) => setLastPeriodStart(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-purple-100 bg-white text-[11px] text-textpurple focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-textpurple mb-1">
                      When It Ended
                    </label>
                    <input
                      type="date"
                      value={lastPeriodEnd}
                      onChange={(e) => setLastPeriodEnd(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-purple-100 bg-white text-[11px] text-textpurple focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                  </div>
                </div>

                {/* Age */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-textpurple">Your Age</label>
                    <span className="text-xs font-bold text-primary">{age} yrs</span>
                  </div>
                  <input
                    type="range"
                    min="14"
                    max="60"
                    value={age}
                    onChange={(e) => setAge(parseInt(e.target.value))}
                    className="w-full accent-primary bg-purple-100 dark:bg-purple-950/40 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Cycle Length */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-textpurple">Average Cycle Length</label>
                    <span className="text-xs font-bold text-primary">{cycleLength} days</span>
                  </div>
                  <input
                    type="range"
                    min="21"
                    max="40"
                    value={cycleLength}
                    onChange={(e) => setCycleLength(parseInt(e.target.value))}
                    className="w-full accent-primary bg-purple-100 dark:bg-purple-950/40 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400 mt-1">
                    <span>21 days</span>
                    <span>28 days (Avg)</span>
                    <span>40 days</span>
                  </div>
                </div>

                {/* Period Length */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-textpurple">Average Period Duration</label>
                    <span className="text-xs font-bold text-accent">{periodLength} days</span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="10"
                    value={periodLength}
                    onChange={(e) => setPeriodLength(parseInt(e.target.value))}
                    className="w-full accent-accent bg-pink-100 dark:bg-pink-950/40 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400 mt-1">
                    <span>3 days</span>
                    <span>5 days (Avg)</span>
                    <span>10 days</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between gap-4 mt-auto pt-6 border-t border-purple-50">
        <button
          onClick={setPrevStep}
          disabled={step === 0}
          className={`flex items-center gap-1 px-4 py-2.5 rounded-xl border border-purple-100 text-xs font-semibold text-textpurple bg-white transition-opacity ${
            step === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-purple-50'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        {/* Progress dots */}
        <div className="flex gap-1.5">
          {Array.from({ length: slides.length + 1 }).map((_, idx) => (
            <div 
              key={idx} 
              className={`h-1.5 rounded-full transition-all duration-300 ${
                step === idx ? 'w-5 bg-primary' : 'w-1.5 bg-slate-200'
              }`}
            />
          ))}
        </div>

        {step < slides.length ? (
          <button
            onClick={setNextStep}
            className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/95 shadow-md shadow-primary/10 cursor-pointer"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleFinish}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-xs font-bold hover:opacity-95 shadow-lg shadow-primary/20 cursor-pointer"
          >
            Launch Nyra
            <Heart className="w-4 h-4 fill-current animate-pulse" />
          </button>
        )}
      </div>
    </div>
  );
};
