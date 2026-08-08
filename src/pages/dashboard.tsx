import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Sparkles, Calendar, Smile, Activity, Moon, HeartPulse, ArrowRight, Loader2, Droplet, Plus, RotateCcw, Clock, ChevronDown, ChevronUp, FileText, Trash2, HelpCircle, CheckCircle2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { motion } from 'framer-motion';
import { apiGetCycleMetrics } from '../lib/api';
import { getCycleDayDetails } from '../lib/cycleGuide';

export default function DashboardPage() {
  const router = useRouter();
  
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  // Fetch values from Zustand store
  const { user, cycleLogs, waterIntake, waterGoal, addWater, resetWater, deleteMoodLog, deleteSymptomLog, deletePeriodLog } = useStore();

  const name = isMounted && user?.name ? user.name : 'User';

  // Live backend cycle metrics with instant cache restoration after hydration
  const [cycleMetrics, setCycleMetrics] = useState<{
    currentDay: number;
    currentPhase: string;
    nextPeriodDaysLeft: number;
    cycleLength: number;
    todayMood: string | null;
    todaySymptoms: string[];
  } | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  // Mount effect — recalculate live metrics immediately on client
  useEffect(() => {
    recalculateCycleMetrics();
    setMetricsLoading(false);
  }, []);

  // Toggle states for "See More" (showing 5 items vs all)
  const [showAllMoods, setShowAllMoods] = useState(false);
  const [showAllSymptoms, setShowAllSymptoms] = useState(false);
  const [showAllPeriods, setShowAllPeriods] = useState(false);

  // Undo delete toast state with 5-second countdown
  const [pendingDelete, setPendingDelete] = useState<{
    type: 'mood' | 'symptom' | 'period';
    date: string;
    label: string;
    secondsLeft: number;
    timerId: any;
    intervalId: any;
  } | null>(null);

  const requestDelete = (type: 'mood' | 'symptom' | 'period', date: string, label: string) => {
    if (pendingDelete) {
      executeDelete(pendingDelete.type, pendingDelete.date);
      clearTimeout(pendingDelete.timerId);
      clearInterval(pendingDelete.intervalId);
    }

    let seconds = 5;

    const intervalId = setInterval(() => {
      seconds -= 1;
      if (seconds >= 0) {
        setPendingDelete((prev) => (prev ? { ...prev, secondsLeft: seconds } : null));
      }
    }, 1000);

    const timerId = setTimeout(() => {
      clearInterval(intervalId);
      executeDelete(type, date);
      setPendingDelete(null);
    }, 5000);

    setPendingDelete({
      type,
      date,
      label,
      secondsLeft: 5,
      timerId,
      intervalId,
    });
  };

  const executeDelete = (type: 'mood' | 'symptom' | 'period', date: string) => {
    if (type === 'mood') deleteMoodLog(date);
    if (type === 'symptom') deleteSymptomLog(date);
    if (type === 'period') deletePeriodLog(date);
  };

  const cancelDelete = () => {
    if (pendingDelete) {
      clearTimeout(pendingDelete.timerId);
      clearInterval(pendingDelete.intervalId);
      setPendingDelete(null);
    }
  };

  const storeDay = useStore((state) => state.currentCycleDay);
  const storePhase = useStore((state) => state.currentCyclePhase);
  const storeDaysLeft = useStore((state) => state.nextPeriodDaysLeft);
  const recalculateCycleMetrics = useStore((state) => state.recalculateCycleMetrics);

  // Recalculate metrics immediately when logs or user profile change
  useEffect(() => {
    recalculateCycleMetrics();
  }, [cycleLogs, user]);

  useEffect(() => {
    if (user?.id) {
      apiGetCycleMetrics()
        .then((data) => {
          if (data && data.currentDay) {
            setCycleMetrics(data);
          }
        })
        .catch((err) => {
          console.log('Cycle metrics fetch failed:', err);
        })
        .finally(() => setMetricsLoading(false));
    } else {
      setMetricsLoading(false);
    }
  }, [user?.id]);

  // Primary source of truth: store metrics (computed live from logs, matching Calendar page)
  const currentCycleDay = storeDay || cycleMetrics?.currentDay || 1;
  const currentCyclePhase = storePhase || cycleMetrics?.currentPhase || 'Follicular';
  const nextPeriodDaysLeft = storeDaysLeft || cycleMetrics?.nextPeriodDaysLeft || 28;

  // Compute today's mood and symptoms directly from cycleLogs for instant UI sync
  const todayIso = new Date().toISOString().split('T')[0];
  const todayLog = cycleLogs.find((l) => l.date === todayIso);
  const todayMood = todayLog?.mood || cycleMetrics?.todayMood;
  const todaySymptoms = (todayLog?.symptoms && todayLog.symptoms.length > 0) 
    ? todayLog.symptoms 
    : (cycleMetrics?.todaySymptoms ?? []);

  // Progress fraction for the ring
  const progressFraction = Math.max(0.02, currentCycleDay / (cycleMetrics?.cycleLength ?? 28));

  const featureToggles = useStore((state) => state.featureToggles);

  // Quick actions layout (Log Mood, Symptoms, Add Water)
  const quickActions = [
    featureToggles?.moodEnabled && { label: 'Log Mood', icon: Smile, path: '/mood', color: 'text-tertiary', iconBg: 'bg-tertiary/10 dark:bg-tertiary/20' },
    featureToggles?.symptomsEnabled && { label: 'Symptoms', icon: Activity, path: '/symptoms', color: 'text-secondary', iconBg: 'bg-secondary/10 dark:bg-secondary/20' },
    featureToggles?.waterEnabled && { label: 'Add Water', icon: Droplet, onClick: () => addWater(250), color: 'text-cyan-500', iconBg: 'bg-cyan-500/10 dark:bg-cyan-500/20' },
  ].filter(Boolean) as any[];

  const waterPercent = Math.min(100, Math.round((waterIntake / waterGoal) * 100));

  const stats = [
    featureToggles?.moodEnabled && { label: 'Mood', value: todayMood || 'Not logged', icon: Smile, bg: 'bg-tertiary/12 dark:bg-[#a0517a]/25', color: 'text-tertiary dark:text-[#ffaeda]' },
    featureToggles?.waterEnabled && { label: 'Water', value: `${waterIntake} / ${waterGoal} ml`, icon: Droplet, bg: 'bg-cyan-500/12 dark:bg-cyan-500/25', color: 'text-cyan-500 dark:text-cyan-400' },
    { label: 'Phase', value: currentCyclePhase, icon: Moon, bg: 'bg-secondary/12 dark:bg-[#7b5ea7]/25', color: 'text-secondary dark:text-[#ccbeff]' },
    featureToggles?.symptomsEnabled && { label: 'Symptoms', value: todaySymptoms.length ? todaySymptoms.slice(0, 2).join(', ') : 'None logged', icon: HeartPulse, bg: 'bg-on-surface/8 dark:bg-white/8', color: 'text-on-surface dark:text-[#eee6ff]' },
  ].filter(Boolean) as any[];

  // Insight message based on real phase
  const phaseInsight: Record<string, string> = {
    Menstrual: 'Your body is in renewal mode. Rest well, stay hydrated, and be gentle with yourself today.',
    Follicular: 'Energy is building! Great time to tackle goals, try new things, and socialise.',
    Ovulation: 'Peak energy and confidence! You may feel your best today — perfect for big plans.',
    Luteal: 'Your energy may dip slightly. Nourish yourself with warm foods and light movement.',
  };
  const insight = phaseInsight[currentCyclePhase] || 'Track your cycle daily to receive personalised insights.';

  // ── Mood Logs (Sorted newest first) ──
  const moodEmojiMap: Record<string, string> = {
    'Happy': '🌸', 'Calm': '🧘', 'Emotional': '💖', 'Anxious': '😰', 'Irritated': '😠', 'Sad': '🥺',
  };
  const allMoodLogs = [...cycleLogs]
    .filter((l) => l.mood !== null && !(pendingDelete?.type === 'mood' && pendingDelete?.date === l.date))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const displayedMoodLogs = showAllMoods ? allMoodLogs : allMoodLogs.slice(0, 5);

  // ── Symptom Logs (Sorted newest first) ──
  const allSymptomLogs = [...cycleLogs]
    .filter((l) => ((l.symptoms && l.symptoms.length > 0) || l.severity !== undefined) && !(pendingDelete?.type === 'symptom' && pendingDelete?.date === l.date))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const displayedSymptomLogs = showAllSymptoms ? allSymptomLogs : allSymptomLogs.slice(0, 5);

  // ── Period Logs (only explicitly user-logged entries) ──
  const periodLogs = [...cycleLogs]
    .filter((l) => l.isPeriod && !l.isPredicted && l.isUserLogged === true && !(pendingDelete?.type === 'period' && pendingDelete?.date === l.date))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const displayedPeriodLogs = showAllPeriods ? periodLogs : periodLogs.slice(0, 5);

  const formatDateLabel = (isoDate: string) => {
    try {
      return new Date(isoDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return isoDate;
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-container-padding-mobile md:px-container-padding-desktop pt-stack-md pb-16">
      
      {/* Welcome Greeting */}
      <section className="mb-stack-lg animate-entrance">
        <h1 className="font-serif font-bold text-3xl md:text-5xl text-[#18003d] dark:text-[#eee6ff] mb-unit">
          Good Morning {name}
        </h1>
        <p className="text-sm text-[#3d3050] dark:text-[#c8bedd]">Here is your wellness overview for today.</p>
      </section>

      {/* Bento Layout Row */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter mb-stack-lg">
        
        {/* Cycle Card Widget */}
        <div className="md:col-span-8 glass-card rounded-xl p-6 md:p-8 relative overflow-hidden flex flex-col justify-between min-h-[300px]">
          {/* Nebula decorative glow */}
          <div className="absolute -right-12 -top-12 w-64 h-64 bg-primary-fixed/30 rounded-full blur-3xl"></div>
          
          {metricsLoading ? (
            <div className="flex items-center justify-center flex-1 z-10">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : (
            <>
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
                        animate={{ pathLength: progressFraction }}
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
            </>
          )}
        </div>

        {/* AI Insight Card Widget */}
        <div className="md:col-span-4 glass-card rounded-2xl p-5 md:p-6 ai-glow flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 text-tertiary">
                <Sparkles className="w-5 h-5 text-tertiary animate-pulse" />
                <span className="font-bold text-sm text-tertiary">Nyra Cycle Insight</span>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-tertiary/10 text-tertiary border border-tertiary/20">
                {getCycleDayDetails(currentCycleDay, cycleMetrics?.cycleLength || 28).phaseEmoji} Day {currentCycleDay}
              </span>
            </div>

            {/* Quick summary headline */}
            <p className="text-xs font-bold text-[#18003d] dark:text-[#eee6ff] mb-3 leading-snug">
              {getCycleDayDetails(currentCycleDay, cycleMetrics?.cycleLength || 28).summary}
            </p>

            {/* 3 Clear Sections */}
            <div className="space-y-2.5 text-xs">
              {/* Section 1: Biological Process */}
              <div className="p-3 rounded-xl bg-white/50 dark:bg-[#16102a]/60 border border-black/5 dark:border-white/5 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-primary dark:text-[#d4b8ff]">
                  <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>What is happening?</span>
                </div>
                <p className="text-[#3d3050] dark:text-[#c8bedd] font-medium leading-relaxed text-[11px]">
                  {getCycleDayDetails(currentCycleDay, cycleMetrics?.cycleLength || 28).whatIsIt}
                </p>
              </div>

              {/* Section 2: Physical & Emotional Feeling */}
              <div className="p-3 rounded-xl bg-white/50 dark:bg-[#16102a]/60 border border-black/5 dark:border-white/5 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-secondary dark:text-[#ccbeff]">
                  <HeartPulse className="w-3.5 h-3.5 shrink-0" />
                  <span>How you might feel:</span>
                </div>
                <p className="text-[#3d3050] dark:text-[#c8bedd] font-medium leading-relaxed text-[11px]">
                  {getCycleDayDetails(currentCycleDay, cycleMetrics?.cycleLength || 28).howYouFeel}
                </p>
              </div>

              {/* Section 3: Recommended Actions */}
              <div className="p-3 rounded-xl bg-white/50 dark:bg-[#16102a]/60 border border-black/5 dark:border-white/5 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>What to do today:</span>
                </div>
                <ul className="space-y-1 text-[#3d3050] dark:text-[#c8bedd] font-medium text-[11px]">
                  {getCycleDayDetails(currentCycleDay, cycleMetrics?.cycleLength || 28).whatToDo.map((tip, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-primary font-bold">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5">
            <button
              onClick={() => router.push('/ai')}
              className="w-full py-2.5 rounded-2xl border border-tertiary/40 bg-tertiary/5 hover:bg-tertiary/15 text-tertiary font-bold text-xs transition-all flex items-center justify-center gap-2"
            >
              Ask Nyra AI for details <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* Quick Actions Shortcuts (Log Mood, Symptoms, Add Water) */}
      <section className="mb-stack-lg">
        <h3 className="section-label mb-4">Quick Actions</h3>
        <div className="grid grid-cols-3 gap-3">
          {quickActions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <button 
                key={idx}
                onClick={() => action.path ? router.push(action.path) : action.onClick?.()}
                className="glass-card px-4 py-3.5 rounded-2xl flex flex-col sm:flex-row items-center justify-center gap-2.5 text-on-surface dark:text-[#eee6ff] hover:bg-white/80 dark:hover:bg-white/10 active:scale-95 transition-all text-xs font-bold border border-white/50 dark:border-[#3a2d58]/60 shadow-sm text-center sm:text-left"
              >
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${action.iconBg}`}>
                  <Icon className={`w-4 h-4 ${action.color}`} />
                </span>
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Water Intake Hydration Indicator Widget ── */}
      {featureToggles?.waterEnabled ? (
        <section className="mb-stack-lg">
          <div className="glass-card rounded-2xl p-6 border border-white/50 dark:border-[#3a2d58]/50 shadow-sm relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-500 shrink-0">
                <Droplet className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-bold text-lg text-[#18003d] dark:text-[#eee6ff]">Daily Water Intake</h3>
                  <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 px-2 py-0.5 rounded-lg border border-cyan-200 dark:border-cyan-800">
                    {waterPercent}% Goal
                  </span>
                </div>
                <p className="text-xs text-[#3d3050] dark:text-[#c8bedd] font-medium mt-0.5">
                  {waterIntake} ml logged of {waterGoal} ml target
                </p>
                {/* Progress bar */}
                <div className="w-full bg-black/5 dark:bg-white/10 h-2 rounded-full mt-2 overflow-hidden">
                  <div 
                    className="bg-cyan-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${waterPercent}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
              <button
                onClick={() => addWater(250)}
                className="px-4 py-2.5 rounded-xl bg-cyan-500 text-white font-bold text-xs shadow-sm hover:opacity-90 transition-opacity flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add 250ml
              </button>
              <button
                onClick={resetWater}
                title="Reset Water Intake"
                className="p-2.5 rounded-xl bg-white/40 dark:bg-white/10 border border-white/50 dark:border-white/15 text-on-surface-variant dark:text-[#c8bedd] hover:bg-white/70 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      ) : null}

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

      {/* ── TEXT-BASED WELLNESS LOG HISTORY (SCROLL DOWN ON DASHBOARD) ── */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-5 h-5 text-primary dark:text-[#d4b8ff]" />
          <h3 className="font-serif font-bold text-xl text-[#18003d] dark:text-[#eee6ff]">Wellness Activity &amp; Log History</h3>
        </div>

        {/* 1. Mood Logs Feed */}
        <div className="glass-card rounded-2xl p-6 shadow-sm border border-white/40 dark:border-[#3a2d58]/50">
          <div className="flex justify-between items-center mb-4 border-b border-black/5 dark:border-[#3a2d58]/40 pb-3">
            <div className="flex items-center gap-2 text-tertiary font-bold text-sm">
              <Smile className="w-4 h-4" />
              <span>Mood Log History</span>
            </div>
            {allMoodLogs.length > 5 && (
              <button
                onClick={() => setShowAllMoods(!showAllMoods)}
                className="text-xs font-bold text-tertiary hover:underline flex items-center gap-1"
              >
                {showAllMoods ? (
                  <>Show Less <ChevronUp className="w-3.5 h-3.5" /></>
                ) : (
                  <>See More ({allMoodLogs.length}) <ChevronDown className="w-3.5 h-3.5" /></>
                )}
              </button>
            )}
          </div>

          {displayedMoodLogs.length > 0 ? (
            <div className="space-y-3">
              {displayedMoodLogs.map((log, idx) => (
                <div 
                  key={idx}
                  className="bg-white/40 dark:bg-[#1c1230]/40 p-4 rounded-xl border border-outline-variant/30 dark:border-[#3a2d58]/60 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl shrink-0">{moodEmojiMap[log.mood || 'Calm'] || '🧘'}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-[#18003d] dark:text-[#eee6ff]">{log.mood}</span>
                        <span className="text-[10px] font-bold text-[#3d3050] dark:text-[#c8bedd] bg-tertiary/10 px-2 py-0.5 rounded-md">
                          {formatDateLabel(log.date)}
                        </span>
                      </div>
                      <p className="text-xs text-[#3d3050] dark:text-[#c8bedd] font-medium mt-0.5 leading-relaxed truncate">
                        {log.notes ? `"${log.notes}"` : 'No additional notes'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => requestDelete('mood', log.date, `Mood Log (${log.mood})`)}
                    title="Delete mood entry"
                    className="p-2 rounded-xl text-on-surface-variant/60 hover:text-rose-500 hover:bg-rose-500/10 transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-on-surface-variant dark:text-[#c8bedd] italic">
              No mood logs recorded yet. Tap &quot;Log Mood&quot; above to add your first entry.
            </div>
          )}
        </div>

        {/* 2. Symptom Logs Feed */}
        <div className="glass-card rounded-2xl p-6 shadow-sm border border-white/40 dark:border-[#3a2d58]/50">
          <div className="flex justify-between items-center mb-4 border-b border-black/5 dark:border-[#3a2d58]/40 pb-3">
            <div className="flex items-center gap-2 text-secondary dark:text-[#ccbeff] font-bold text-sm">
              <Activity className="w-4 h-4" />
              <span>Symptom Log History</span>
            </div>
            {allSymptomLogs.length > 5 && (
              <button
                onClick={() => setShowAllSymptoms(!showAllSymptoms)}
                className="text-xs font-bold text-secondary dark:text-[#ccbeff] hover:underline flex items-center gap-1"
              >
                {showAllSymptoms ? (
                  <>Show Less <ChevronUp className="w-3.5 h-3.5" /></>
                ) : (
                  <>See More ({allSymptomLogs.length}) <ChevronDown className="w-3.5 h-3.5" /></>
                )}
              </button>
            )}
          </div>

          {displayedSymptomLogs.length > 0 ? (
            <div className="space-y-3">
              {displayedSymptomLogs.map((log, idx) => (
                <div 
                  key={idx}
                  className="bg-white/40 dark:bg-[#1c1230]/40 p-4 rounded-xl border border-outline-variant/30 dark:border-[#3a2d58]/60 flex items-center justify-between gap-2"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-secondary/15 flex items-center justify-center text-secondary shrink-0 mt-0.5">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-[#18003d] dark:text-[#eee6ff]">
                          {log.symptoms && log.symptoms.length > 0 ? log.symptoms.join(', ') : 'General Symptoms'}
                        </span>
                        <span className="text-[10px] font-bold text-[#3d3050] dark:text-[#c8bedd] bg-secondary/10 px-2 py-0.5 rounded-md">
                          {formatDateLabel(log.date)}
                        </span>
                        {log.severity !== undefined && (
                          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800">
                            Pain: {log.severity}/10
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#3d3050] dark:text-[#c8bedd] font-medium mt-0.5 leading-relaxed truncate">
                        {log.notes ? `"${log.notes}"` : 'No additional notes'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => requestDelete('symptom', log.date, `Symptom Log (${formatDateLabel(log.date)})`)}
                    title="Delete symptom entry"
                    className="p-2 rounded-xl text-on-surface-variant/60 hover:text-rose-500 hover:bg-rose-500/10 transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-on-surface-variant dark:text-[#c8bedd] italic">
              No symptom logs recorded yet. Tap &quot;Symptoms&quot; above to log what you&apos;re feeling.
            </div>
          )}
        </div>

        {/* 3. Period Log History */}
        <div className="glass-card rounded-2xl p-6 shadow-sm border border-white/40 dark:border-[#3a2d58]/50">
          <div className="flex justify-between items-center mb-4 border-b border-black/5 dark:border-[#3a2d58]/40 pb-3">
            <div className="flex items-center gap-2 text-rose-500 font-bold text-sm">
              <Droplet className="w-4 h-4 fill-current" />
              <span>Period Log History</span>
            </div>
            {displayedPeriodLogs.length > 5 && (
              <button
                onClick={() => setShowAllPeriods(!showAllPeriods)}
                className="text-xs font-bold text-rose-500 hover:underline flex items-center gap-1"
              >
                {showAllPeriods ? (
                  <>Show Less <ChevronUp className="w-3.5 h-3.5" /></>
                ) : (
                  <>See More ({periodLogs.length}) <ChevronDown className="w-3.5 h-3.5" /></>
                )}
              </button>
            )}
          </div>

          {displayedPeriodLogs.length > 0 ? (
            <div className="space-y-3">
              {displayedPeriodLogs.map((log, idx) => (
                <div 
                  key={idx}
                  className="bg-white/40 dark:bg-[#1c1230]/40 p-4 rounded-xl border border-outline-variant/30 dark:border-[#3a2d58]/60 flex justify-between items-center gap-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-rose-500/15 flex items-center justify-center text-rose-500 shrink-0">
                      <Droplet className="w-4 h-4 fill-current" />
                    </div>
                    <div>
                      <span className="font-bold text-sm text-[#18003d] dark:text-[#eee6ff] block">
                        Period Logged
                      </span>
                      <span className="text-xs text-[#3d3050] dark:text-[#c8bedd] font-medium">
                        {formatDateLabel(log.date)} {log.flow ? `• ${log.flow.toUpperCase()} Flow` : ''}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => requestDelete('period', log.date, `Period Log (${formatDateLabel(log.date)})`)}
                    title="Delete period entry"
                    className="p-2 rounded-xl text-on-surface-variant/60 hover:text-rose-500 hover:bg-rose-500/10 transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-on-surface-variant dark:text-[#c8bedd] italic">
              No period logs recorded yet. Use the cycle calendar to mark period dates.
            </div>
          )}
        </div>

      </section>

      {/* ── Undo Floating Toast Notification (5s Countdown) ── */}
      {pendingDelete && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md bg-[#18003d] dark:bg-[#251845] text-white p-4 rounded-2xl shadow-2xl border border-white/20 flex items-center justify-between gap-3 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-rose-500/25 border border-rose-500/40 flex items-center justify-center text-rose-300 font-serif font-bold text-xs shrink-0">
              {pendingDelete.secondsLeft}s
            </div>
            <p className="text-xs font-semibold truncate">
              Deleting <span className="font-bold text-rose-300">{pendingDelete.label}</span>... Undo in {pendingDelete.secondsLeft}s
            </p>
          </div>

          <button
            onClick={cancelDelete}
            className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs shadow-sm transition-all shrink-0 flex items-center gap-1.5 active:scale-95 border border-white/20"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Undo
          </button>
        </div>
      )}

    </div>
  );
}
