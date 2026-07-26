import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Sparkles, Calendar, Heart, Shield, Check, Sun, Moon, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { apiCompleteOnboarding } from '../lib/api';

export default function OnboardingPage() {
  const router = useRouter();
  const { onboardingStep, setOnboardingStep, onboardingData, updateOnboardingData, setUser, user, darkMode, toggleDarkMode } = useStore();
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleNext = async () => {
    setErrorMsg('');

    // Validate Step 1
    if (onboardingStep === 1) {
      if (!onboardingData.name.trim()) {
        setErrorMsg('Please enter your name to continue.');
        return;
      }
      if (!onboardingData.age || onboardingData.age < 10 || onboardingData.age > 60) {
        setErrorMsg('Please enter a valid age (10-60).');
        return;
      }
    }

    // Validate Step 2 — last period date is mandatory
    if (onboardingStep === 2) {
      if (!onboardingData.lastPeriodDate) {
        setErrorMsg('Please enter your last period start date. This is required for accurate predictions.');
        return;
      }
    }

    if (onboardingStep < 3) {
      setOnboardingStep(onboardingStep + 1);
    } else {
      // Step 3 complete — save to backend
      setIsSaving(true);
      try {
        const res = await apiCompleteOnboarding({
          name: onboardingData.name,
          age: onboardingData.age,
          dateOfBirth: onboardingData.dob,
          lastPeriodDate: onboardingData.lastPeriodDate,
          cycleLength: onboardingData.averageCycleLength,
          periodDuration: onboardingData.periodDuration,
          goals: onboardingData.goals,
        });

        if (res.user) {
          setUser({
            ...user,
            ...res.user,
            onboardingCompleted: true,
          });
        }

        router.push('/dashboard');
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to save your profile. Please try again.');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleBack = () => {
    setErrorMsg('');
    if (onboardingStep > 1) {
      setOnboardingStep(onboardingStep - 1);
    }
  };

  const goalsList = [
    { id: 'Track cycle', title: 'Track Menstrual Cycle', desc: 'Log flows, monitor regularity, and get predictions.' },
    { id: 'Improve nutrition', title: 'Improve Nutrition', desc: 'Sync meals and cravings with hormonal cycle phases.' },
    { id: 'Understand symptoms', title: 'Understand Symptoms', desc: 'Discover correlations between physical changes and hormones.' },
    { id: 'Improve wellness', title: 'Improve Wellness & Sleep', desc: 'Routines and sounds for restorative self-care.' },
    { id: 'Fertility tracking', title: 'Track Fertility Window', desc: 'Monitor ovulation peaks and fertile windows.' },
  ];

  const handleGoalToggle = (goalId: string) => {
    const currentGoals = onboardingData.goals;
    if (currentGoals.includes(goalId)) {
      updateOnboardingData({ goals: currentGoals.filter((g) => g !== goalId) });
    } else {
      updateOnboardingData({ goals: [...currentGoals, goalId] });
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

      {/* Background blobs */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-primary/15 dark:bg-primary/25 blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-tertiary/15 dark:bg-tertiary/25 blur-[120px]"></div>
      </div>

      <div className="relative z-10 w-full max-w-[500px] flex flex-col gap-6">
        
        {/* Progress Bar */}
        <div className="w-full flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs font-bold text-[#3d3050] dark:text-[#c8bedd] uppercase tracking-widest px-1">
            <span>Step {onboardingStep} of 3</span>
            <span>{Math.round((onboardingStep / 3) * 100)}%</span>
          </div>
          <div className="w-full h-2 bg-white/50 dark:bg-[#1c1230] border border-white/40 dark:border-[#3a2d58]/60 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300"
              style={{ width: `${(onboardingStep / 3) * 100}%` }}
            ></div>
          </div>
        </div>

        <motion.div 
          layout
          className="glass-card bg-white/70 dark:bg-[#16102a]/85 backdrop-blur-2xl border border-white/60 dark:border-[#3a2d58]/60 shadow-2xl rounded-2xl p-6 md:p-10"
        >
          <AnimatePresence mode="wait">
            {onboardingStep === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div>
                  <h1 className="font-serif font-bold text-2xl md:text-3xl text-[#18003d] dark:text-[#eee6ff] mb-2">Tell us about yourself 🌸</h1>
                  <p className="text-sm text-[#3d3050] dark:text-[#c8bedd] font-medium">We customize predictions based on your age and profile.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#3d3050] dark:text-[#c8bedd] uppercase tracking-wider mb-2">First Name</label>
                    <input 
                      type="text" 
                      value={onboardingData.name}
                      onChange={(e) => updateOnboardingData({ name: e.target.value })}
                      placeholder="Enter your name"
                      className="w-full px-4 py-3 rounded-2xl border border-outline-variant dark:border-[#3a2d58] focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-base font-semibold bg-white/80 dark:bg-[#1c1230] text-[#18003d] dark:text-[#eee6ff] placeholder-outline-variant/70 dark:placeholder-[#8a7fa0]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#3d3050] dark:text-[#c8bedd] uppercase tracking-wider mb-2">Age</label>
                      <input 
                        type="number" 
                        value={onboardingData.age || ''}
                        onChange={(e) => updateOnboardingData({ age: parseInt(e.target.value) || 0 })}
                        placeholder="Your age"
                        min="10"
                        max="60"
                        className="w-full px-4 py-3 rounded-2xl border border-outline-variant dark:border-[#3a2d58] focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-base font-semibold bg-white/80 dark:bg-[#1c1230] text-[#18003d] dark:text-[#eee6ff] placeholder-outline-variant/70 dark:placeholder-[#8a7fa0]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#3d3050] dark:text-[#c8bedd] uppercase tracking-wider mb-2">Date of Birth</label>
                      <input 
                        type="date" 
                        value={onboardingData.dob}
                        onChange={(e) => updateOnboardingData({ dob: e.target.value })}
                        className="w-full px-4 py-3 rounded-2xl border border-outline-variant dark:border-[#3a2d58] focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-base font-semibold bg-white/80 dark:bg-[#1c1230] text-[#18003d] dark:text-[#eee6ff]"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {onboardingStep === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div>
                  <h1 className="font-serif font-bold text-2xl md:text-3xl text-[#18003d] dark:text-[#eee6ff] mb-2">Your cycle rhythm 🩸</h1>
                  <p className="text-sm text-[#3d3050] dark:text-[#c8bedd] font-medium">Used to map your phases (Menstrual, Follicular, Ovulation, Luteal).</p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-[#3d3050] dark:text-[#c8bedd] uppercase tracking-wider mb-2">
                      Last Period Start Date <span className="text-red-500 ml-0.5">*</span>
                    </label>
                    <input 
                      type="date" 
                      value={onboardingData.lastPeriodDate}
                      onChange={(e) => updateOnboardingData({ lastPeriodDate: e.target.value })}
                      max={new Date().toISOString().split('T')[0]}
                      required
                      className={`w-full px-4 py-3 rounded-2xl border focus:ring-2 focus:ring-primary/20 outline-none text-base font-semibold bg-white/80 dark:bg-[#1c1230] text-[#18003d] dark:text-[#eee6ff] transition-colors ${
                        !onboardingData.lastPeriodDate 
                          ? 'border-red-300 dark:border-red-500/50' 
                          : 'border-outline-variant dark:border-[#3a2d58] focus:border-primary'
                      }`}
                    />
                    {!onboardingData.lastPeriodDate && (
                      <p className="text-xs text-red-500 font-semibold mt-1">Required for cycle predictions</p>
                    )}
                  </div>

                  {/* Clean styled slider 1 */}
                  <div className="bg-white/40 dark:bg-[#1c1230]/60 p-4 rounded-2xl border border-outline-variant/30 dark:border-[#3a2d58]/60 space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-[#3d3050] dark:text-[#c8bedd] uppercase tracking-wider">Average cycle length</label>
                      <span className="text-sm font-bold text-primary dark:text-[#d4b8ff] bg-primary/10 dark:bg-primary/20 px-3 py-1 rounded-xl">{onboardingData.averageCycleLength} Days</span>
                    </div>
                    <input 
                      type="range" 
                      min="21" 
                      max="40" 
                      value={onboardingData.averageCycleLength}
                      onChange={(e) => updateOnboardingData({ averageCycleLength: parseInt(e.target.value) })}
                      className="w-full h-2 bg-purple-200 dark:bg-[#3a2d58] rounded-lg appearance-none cursor-pointer accent-purple-600 dark:accent-purple-400 outline-none"
                    />
                    <div className="flex justify-between text-[11px] text-[#3d3050] dark:text-[#c8bedd] font-bold px-1">
                      <span>21 Days</span>
                      <span className="text-primary dark:text-[#d4b8ff]">28 Days (Avg)</span>
                      <span>40 Days</span>
                    </div>
                  </div>

                  {/* Clean styled slider 2 */}
                  <div className="bg-white/40 dark:bg-[#1c1230]/60 p-4 rounded-2xl border border-outline-variant/30 dark:border-[#3a2d58]/60 space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-[#3d3050] dark:text-[#c8bedd] uppercase tracking-wider">Average period duration</label>
                      <span className="text-sm font-bold text-primary dark:text-[#d4b8ff] bg-primary/10 dark:bg-primary/20 px-3 py-1 rounded-xl">{onboardingData.periodDuration} Days</span>
                    </div>
                    <input 
                      type="range" 
                      min="3" 
                      max="10" 
                      value={onboardingData.periodDuration}
                      onChange={(e) => updateOnboardingData({ periodDuration: parseInt(e.target.value) })}
                      className="w-full h-2 bg-purple-200 dark:bg-[#3a2d58] rounded-lg appearance-none cursor-pointer accent-purple-600 dark:accent-purple-400 outline-none"
                    />
                    <div className="flex justify-between text-[11px] text-[#3d3050] dark:text-[#c8bedd] font-bold px-1">
                      <span>3 Days</span>
                      <span className="text-primary dark:text-[#d4b8ff]">5 Days (Avg)</span>
                      <span>10 Days</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {onboardingStep === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div>
                  <h1 className="font-serif font-bold text-2xl md:text-3xl text-[#18003d] dark:text-[#eee6ff] mb-2">Configure goals 🎯</h1>
                  <p className="text-sm text-[#3d3050] dark:text-[#c8bedd] font-medium">Select what you would like to focus on inside Nyra.</p>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto no-scrollbar pr-1">
                  {goalsList.map((goal) => {
                    const isSelected = onboardingData.goals.includes(goal.id);
                    return (
                      <button
                        key={goal.id}
                        onClick={() => handleGoalToggle(goal.id)}
                        className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-primary/10 dark:bg-primary/20 border-primary dark:border-primary/60 shadow-sm'
                            : 'bg-white/40 dark:bg-[#1c1230]/60 border-outline-variant/60 dark:border-[#3a2d58]/60 hover:bg-white/70 dark:hover:bg-[#261d48]'
                        }`}
                      >
                        <div className="space-y-1 pr-4">
                          <h4 className="font-bold text-sm text-[#18003d] dark:text-[#eee6ff]">{goal.title}</h4>
                          <p className="text-xs text-[#3d3050] dark:text-[#c8bedd] leading-normal font-medium">{goal.desc}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-primary border-primary text-white' : 'border-outline-variant dark:border-[#3a2d58]'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error message */}
          {errorMsg && (
            <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-500/30">
              <p className="text-xs font-bold text-red-600 dark:text-red-400">{errorMsg}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 mt-8">
            {onboardingStep > 1 && (
              <button
                onClick={handleBack}
                disabled={isSaving}
                className="flex-1 py-3.5 rounded-2xl border border-outline-variant dark:border-[#3a2d58] hover:bg-white/30 dark:hover:bg-white/10 text-[#3d3050] dark:text-[#c8bedd] font-bold text-sm transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={isSaving}
              className="flex-[2] py-3.5 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white hover:opacity-95 shadow-md shadow-primary/20 transition-opacity font-bold text-sm flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              ) : onboardingStep === 3 ? 'Complete Setup 🌸' : 'Continue'}
            </button>
          </div>
        </motion.div>

        <div className="flex justify-center items-center gap-2 text-xs text-[#3d3050] dark:text-[#c8bedd] font-medium">
          <Shield className="w-4 h-4 text-primary dark:text-[#d4b8ff]" />
          <span>Your response shapes your insights, locked with strict privacy bounds.</span>
        </div>
      </div>
    </div>
  );
}
