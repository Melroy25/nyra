import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  ChevronLeft, ChevronRight, Sparkles, Droplet, TrendingUp, Info,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { FlowLevel } from '../types';

export default function CyclePage() {
  const router = useRouter();

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const {
    cycleLogs,
    startPeriod,
    endPeriod,
    logFlow,
    currentCycleDay,
    currentCyclePhase,
    recalculateCycleMetrics,
    user,
    onboardingData,
  } = useStore();

  const [selectedDate, setSelectedDate] = useState<string>('2026-07-27');
  const [currentMonth, setCurrentMonth] = useState<number>(6);
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [showLegendInfo, setShowLegendInfo] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const today = new Date();
      setSelectedDate(today.toISOString().split('T')[0]);
      setCurrentMonth(today.getMonth());
      setCurrentYear(today.getFullYear());
    }
  }, []);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const selectedLog = cycleLogs.find((l) => l.date === selectedDate);
  const isSelectedPeriod = selectedLog?.isPeriod || false;

  const handlePrevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
    else setCurrentMonth(currentMonth - 1);
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
    else setCurrentMonth(currentMonth + 1);
  };

  const generateDays = () => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevTotalDays = new Date(currentYear, currentMonth, 0).getDate();
    const days = [];
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevTotalDays - i;
      const m = currentMonth === 0 ? 11 : currentMonth - 1;
      const y = currentMonth === 0 ? currentYear - 1 : currentYear;
      days.push({ dayNum, dateStr: `${y}-${String(m + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`, isCurrentMonth: false });
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push({ dayNum: i, dateStr: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`, isCurrentMonth: true });
    }
    const totalSlots = 35;
    const fillerCount = totalSlots - days.length;
    const rem = fillerCount < 0 ? 42 - days.length : fillerCount;
    for (let i = 1; i <= rem; i++) {
      const m = currentMonth === 11 ? 0 : currentMonth + 1;
      const y = currentMonth === 11 ? currentYear + 1 : currentYear;
      days.push({ dayNum: i, dateStr: `${y}-${String(m + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`, isCurrentMonth: false });
    }
    return days;
  };

  const handleStartPeriodClick = () => { startPeriod(selectedDate); recalculateCycleMetrics(); };
  const handleEndPeriodClick = () => { endPeriod(selectedDate); recalculateCycleMetrics(); };
  const handleFlowSelect = (level: FlowLevel) => {
    if (!isSelectedPeriod) return;
    logFlow(selectedDate, selectedLog?.flow === level ? null : level);
  };

  // ── DYNAMIC PREDICTION ENGINE FOR FUTURE CYCLES ──
  const actualPeriodLogs = cycleLogs
    .filter((l) => l.isPeriod && !l.isPredicted)
    .map((l) => l.date)
    .sort();

  let latestPeriodStartDate = user?.lastPeriodDate || (user as any)?.last_period_date || onboardingData.lastPeriodDate || null;
  if (actualPeriodLogs.length > 0) {
    const sorted = [...actualPeriodLogs].sort();
    let lastBlockStart = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
      const parts1 = sorted[i - 1].split('-').map(Number);
      const parts2 = sorted[i].split('-').map(Number);
      const prev = new Date(parts1[0], parts1[1] - 1, parts1[2]);
      const curr = new Date(parts2[0], parts2[1] - 1, parts2[2]);
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 2) {
        lastBlockStart = sorted[i];
      }
    }
    latestPeriodStartDate = lastBlockStart;
  }

  const cycleLength = user?.cycleLength || (user as any)?.cycle_length || onboardingData.averageCycleLength || 28;
  const periodDuration = user?.periodDuration || (user as any)?.period_duration || onboardingData.periodDuration || 5;

  // Initial period days (cycle 0) if user set a lastPeriodDate
  const isInitialPeriodDay = (dateStr: string): boolean => {
    if (!latestPeriodStartDate) return false;
    const p1 = latestPeriodStartDate.split('-').map(Number);
    const p2 = dateStr.split('-').map(Number);
    if (!p1[0] || !p2[0]) return false;
    const startMs = new Date(p1[0], p1[1] - 1, p1[2]).getTime();
    const targetMs = new Date(p2[0], p2[1] - 1, p2[2]).getTime();

    const diffDays = Math.round((targetMs - startMs) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays < periodDuration;
  };

  // Predicted future period days (cycle 1+)
  const isPredictedPeriodDay = (dateStr: string): boolean => {
    if (!latestPeriodStartDate) return false;
    const p1 = latestPeriodStartDate.split('-').map(Number);
    const p2 = dateStr.split('-').map(Number);
    if (!p1[0] || !p2[0]) return false;
    const startMs = new Date(p1[0], p1[1] - 1, p1[2]).getTime();
    const targetMs = new Date(p2[0], p2[1] - 1, p2[2]).getTime();

    const diffDays = Math.round((targetMs - startMs) / (1000 * 60 * 60 * 24));
    if (diffDays < periodDuration) return false;

    const cycleIndex = Math.floor(diffDays / cycleLength);
    const dayInCycle = diffDays % cycleLength;

    return cycleIndex >= 1 && dayInCycle >= 0 && dayInCycle < periodDuration;
  };

  const isPredictedOvulationDay = (dateStr: string): boolean => {
    if (!latestPeriodStartDate) return false;
    const p1 = latestPeriodStartDate.split('-').map(Number);
    const p2 = dateStr.split('-').map(Number);
    if (!p1[0] || !p2[0]) return false;
    const startMs = new Date(p1[0], p1[1] - 1, p1[2]).getTime();
    const targetMs = new Date(p2[0], p2[1] - 1, p2[2]).getTime();

    const diffDays = Math.round((targetMs - startMs) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return false;

    const dayInCycle = diffDays % cycleLength;
    const ovCenter = cycleLength - 14;
    return dayInCycle >= ovCenter - 1 && dayInCycle <= ovCenter + 1;
  };

  const getDayStyle = (dateStr: string, isCurrentMonth: boolean) => {
    const log = cycleLogs.find((l) => l.date === dateStr);
    const isSelected = dateStr === selectedDate;

    let cls = 'aspect-square flex flex-col items-center justify-center rounded-2xl font-semibold text-sm transition-all cursor-pointer relative select-none ';
    if (!isCurrentMonth) { cls += 'opacity-25 '; }

    const isActualPeriod = (log?.isPeriod && !log?.isPredicted) || isInitialPeriodDay(dateStr);
    const isPredicted = log?.isPredicted || isPredictedPeriodDay(dateStr);
    const isOvulation = log?.isOvulation || isPredictedOvulationDay(dateStr);

    if (isActualPeriod) {
      cls += 'bg-rose-500/12 dark:bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-300/50 dark:border-rose-400/30 font-bold shadow-xs ';
    } else if (isPredicted) {
      cls += 'border border-dashed border-rose-300/60 dark:border-rose-400/40 text-rose-500/80 dark:text-rose-300/80 font-medium bg-rose-500/5 ';
    } else if (isOvulation) {
      cls += 'bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-200/50 dark:border-purple-400/30 font-medium ';
    } else {
      cls += 'text-on-surface dark:text-[#eee6ff] hover:bg-white/50 dark:hover:bg-white/8 ';
    }

    if (isSelected) {
      cls += 'ring-2 ring-primary dark:ring-[#d4b8ff] ring-offset-1 dark:ring-offset-[#16102a] shadow-sm ';
    }
    return cls;
  };

  // Insight logic
  const loggedPeriodMonths = Array.from(new Set(
    cycleLogs.filter((l) => l.isPeriod && !l.isPredicted).map((l) => l.date.substring(0, 7))
  ));
  const loggedCount = loggedPeriodMonths.length;
  const dynamicInsight = loggedCount === 0
    ? 'No period entries logged yet. Start marking period days on the calendar above to build your cycle history!'
    : loggedCount === 1
      ? 'Great start! You have 1 cycle entry logged. Log your next period to unlock trend analysis and personalised predictions.'
      : `Your cycle has been tracked across ${loggedCount} months. Keep logging symptoms and moods for peak accuracy.`;

  const safeCycleDay = isNaN(Number(currentCycleDay)) || !currentCycleDay ? 1 : Number(currentCycleDay);

  return (
    <div className="max-w-[1200px] mx-auto px-container-padding-mobile md:px-container-padding-desktop pt-stack-md pb-16 flex flex-col gap-stack-lg">

      {/* ── HEADER ── */}
      <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-entrance">
        <div>
          <h1 className="font-serif font-bold text-3xl md:text-4xl text-on-surface dark:text-[#eee6ff]">Cycle Tracking</h1>
          <p className="text-sm font-semibold text-on-surface-variant dark:text-[#c8bedd] mt-1">
            Day {safeCycleDay} &bull; <span className="text-primary dark:text-[#d4b8ff]">{currentCyclePhase} Phase</span>
          </p>
        </div>
        <div>
          {isSelectedPeriod ? (
            <button
              onClick={handleEndPeriodClick}
              className="px-5 py-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/40 text-rose-600 dark:text-rose-400 font-bold text-xs hover:bg-rose-500/20 transition-colors flex items-center gap-2 shadow-sm"
            >
              <span className="text-rose-500">✓</span> Period logged for {selectedDate}
              <span className="opacity-60 text-[10px]">(tap to remove)</span>
            </button>
          ) : (
            <button
              onClick={handleStartPeriodClick}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 to-[#c45c8a] text-white font-bold text-xs shadow-md hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <Droplet className="w-3.5 h-3.5 fill-current" />
              Mark {selectedDate} as Period Start
            </button>
          )}
        </div>
      </section>

      {/* ── CALENDAR ── */}
      <section className="glass-card rounded-2xl p-5 md:p-7 shadow-sm border border-white/50 dark:border-[#3a2d58]/50">
        {/* Month Nav */}
        <div className="flex justify-between items-center mb-6">
          <button onClick={handlePrevMonth} className="p-2 rounded-xl hover:bg-white/50 dark:hover:bg-white/10 transition-colors text-on-surface-variant">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="font-serif font-bold text-lg text-on-surface dark:text-[#eee6ff]">
            {months[currentMonth]} {currentYear}
          </h2>
          <button onClick={handleNextMonth} className="p-2 rounded-xl hover:bg-white/50 dark:hover:bg-white/10 transition-colors text-on-surface-variant">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-on-surface-variant/60 dark:text-[#c8bedd]/60 uppercase tracking-widest mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>

        {/* Day Cells */}
        <div className="grid grid-cols-7 gap-1">
          {generateDays().map((day, idx) => {
            const log = cycleLogs.find((l) => l.date === day.dateStr);
            const isActual = log?.isPeriod && !log?.isPredicted;
            return (
              <button
                key={idx}
                onClick={() => setSelectedDate(day.dateStr)}
                className={getDayStyle(day.dateStr, day.isCurrentMonth)}
              >
                <span className="text-xs">{day.dayNum}</span>
                {isActual && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-rose-500 block" />
                )}
              </button>
            );
          })}
        </div>

        {/* ── LEGEND ── */}
        <div className="mt-6 pt-5 border-t border-outline-variant/20 dark:border-[#3a2d58]/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-on-surface-variant dark:text-[#c8bedd] uppercase tracking-widest">
              Calendar Key
            </span>
            <button
              onClick={() => setShowLegendInfo(!showLegendInfo)}
              className="flex items-center gap-1 text-[10px] font-semibold text-primary dark:text-[#d4b8ff] hover:underline"
            >
              <Info className="w-3 h-3" />
              {showLegendInfo ? 'Hide' : 'What do these mean?'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-xl bg-rose-500/12 border border-rose-300/60 flex items-center justify-center shrink-0">
                <Droplet className="w-3 h-3 text-rose-500 fill-rose-500/80" />
              </span>
              <div>
                <p className="text-xs font-bold text-on-surface dark:text-[#eee6ff] leading-none">Period Day</p>
                <p className="text-[10px] text-on-surface-variant dark:text-[#c8bedd] mt-0.5">Days you logged</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-xl bg-rose-500/5 border border-dashed border-rose-300/60 flex items-center justify-center shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400/80" />
              </span>
              <div>
                <p className="text-xs font-bold text-on-surface dark:text-[#eee6ff] leading-none">Predicted</p>
                <p className="text-[10px] text-on-surface-variant dark:text-[#c8bedd] mt-0.5">Next period estimate</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-xl bg-purple-500/10 border border-purple-200/50 flex items-center justify-center shrink-0">
                <span className="w-2 h-2 rounded-full bg-purple-500/80" />
              </span>
              <div>
                <p className="text-xs font-bold text-on-surface dark:text-[#eee6ff] leading-none">Ovulation</p>
                <p className="text-[10px] text-on-surface-variant dark:text-[#c8bedd] mt-0.5">Fertile window</p>
              </div>
            </div>
          </div>

          {showLegendInfo && (
            <div className="mt-4 p-4 rounded-2xl bg-primary/5 dark:bg-[#1c1230] border border-primary/15 dark:border-[#3a2d58] space-y-2.5 text-xs text-on-surface-variant dark:text-[#c8bedd] font-medium leading-relaxed">
              <p><span className="font-bold text-rose-500">🩸 Pink/Rose filled cells</span> — Days you manually marked as period days. Tap any day first, then press the &quot;Mark as Period&quot; button.</p>
              <p><span className="font-bold text-rose-400">Dashed circles</span> — Nyra&apos;s prediction of your upcoming period, automatically calculated from your last logged period and cycle length. Updates in real-time!</p>
              <p><span className="font-bold text-violet-500">Purple cells</span> — Your estimated ovulation window (typically ~14 days before your next period). These are your most fertile days.</p>
            </div>
          )}
        </div>
      </section>

      {/* ── LOGGING ROW ── */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-gutter">

        {/* Flow Selector */}
        <div className="glass-card rounded-2xl p-5 shadow-sm border border-white/50 dark:border-[#3a2d58]/50 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="font-serif font-bold text-base text-on-surface dark:text-[#eee6ff]">
              Flow Level <span className="text-on-surface-variant font-normal text-xs">— {selectedDate}</span>
            </h3>
            {!isSelectedPeriod && (
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-xl border border-amber-200 dark:border-amber-800">
                Period days only
              </span>
            )}
          </div>

          {!isSelectedPeriod ? (
            <div className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-white/40 dark:bg-[#1c1230]/40 border border-outline-variant/30 dark:border-[#3a2d58]/60 text-center">
              <Droplet className="w-6 h-6 text-rose-400/60" />
              <p className="text-xs text-on-surface-variant dark:text-[#c8bedd] font-medium leading-relaxed">
                Select a period day on the calendar, then log your flow intensity here.
              </p>
              <button
                onClick={handleStartPeriodClick}
                className="px-4 py-2 rounded-xl bg-rose-500 text-white font-bold text-xs shadow-sm hover:opacity-90 transition-opacity"
              >
                Mark {selectedDate} as Period
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              {(['light', 'medium', 'heavy'] as FlowLevel[]).map((level) => {
                const isActive = selectedLog?.flow === level;
                const icons = { light: '💧', medium: '💦', heavy: '🌊' };
                return (
                  <button
                    key={level}
                    onClick={() => handleFlowSelect(level)}
                    className={`flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border-2 transition-all font-bold text-xs capitalize ${
                      isActive
                        ? 'bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400 shadow-sm'
                        : 'border-outline-variant/40 dark:border-[#3a2d58] bg-white/30 dark:bg-[#1c1230]/40 text-on-surface dark:text-[#eee6ff] hover:border-rose-400/60'
                    }`}
                  >
                    <span className="text-xl">{icons[level]}</span>
                    {level}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Dynamic AI Insight */}
        <div className="glass-card rounded-2xl p-5 shadow-sm border border-white/50 dark:border-[#3a2d58]/50 relative overflow-hidden flex items-start gap-4">
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-tertiary-container/20 blur-3xl rounded-full pointer-events-none" />
          <div className="p-2.5 bg-white/60 dark:bg-[#1c1230] border border-white/50 dark:border-[#3a2d58] rounded-2xl text-primary shadow-sm shrink-0 z-10">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div className="z-10 min-w-0">
            <h3 className="font-serif font-bold text-base text-on-surface dark:text-[#eee6ff] mb-2">Nyra Insight</h3>
            <p className="text-xs text-on-surface-variant dark:text-[#c8bedd] leading-relaxed font-medium">{dynamicInsight}</p>
            <div className="mt-4 flex gap-4">
              <button onClick={() => router.push('/symptoms')} className="text-xs text-primary dark:text-[#d4b8ff] font-bold hover:underline">Log Symptoms</button>
              <button onClick={() => router.push('/mood')} className="text-xs text-tertiary font-bold hover:underline">Log Mood</button>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
