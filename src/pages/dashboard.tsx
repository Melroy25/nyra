import React from 'react';
import { useRouter } from 'next/router';
import { Sparkles, Calendar, Heart, PlusCircle, Smile, Activity, MessageCircle, Leaf, Zap, Moon, HeartPulse, ArrowRight } from 'lucide-react';
import { useStore } from '../store/useStore';
import { motion } from 'framer-motion';

export default function DashboardPage() {
  const router = useRouter();
  
  // Fetch values from Zustand store
  const { 
    onboardingData, 
    currentCycleDay, 
    currentCyclePhase, 
    nextPeriodDaysLeft,
    cycleLogs
  } = useStore();

  const name = onboardingData.name || 'Sarah';

  // Quick actions layout
  const quickActions = [
    { label: 'Track Period', icon: PlusCircle, path: '/cycle',    color: 'text-primary',   iconBg: 'bg-primary/10 dark:bg-primary/20' },
    { label: 'Log Mood',     icon: Smile,      path: '/mood',     color: 'text-tertiary',  iconBg: 'bg-tertiary/10 dark:bg-tertiary/20' },
    { label: 'Symptoms',     icon: Activity,   path: '/symptoms', color: 'text-secondary', iconBg: 'bg-secondary/10 dark:bg-secondary/20' },
    { label: 'Ask AI',       icon: MessageCircle, path: '/ai',   color: 'text-primary',   iconBg: 'bg-primary/10 dark:bg-primary/20' },
    { label: 'Self Care',    icon: Leaf,       path: '/selfcare', color: 'text-[#a0517a]', iconBg: 'bg-[#a0517a]/10 dark:bg-[#a0517a]/20' },
  ];

  // Helper to retrieve today's log entries for energy/sleep
  const todayStr = new Date().toISOString().split('T')[0];
  const todayLog = cycleLogs.find((l) => l.date === todayStr);

  const stats = [
    { label: 'Mood',     value: todayLog?.mood || 'Balanced', icon: Smile,       bg: 'bg-tertiary/12 dark:bg-[#a0517a]/25',  color: 'text-tertiary dark:text-[#ffaeda]' },
    { label: 'Energy',   value: 'High',                        icon: Zap,         bg: 'bg-primary/12 dark:bg-[#7c5cbf]/25',   color: 'text-primary dark:text-[#d4b8ff]' },
    { label: 'Sleep',    value: '7h 30m',                      icon: Moon,        bg: 'bg-secondary/12 dark:bg-[#7b5ea7]/25', color: 'text-secondary dark:text-[#ccbeff]' },
    { label: 'Symptoms', value: todayLog?.symptoms?.length ? todayLog.symptoms.join(', ') : 'Mild Cramps', icon: HeartPulse, bg: 'bg-on-surface/8 dark:bg-white/8', color: 'text-on-surface dark:text-[#eee6ff]' },
  ];

  return (
    <div className="max-w-[1200px] mx-auto px-container-padding-mobile md:px-container-padding-desktop pt-stack-md pb-12">
      
      {/* Welcome Greeting */}
      <section className="mb-stack-lg animate-entrance">
        <h1 className="font-serif font-bold text-3xl md:text-5xl text-[#18003d] dark:text-[#eee6ff] mb-unit">
          Good Morning {name} 🌸
        </h1>
        <p className="text-sm text-[#3d3050] dark:text-[#c8bedd]">Here is your wellness overview for today.</p>
      </section>

      {/* Bento Layout Row */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter mb-stack-lg">
        
        {/* Cycle Card Widget */}
        <div className="md:col-span-8 glass-card rounded-xl p-6 md:p-8 relative overflow-hidden flex flex-col justify-between min-h-[300px]">
          {/* Nebula decorative glow */}
          <div className="absolute -right-12 -top-12 w-64 h-64 bg-primary-fixed/30 rounded-full blur-3xl"></div>
          
          <div className="z-10 flex justify-between items-start mb-6">
            <div>
              <span className="font-bold text-xs text-primary uppercase tracking-wider block mb-1">Current Phase</span>
              <h2 className="font-serif font-bold text-3xl md:text-5xl text-[#18003d] dark:text-[#eee6ff]">{currentCyclePhase}</h2>
            </div>
            <div className="bg-white/60 dark:bg-white/10 text-[#18003d] dark:text-[#eee6ff] px-4 py-2 rounded-xl font-bold text-xs border border-white/50 dark:border-white/15 shadow-sm">
              Cycle Day {currentCycleDay}
            </div>
          </div>

          <div className="z-10 mt-auto">
            <div className="flex items-center gap-4">
              {/* Progress Ring Widget */}
              <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path 
                    className="text-surface-dim" 
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="3.5"
                  ></path>
                  <motion.path 
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: Math.max(0.01, (cycleLogs.length / 30) || 0.6) }}
                    transition={{ duration: 1 }}
                    className="text-primary" 
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeDasharray="100, 100" 
                    strokeLinecap="round" 
                    strokeWidth="3.5"
                  ></motion.path>
                </svg>
                <Calendar className="absolute text-primary w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#3d3050] dark:text-[#c8bedd] uppercase tracking-wider block">Next Period In</span>
                <span className="font-serif font-bold text-2xl text-[#18003d] dark:text-[#eee6ff]">{nextPeriodDaysLeft} Days</span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Insight Card Widget */}
        <div className="md:col-span-4 glass-card rounded-2xl p-6 md:p-8 ai-glow flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 text-tertiary">
              <Sparkles className="w-5 h-5 text-tertiary animate-pulse" />
              <span className="font-bold text-sm text-tertiary">Nyra Insight</span>
            </div>
            <p className="text-base text-[#18003d] dark:text-[#eee6ff] italic leading-relaxed">
              &quot;Based on your previous cycles, you may experience lower energy tomorrow. Sync in with a light routine today.&quot;
            </p>
          </div>
          <div className="mt-6">
            <button
              onClick={() => router.push('/ai')}
              className="w-full py-3 rounded-2xl border border-tertiary/30 text-tertiary font-bold text-xs hover:bg-tertiary/10 transition-colors flex items-center justify-center gap-2"
            >
              Ask Nyra AI <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* Quick Actions Shortcuts */}
      <section className="mb-stack-lg">
        <h3 className="section-label mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          {quickActions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <button 
                key={idx}
                onClick={() => router.push(action.path)}
                className="glass-card px-5 py-3 rounded-2xl flex items-center gap-2.5 text-on-surface dark:text-[#eee6ff] hover:bg-white/80 dark:hover:bg-white/10 active:scale-95 transition-all text-sm font-semibold border border-white/50 dark:border-[#3a2d58]/60 shadow-sm"
              >
                <span className={`w-7 h-7 rounded-xl flex items-center justify-center ${action.iconBg}`}>
                  <Icon className={`w-3.5 h-3.5 ${action.color}`} />
                </span>
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Daily Summary Bento Grid */}
      <section className="mb-stack-lg">
        <h3 className="section-label mb-4">Daily Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div 
                key={idx} 
                className="glass-card rounded-2xl p-5 flex flex-col items-center text-center hover:scale-[1.02] transition-transform duration-300 border border-white/40 dark:border-[#3a2d58]/50 shadow-sm"
              >
                <div className={`icon-badge ${stat.bg} mb-3 ${stat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-on-surface-variant dark:text-[#c8bedd] uppercase tracking-wider block mb-1">{stat.label}</span>
                <span className="text-sm font-bold text-on-surface dark:text-[#eee6ff] line-clamp-1">{stat.value}</span>
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
}
