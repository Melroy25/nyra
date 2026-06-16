import React, { useState } from 'react';
import { useNyraStore } from '../store/useNyraStore';
import { getCyclePhaseInfo } from '../utils/cycleHelpers';
import { formatDate } from '../data/mockData';
import { CheckInModal } from '../components/CheckInModal';
import { Plus, Calendar, Moon, Sparkles, Heart } from 'lucide-react';
import { motion } from 'framer-motion';

export const Dashboard: React.FC = () => {
  const { profile, logs, cycles, addWaterCup, removeWaterCup, setView } = useNyraStore();
  const [showCheckIn, setShowCheckIn] = useState(false);

  const todayStr = formatDate(new Date());
  const todayLog = logs.find(l => l.date === todayStr);

  const cycleInfo = getCyclePhaseInfo(
    todayStr,
    cycles,
    profile.avgCycleLength,
    profile.avgPeriodLength
  );

  const handleAddWater = (e: React.MouseEvent) => {
    e.stopPropagation(); // prevent navigating to nutrition screen
    addWaterCup(todayStr);
  };

  const handleRemoveWater = (e: React.MouseEvent) => {
    e.stopPropagation(); // prevent navigating to nutrition screen
    removeWaterCup(todayStr);
  };

  // Determine theme color for active cycle phase
  const getPhaseTheme = () => {
    switch (cycleInfo.phaseName) {
      case 'Menstrual':
        return {
          bg: 'from-pink-500/20 to-rose-400/20',
          text: 'text-rose-500',
          border: 'border-rose-100',
          accent: '#F43F5E',
          ringGlow: 'shadow-rose-400/30'
        };
      case 'Follicular':
        return {
          bg: 'from-primary/20 to-secondary/20',
          text: 'text-primary',
          border: 'border-purple-100',
          accent: '#A78BFA',
          ringGlow: 'shadow-primary/30'
        };
      case 'Ovulatory':
        return {
          bg: 'from-amber-400/20 to-pink-400/20',
          text: 'text-amber-600',
          border: 'border-amber-100',
          accent: '#F59E0B',
          ringGlow: 'shadow-amber-400/30'
        };
      case 'Luteal':
        return {
          bg: 'from-indigo-500/20 to-purple-400/20',
          text: 'text-indigo-600',
          border: 'border-indigo-100',
          accent: '#6366F1',
          ringGlow: 'shadow-indigo-400/30'
        };
    }
  };

  const theme = getPhaseTheme();

  // Ring progress math (0-100)
  const strokeDash = 2 * Math.PI * 80; // circumference for r=80
  const progressPercent = (cycleInfo.cycleDay / profile.avgCycleLength) * 100;
  const strokeOffset = strokeDash - (progressPercent / 100) * strokeDash;

  return (
    <div className="flex-1 p-5 pt-[68px] space-y-5 pb-24">
      
      {/* Greeting Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold font-serif text-textpurple">Hello, {profile.name}</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {cycleInfo.phaseEmoji} {cycleInfo.phaseName} Phase • Day {cycleInfo.cycleDay}
          </p>
        </div>
        <button 
          onClick={() => setShowCheckIn(true)}
          className="text-xs font-semibold text-white bg-primary hover:bg-primary/95 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" /> Log Day
        </button>
      </div>

      {/* Rotating Glowing Cycle Ring Widget */}
      <div 
        className="w-full p-6 rounded-3xl bg-white/70 backdrop-blur-md border border-purple-100/50 shadow-sm flex flex-col items-center justify-center"
      >
        <div className="relative w-56 h-56 flex items-center justify-center">
          {/* Background Ring */}
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="112"
              cy="112"
              r="80"
              className="stroke-purple-50 fill-none"
              strokeWidth="12"
            />
            {/* Progress Stroke */}
            <motion.circle
              cx="112"
              cy="112"
              r="80"
              className="fill-none"
              stroke={theme.accent}
              strokeWidth="12"
              strokeDasharray={strokeDash}
              initial={{ strokeDashoffset: strokeDash }}
              animate={{ strokeDashoffset: strokeOffset }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              strokeLinecap="round"
            />
          </svg>

          {/* Central content */}
          <div className="absolute flex flex-col items-center text-center">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Day</span>
            <span className="text-4xl font-extrabold text-textpurple leading-none my-1">{cycleInfo.cycleDay}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 ${theme.text}`}>
              {cycleInfo.phaseName}
            </span>
            <span className="text-[9px] text-slate-400 mt-2 font-medium">
              Period starts in {cycleInfo.daysUntilNextPeriod}d
            </span>
          </div>

          {/* Glowing particle decorations around the ring */}
          <div className={`absolute w-44 h-44 rounded-full border border-dashed border-purple-200/50 -z-10 animate-pulse-ring`}></div>
        </div>

        <button 
          onClick={() => setShowCheckIn(true)}
          className="mt-3 flex items-center gap-1.5 text-xs text-primary font-semibold hover:opacity-85 cursor-pointer"
        >
          <span>{todayLog ? 'Edit today\'s log' : 'Log symptoms & flow'}</span>
          <span>→</span>
        </button>
      </div>

      {/* Daily Coach Insight Card */}
      <div className="p-4 rounded-2xl glass-card-dark border border-purple-100 flex gap-3.5 items-start">
        <div className="w-10 h-10 rounded-xl bg-white/95 flex items-center justify-center text-primary shrink-0 shadow-sm">
          <Sparkles className="w-5 h-5 fill-primary/10 text-primary" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-textpurple flex items-center gap-1.5">
            Daily Insights 
            {cycleInfo.isFertile && (
              <span className="text-[9px] bg-emerald-500 text-white font-bold px-1.5 py-0.5 rounded-full">Fertile Window</span>
            )}
          </h4>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{cycleInfo.insight}</p>
        </div>
      </div>

      {/* Logged Today Cravings/Symptoms Section */}
      {todayLog && (todayLog.cravings.length > 0 || todayLog.symptoms.length > 0) && (
        <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-purple-100/50 dark:border-white/10 shadow-xs flex flex-col gap-2">
          <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400">Logged Today</span>
          <div className="flex flex-wrap gap-1.5">
            {todayLog.cravings.map(c => (
              <span 
                key={c} 
                className="text-[10px] font-semibold bg-pink-500/10 text-pink-600 dark:text-pink-400 px-2.5 py-1 rounded-full border border-pink-500/20 flex items-center gap-1"
              >
                <span>🍕</span> {c} Craving
              </span>
            ))}
            {todayLog.symptoms.map(s => (
              <span 
                key={s} 
                className="text-[10px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 px-2.5 py-1 rounded-full border border-purple-500/20 flex items-center gap-1"
              >
                <span>⚡</span> {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Quick Health Telemetry Cards */}
      <div className="grid grid-cols-2 gap-4">
        
        {/* Mood Card */}
        <div 
          className="p-4 bg-white/70 backdrop-blur-md rounded-2xl border border-purple-100/50 shadow-xs flex flex-col justify-between min-h-[96px]"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Mood</span>
            <Heart className="w-4 h-4 text-accent" />
          </div>
          <div>
            <p className="text-sm font-bold text-textpurple mt-2">
              {todayLog ? `${todayLog.mood} ${todayLog.mood === 'Calm' ? '😌' : todayLog.mood === 'Happy' ? '😊' : todayLog.mood === 'Emotional' ? '🥺' : todayLog.mood === 'Sad' ? '😢' : todayLog.mood === 'Irritated' ? '😠' : '😰'}` : 'Not logged'}
            </p>
            <p className="text-[9px] text-slate-400 mt-1">Today's feeling</p>
          </div>
        </div>

        {/* Energy Card */}
        <div 
          className="p-4 bg-white/70 backdrop-blur-md rounded-2xl border border-purple-100/50 shadow-xs flex flex-col justify-between min-h-[96px]"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Energy</span>
            <span className="text-[10px] font-bold text-primary">
              {todayLog ? `${todayLog.energy}/5` : ''}
            </span>
          </div>
          <div>
            {todayLog ? (
              <div className="w-full bg-purple-100 h-1.5 rounded-full overflow-hidden mt-3">
                <div 
                  className="bg-primary h-full rounded-full" 
                  style={{ width: `${(todayLog.energy / 5) * 100}%` }}
                />
              </div>
            ) : (
              <p className="text-sm font-bold text-textpurple mt-2">Not logged</p>
            )}
            <p className="text-[9px] text-slate-400 mt-1">Estrogen: {cycleInfo.estrogenLevel}</p>
          </div>
        </div>

        {/* Sleep Card */}
        <div 
          className="p-4 bg-white/70 backdrop-blur-md rounded-2xl border border-purple-100/50 shadow-xs flex flex-col justify-between min-h-[96px]"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sleep</span>
            <Moon className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-textpurple mt-2">
              {todayLog ? `${todayLog.sleep.toFixed(1)} hours` : 'Not logged'}
            </p>
            <p className="text-[9px] text-slate-400 mt-1">Target: 8.0 hrs</p>
          </div>
        </div>

        {/* Hydration Card */}
        <div 
          onClick={() => setView('nutrition')}
          className="p-4 bg-white/70 backdrop-blur-md rounded-2xl border border-purple-100/50 shadow-xs hover:bg-white transition-all cursor-pointer flex flex-col justify-between min-h-[96px]"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Hydration</span>
            <div className="flex gap-1.5 items-center">
              <button 
                onClick={handleRemoveWater}
                className="w-6 h-6 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent flex items-center justify-center transition-colors cursor-pointer"
                title="Remove Cup"
              >
                <span className="font-bold text-xs leading-none">-</span>
              </button>
              <button 
                onClick={handleAddWater}
                className="w-6 h-6 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center transition-colors cursor-pointer"
                title="Add Cup"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div>
            <p className="text-sm font-bold text-textpurple mt-2">
              {todayLog ? `${todayLog.hydration || 0} cups` : '0 cups'}
            </p>
            <p className="text-[9px] text-slate-400 mt-1">Goal: {profile.hydrationGoal || 8} cups</p>
          </div>
        </div>

      </div>

      {/* Cycle Calendars Quick Widget */}
      <div 
        onClick={() => setView('analytics')}
        className="p-4 bg-white/70 backdrop-blur-md rounded-2xl border border-purple-100/50 shadow-sm hover:bg-white transition-all cursor-pointer flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-primary">
            <Calendar className="w-4.5 h-4.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold">Fertility & Period History</h4>
            <p className="text-[10px] text-slate-400 mt-0.5">Explore 6-month symptom correlations</p>
          </div>
        </div>
        <span className="text-slate-400 text-xs">→</span>
      </div>

      {/* Daily Check-In Modal */}
      <CheckInModal 
        isOpen={showCheckIn}
        onClose={() => setShowCheckIn(false)}
        dateStr={todayStr}
      />
    </div>
  );
};
