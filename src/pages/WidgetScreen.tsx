import React, { useEffect, useState } from 'react';
import { useNyraStore } from '../store/useNyraStore';
import { getCyclePhaseInfo } from '../utils/cycleHelpers';
import { formatDate } from '../data/mockData';
import { Plus, Minus, Droplet, Heart, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import type { MoodType } from '../types';

export const WidgetScreen: React.FC = () => {
  const { profile, logs, cycles, addWaterCup, removeWaterCup, addOrUpdateLog } = useNyraStore();
  const [widgetType, setWidgetType] = useState<'cycle' | 'water' | 'symptoms'>('cycle');

  const todayStr = formatDate(new Date());
  const todayLog = logs.find((l) => l.date === todayStr);

  const cycleInfo = getCyclePhaseInfo(
    todayStr,
    cycles,
    profile.avgCycleLength,
    profile.avgPeriodLength
  );

  // Parse query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get('widget');
    if (type === 'water') {
      setWidgetType('water');
    } else if (type === 'symptoms') {
      setWidgetType('symptoms');
    } else {
      setWidgetType('cycle');
    }
  }, []);

  const handleAddWater = () => {
    addWaterCup(todayStr);
  };

  const handleRemoveWater = () => {
    removeWaterCup(todayStr);
  };

  const handleLogMood = (mood: MoodType) => {
    const currentLog = todayLog || {
      date: todayStr,
      mood: 'Calm',
      symptoms: [],
      cravings: [],
      flow: 'None',
      energy: 3,
      sleep: 8,
      hydration: 0,
      notes: ''
    };
    addOrUpdateLog({
      ...currentLog,
      mood
    });
  };

  // Determine theme color for active cycle phase
  const getPhaseTheme = () => {
    switch (cycleInfo.phaseName) {
      case 'Menstrual':
        return {
          bg: 'from-pink-500/15 to-rose-500/5',
          text: 'text-rose-500',
          accent: '#F43F5E',
          glow: 'rgba(244, 63, 94, 0.2)'
        };
      case 'Follicular':
        return {
          bg: 'from-purple-500/15 to-indigo-500/5',
          text: 'text-primary',
          accent: '#A78BFA',
          glow: 'rgba(167, 139, 250, 0.2)'
        };
      case 'Ovulatory':
        return {
          bg: 'from-amber-400/15 to-pink-500/5',
          text: 'text-amber-600',
          accent: '#F59E0B',
          glow: 'rgba(245, 158, 11, 0.2)'
        };
      case 'Luteal':
        return {
          bg: 'from-indigo-500/15 to-purple-500/5',
          text: 'text-indigo-600',
          accent: '#6366F1',
          glow: 'rgba(99, 102, 241, 0.2)'
        };
    }
  };

  const theme = getPhaseTheme();

  // Ring progress math
  const strokeDash = 2 * Math.PI * 52; // circumference for r=52
  const progressPercent = (cycleInfo.cycleDay / profile.avgCycleLength) * 100;
  const strokeOffset = strokeDash - (progressPercent / 100) * strokeDash;

  if (widgetType === 'water') {
    const hydration = todayLog ? todayLog.hydration || 0 : 0;
    const goal = profile.hydrationGoal || 8;
    const isGoalMet = hydration >= goal;
    const fillPercent = Math.min(100, (hydration / goal) * 100);

    return (
      <div className="w-full h-screen flex items-center justify-center p-3 bg-transparent">
        <div className="w-full max-w-[280px] aspect-square rounded-[32px] bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl border border-purple-100/50 dark:border-white/10 shadow-lg p-4 flex flex-col justify-between items-center relative overflow-hidden select-none">
          {/* Glass Fill Animation Background */}
          <div 
            className="absolute bottom-0 left-0 right-0 bg-blue-400/10 dark:bg-blue-500/10 transition-all duration-700 ease-out"
            style={{ height: `${fillPercent}%` }}
          />

          <div className="w-full flex justify-between items-center z-10">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Hydration</span>
            <Droplet className={`w-4 h-4 ${isGoalMet ? 'text-blue-500 fill-blue-500/20' : 'text-blue-400'}`} />
          </div>

          <div className="flex flex-col items-center z-10 my-auto">
            <span className="text-4xl font-black text-textpurple dark:text-purple-100 tracking-tight leading-none">
              {hydration}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-1">
              of {goal} cups today
            </span>
          </div>

          <div className="w-full flex gap-3 z-10">
            <button
              onClick={handleRemoveWater}
              className="flex-1 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 font-bold text-sm flex items-center justify-center transition-all cursor-pointer border border-slate-200/30 dark:border-white/5 active:scale-95"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleAddWater}
              className="flex-1 py-2 rounded-2xl bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center transition-all cursor-pointer shadow-md shadow-blue-500/20 dark:shadow-none active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (widgetType === 'symptoms') {
    const currentMood = todayLog ? todayLog.mood : 'Calm';
    const moods = [
      { emoji: '😌', name: 'Calm' as const, color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' },
      { emoji: '😊', name: 'Happy' as const, color: 'bg-amber-500/10 border-amber-500/20 text-amber-600' },
      { emoji: '🥺', name: 'Emotional' as const, color: 'bg-pink-500/10 border-pink-500/20 text-pink-600' },
      { emoji: '😰', name: 'Anxious' as const, color: 'bg-purple-500/10 border-purple-500/20 text-purple-600' },
      { emoji: '😠', name: 'Irritated' as const, color: 'bg-rose-500/10 border-rose-500/20 text-rose-600' }
    ];

    return (
      <div className="w-full h-screen flex items-center justify-center p-3 bg-transparent">
        <div className="w-full max-w-[280px] aspect-square rounded-[32px] bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl border border-purple-100/50 dark:border-white/10 shadow-lg p-4 flex flex-col justify-between items-center relative select-none">
          <div className="w-full flex justify-between items-center">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Mood Logger</span>
            <Heart className="w-4 h-4 text-rose-400 fill-rose-400/20" />
          </div>

          <div className="flex flex-col items-center my-auto">
            <span className="text-2xl font-extrabold text-textpurple dark:text-purple-100">
              How are you feeling?
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-1">
              Currently: {currentMood || 'Not logged'}
            </span>
          </div>

          <div className="w-full flex justify-between gap-1.5 overflow-x-auto py-1">
            {moods.map((m) => {
              const isSelected = currentMood === m.name;
              return (
                <button
                  key={m.name}
                  onClick={() => handleLogMood(m.name)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all cursor-pointer active:scale-90 ${
                    isSelected 
                      ? 'bg-primary border border-primary text-white scale-110 shadow-sm shadow-primary/20' 
                      : 'bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 border border-purple-100/30 dark:border-white/5'
                  }`}
                  title={m.name}
                >
                  {m.emoji}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Default: Cycle status Widget
  return (
    <div className="w-full h-screen flex items-center justify-center p-3 bg-transparent">
      <div className="w-full max-w-[280px] aspect-square rounded-[32px] bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl border border-purple-100/50 dark:border-white/10 shadow-lg p-4 flex flex-col justify-between items-center relative overflow-hidden select-none">
        
        {/* Glow behind the ring */}
        <div 
          className="absolute w-28 h-28 rounded-full blur-2xl -z-10 transition-all duration-1000"
          style={{ 
            backgroundColor: theme.glow,
            left: 'calc(50% - 56px)',
            top: 'calc(50% - 56px)'
          }}
        />

        <div className="w-full flex justify-between items-center">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Cycle Day</span>
          <Sparkles className="w-4 h-4 text-primary" />
        </div>

        {/* Compact Cycle Progress Ring */}
        <div className="relative w-28 h-28 flex items-center justify-center my-auto">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="56"
              cy="56"
              r="52"
              className="stroke-purple-50/50 dark:stroke-white/5 fill-none"
              strokeWidth="8"
            />
            <motion.circle
              cx="56"
              cy="56"
              r="52"
              className="fill-none"
              stroke={theme.accent}
              strokeWidth="8"
              strokeDasharray={strokeDash}
              initial={{ strokeDashoffset: strokeDash }}
              animate={{ strokeDashoffset: strokeOffset }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              strokeLinecap="round"
            />
          </svg>

          {/* Center text */}
          <div className="absolute flex flex-col items-center text-center">
            <span className="text-[8px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-500 leading-none">Day</span>
            <span className="text-2xl font-black text-textpurple dark:text-purple-100 leading-tight my-0.5">{cycleInfo.cycleDay}</span>
            <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded-full bg-purple-50 dark:bg-purple-950/50 ${theme.text}`}>
              {cycleInfo.phaseName}
            </span>
          </div>
        </div>

        <div className="w-full text-center">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
            {cycleInfo.phaseEmoji} Period starts in {cycleInfo.daysUntilNextPeriod}d
          </span>
        </div>
      </div>
    </div>
  );
};
