import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Sparkles, Calendar, Smile, Activity, Moon, HeartPulse, ArrowRight, Loader2, Droplet, Plus, RotateCcw, TrendingUp } from 'lucide-react';
import { useStore } from '../store/useStore';
import { motion } from 'framer-motion';
import { apiGetCycleMetrics } from '../lib/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function DashboardPage() {
  const router = useRouter();
  
  // Fetch values from Zustand store
  const { user, cycleLogs, waterIntake, waterGoal, addWater, resetWater } = useStore();

  const name = user?.name || 'User';

  // Live backend cycle metrics
  const [cycleMetrics, setCycleMetrics] = useState<{
    currentDay: number;
    currentPhase: string;
    nextPeriodDaysLeft: number;
    cycleLength: number;
    todayMood: string | null;
    todaySymptoms: string[];
  } | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      setMetricsLoading(true);
      apiGetCycleMetrics()
        .then((data) => {
          setCycleMetrics(data);
        })
        .catch((err) => {
          console.log('Cycle metrics fetch failed (using defaults):', err);
          setCycleMetrics({
            currentDay: 1,
            currentPhase: 'Follicular',
            nextPeriodDaysLeft: 28,
            cycleLength: 28,
            todayMood: null,
            todaySymptoms: [],
          });
        })
        .finally(() => setMetricsLoading(false));
    } else {
      setMetricsLoading(false);
    }
  }, [user?.id]);

  const currentCycleDay = cycleMetrics?.currentDay ?? 1;
  const currentCyclePhase = cycleMetrics?.currentPhase ?? 'Follicular';
  const nextPeriodDaysLeft = cycleMetrics?.nextPeriodDaysLeft ?? 28;
  const todayMood = cycleMetrics?.todayMood;
  const todaySymptoms = cycleMetrics?.todaySymptoms ?? [];

  // Progress fraction for the ring
  const progressFraction = Math.max(0.02, currentCycleDay / (cycleMetrics?.cycleLength ?? 28));

  // Quick actions layout (Log Mood, Symptoms, Add Water)
  const quickActions = [
    { label: 'Log Mood', icon: Smile,    path: '/mood',     color: 'text-tertiary',  iconBg: 'bg-tertiary/10 dark:bg-tertiary/20' },
    { label: 'Symptoms', icon: Activity, path: '/symptoms', color: 'text-secondary', iconBg: 'bg-secondary/10 dark:bg-secondary/20' },
    { label: 'Add Water', icon: Droplet, onClick: () => addWater(250), color: 'text-cyan-500', iconBg: 'bg-cyan-500/10 dark:bg-cyan-500/20' },
  ];

  const waterPercent = Math.min(100, Math.round((waterIntake / waterGoal) * 100));

  const stats = [
    { label: 'Mood',     value: todayMood || 'Not logged',          icon: Smile,       bg: 'bg-tertiary/12 dark:bg-[#a0517a]/25',  color: 'text-tertiary dark:text-[#ffaeda]' },
    { label: 'Water',    value: `${waterIntake} / ${waterGoal} ml`,  icon: Droplet,     bg: 'bg-cyan-500/12 dark:bg-cyan-500/25',   color: 'text-cyan-500 dark:text-cyan-400' },
    { label: 'Phase',    value: currentCyclePhase,                   icon: Moon,        bg: 'bg-secondary/12 dark:bg-[#7b5ea7]/25', color: 'text-secondary dark:text-[#ccbeff]' },
    { label: 'Symptoms', value: todaySymptoms.length ? todaySymptoms.slice(0, 2).join(', ') : 'None logged', icon: HeartPulse, bg: 'bg-on-surface/8 dark:bg-white/8', color: 'text-on-surface dark:text-[#eee6ff]' },
  ];

  // Insight message based on real phase
  const phaseInsight: Record<string, string> = {
    Menstrual: 'Your body is in renewal mode. Rest well, stay hydrated, and be gentle with yourself today.',
    Follicular: 'Energy is building! Great time to tackle goals, try new things, and socialise.',
    Ovulation: 'Peak energy and confidence! You may feel your best today — perfect for big plans.',
    Luteal: 'Your energy may dip slightly. Nourish yourself with warm foods and light movement.',
  };
  const insight = phaseInsight[currentCyclePhase] || 'Track your cycle daily to receive personalised insights.';

  // ── Graph 1: Mood History Trends Data ──
  const moodScoreMap: Record<string, number> = {
    'Happy': 5, 'Calm': 4, 'Emotional': 3, 'Anxious': 2, 'Irritated': 1, 'Sad': 0,
  };
  const moodChartData = cycleLogs
    .filter((log) => log.mood !== null)
    .slice(-7)
    .map((log) => ({
      date: new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: moodScoreMap[log.mood || 'Calm'] || 4,
      mood: log.mood,
    }));

  // ── Graph 2: Symptom Severity Trends Data ──
  const symptomChartData = cycleLogs
    .filter((log) => (log.symptoms && log.symptoms.length > 0) || log.severity !== undefined)
    .slice(-7)
    .map((log) => ({
      date: new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      severity: log.severity !== undefined ? log.severity : 5,
      symptomsText: log.symptoms && log.symptoms.length > 0 ? log.symptoms.join(', ') : 'None',
    }));

  // ── Graph 3: Period Consistency Data ──
  const targetAvg = user?.cycleLength || 28;
  const periodStartDates = cycleLogs
    .filter((l) => l.isPeriod && !l.isPredicted)
    .map((l) => l.date)
    .sort();

  const monthStarts: { month: string; date: string }[] = [];
  for (const d of periodStartDates) {
    const m = d.substring(0, 7);
    if (!monthStarts.find((x) => x.month === m)) {
      monthStarts.push({ month: m, date: d });
    }
  }

  const periodConsistencyPoints = [];
  for (let i = 1; i < monthStarts.length; i++) {
    const prev = new Date(monthStarts[i - 1].date);
    const curr = new Date(monthStarts[i].date);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
    const label = new Date(monthStarts[i].date).toLocaleString('en-US', { month: 'short' });
    periodConsistencyPoints.push({ label, days: diffDays });
  }

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
        <div className="md:col-span-4 glass-card rounded-2xl p-6 md:p-8 ai-glow flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 text-tertiary">
              <Sparkles className="w-5 h-5 text-tertiary animate-pulse" />
              <span className="font-bold text-sm text-tertiary">Nyra Insight</span>
            </div>
            <p className="text-base text-[#18003d] dark:text-[#eee6ff] italic leading-relaxed">
              &quot;{insight}&quot;
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

      {/* ── WELLNESS ANALYTICS & TRENDS GRAPHS (SCROLL DOWN ON DASHBOARD) ── */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-5 h-5 text-primary dark:text-[#d4b8ff]" />
          <h3 className="font-serif font-bold text-xl text-[#18003d] dark:text-[#eee6ff]">Wellness Analytics &amp; History Trends</h3>
        </div>

        {/* 1. Mood Trends Graph */}
        <div className="glass-card rounded-2xl p-6 shadow-sm border border-white/40 dark:border-[#3a2d58]/50">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2 text-tertiary font-bold text-sm">
              <Smile className="w-4 h-4" />
              <span>Mood History Trends</span>
            </div>
            <span className="text-[10px] font-bold text-outline dark:text-[#c8bedd] uppercase tracking-wider">Last 7 Logs</span>
          </div>

          {moodChartData.length > 0 ? (
            <div className="w-full h-56 text-xs font-semibold">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={moodChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2D3FF" opacity={0.3} />
                  <XAxis dataKey="date" stroke="#7a7583" tickLine={false} />
                  <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} stroke="#7a7583" tickLine={false} />
                  <Tooltip 
                    formatter={(val: any, name: any, props: any) => [props.payload.mood, 'Mood']}
                    contentStyle={{ background: 'rgba(255, 255, 255, 0.95)', borderRadius: '1rem', border: '1px solid #eaddff', color: '#18003d' }}
                  />
                  <Line type="monotone" dataKey="score" stroke="#a0517a" strokeWidth={3} dot={{ r: 5, fill: '#a0517a', strokeWidth: 2, stroke: '#ffffff' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-36 flex items-center justify-center text-xs text-on-surface-variant dark:text-[#c8bedd] italic">
              Log moods on the Log Mood page to populate your emotional trends graph here.
            </div>
          )}
        </div>

        {/* 2. Symptom Severity Graph */}
        <div className="glass-card rounded-2xl p-6 shadow-sm border border-white/40 dark:border-[#3a2d58]/50">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2 text-secondary dark:text-[#ccbeff] font-bold text-sm">
              <Activity className="w-4 h-4" />
              <span>Symptom Intensity Trends</span>
            </div>
            <span className="text-[10px] font-bold text-outline dark:text-[#c8bedd] uppercase tracking-wider">Logged History</span>
          </div>

          {symptomChartData.length > 0 ? (
            <div className="w-full h-56 text-xs font-semibold">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={symptomChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2D3FF" opacity={0.3} />
                  <XAxis dataKey="date" stroke="#7a7583" tickLine={false} />
                  <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} stroke="#7a7583" tickLine={false} />
                  <Tooltip 
                    formatter={(val: any, name: any, props: any) => [`${val}/10 Pain (${props.payload.symptomsText})`, 'Severity']}
                    contentStyle={{ background: 'rgba(255, 255, 255, 0.95)', borderRadius: '1rem', border: '1px solid #eaddff', color: '#18003d' }}
                  />
                  <Line type="monotone" dataKey="severity" stroke="#7c5cbf" strokeWidth={3} dot={{ r: 5, fill: '#7c5cbf', strokeWidth: 2, stroke: '#ffffff' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-36 flex items-center justify-center text-xs text-on-surface-variant dark:text-[#c8bedd] italic">
              Log symptoms on the Symptoms page to populate your intensity graph here.
            </div>
          )}
        </div>

        {/* 3. Period Consistency Graph */}
        <div className="glass-card rounded-2xl p-6 shadow-sm border border-white/40 dark:border-[#3a2d58]/50">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2 text-primary dark:text-[#d4b8ff] font-bold text-sm">
              <Calendar className="w-4 h-4" />
              <span>Period Consistency &amp; Cycle Lengths</span>
            </div>
            <span className="text-[10px] font-bold text-outline dark:text-[#c8bedd] uppercase tracking-wider">{targetAvg}d Target</span>
          </div>

          {periodConsistencyPoints.length > 0 ? (
            <div className="w-full h-56 text-xs font-semibold">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={periodConsistencyPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2D3FF" opacity={0.3} />
                  <XAxis dataKey="label" stroke="#7a7583" tickLine={false} />
                  <YAxis domain={[20, 36]} stroke="#7a7583" tickLine={false} />
                  <Tooltip 
                    formatter={(val: any) => [`${val} Days`, 'Cycle Length']}
                    contentStyle={{ background: 'rgba(255, 255, 255, 0.95)', borderRadius: '1rem', border: '1px solid #eaddff', color: '#18003d' }}
                  />
                  <Line type="monotone" dataKey="days" stroke="#e11d48" strokeWidth={3} dot={{ r: 5, fill: '#e11d48', strokeWidth: 2, stroke: '#ffffff' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-36 flex items-center justify-center text-xs text-on-surface-variant dark:text-[#c8bedd] italic text-center p-4">
              Log at least 2 period starts across different months to view your period consistency trend graph here.
            </div>
          )}
        </div>

      </section>

    </div>
  );
}
