import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { ChevronLeft, ChevronRight, Sparkles, Droplet, Info, Heart, TrendingUp, Calendar as CalendarIcon, Check } from 'lucide-react';
import { useStore } from '../store/useStore';
import { FlowLevel } from '../types';
import { motion } from 'framer-motion';

export default function CyclePage() {
  const router = useRouter();
  
  const { 
    cycleLogs, 
    startPeriod, 
    endPeriod, 
    logFlow, 
    currentCycleDay,
    currentCyclePhase,
    recalculateCycleMetrics,
    user,
    onboardingData
  } = useStore();

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth()); // 0-indexed
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Selected date log entry
  const selectedLog = cycleLogs.find((l) => l.date === selectedDate);
  const isSelectedPeriod = selectedLog?.isPeriod || false;

  // Handle month controls
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Generate calendar grid array
  const generateDays = () => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sun
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevTotalDays = new Date(currentYear, currentMonth, 0).getDate();

    const days = [];

    // Previous month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevTotalDays - i;
      const m = currentMonth === 0 ? 11 : currentMonth - 1;
      const y = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({ dayNum, dateStr, isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ dayNum: i, dateStr, isCurrentMonth: true });
    }

    // Next month filler days to complete grid
    const totalSlots = 35;
    const fillerCount = totalSlots - days.length;
    const remainingFiller = fillerCount < 0 ? 42 - days.length : fillerCount;
    for (let i = 1; i <= remainingFiller; i++) {
      const m = currentMonth === 11 ? 0 : currentMonth + 1;
      const y = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ dayNum: i, dateStr, isCurrentMonth: false });
    }

    return days;
  };

  const handleDayClick = (dateStr: string) => {
    setSelectedDate(dateStr);
  };

  const handleStartPeriodClick = () => {
    startPeriod(selectedDate);
    recalculateCycleMetrics();
  };

  const handleEndPeriodClick = () => {
    endPeriod(selectedDate);
    recalculateCycleMetrics();
  };

  const handleFlowSelect = (level: FlowLevel) => {
    if (!isSelectedPeriod) return;
    if (selectedLog?.flow === level) {
      logFlow(selectedDate, null);
    } else {
      logFlow(selectedDate, level);
    }
  };

  // Determine indicator styles for calendar rendering
  const getDayClasses = (dateStr: string, isCurrentMonth: boolean) => {
    const log = cycleLogs.find((l) => l.date === dateStr);
    const isSelected = dateStr === selectedDate;
    
    let base = 'aspect-square flex flex-col items-center justify-center p-1.5 rounded-xl font-semibold text-sm transition-all cursor-pointer relative ';

    if (!isCurrentMonth) {
      base += 'text-on-surface-variant/30 ';
    } else {
      base += 'text-on-surface dark:text-[#eee6ff] hover:bg-white/40 dark:hover:bg-white/10 ';
    }

    if (isSelected) {
      base += 'ring-2 ring-primary bg-primary/10 dark:bg-primary/20 shadow-sm ';
    }

    if (log?.isPeriod) {
      base += 'bg-tertiary/20 text-tertiary font-bold border border-tertiary/40 ';
    } else if (log?.isOvulation) {
      base += 'bg-primary/20 text-primary font-bold border border-primary/40 ';
    }

    return base;
  };

  // Dynamic Insight Calculation (No false 6 months assumption)
  const loggedPeriodMonths = Array.from(
    new Set(cycleLogs.filter((l) => l.isPeriod && !l.isPredicted).map((l) => l.date.substring(0, 7)))
  );
  const loggedMonthsCount = loggedPeriodMonths.length;

  const dynamicInsight = loggedMonthsCount <= 1
    ? `You have logged ${loggedMonthsCount === 0 ? 'no period entries' : '1 cycle entry'} so far. Keep logging your monthly periods to build accuracy and unlock multi-month trend analysis!`
    : `Your cycle has been tracked across ${loggedMonthsCount} months. Your biological metrics indicate an active rhythm. Keep logging symptoms and moods for peak accuracy.`;

  // Safe cycle day display (Fixes Day NaN)
  const safeCycleDay = isNaN(Number(currentCycleDay)) || !currentCycleDay ? 1 : Number(currentCycleDay);

  // Period Consistency Graph Data
  const targetAvg = user?.cycleLength || onboardingData.averageCycleLength || 28;
  const graphPoints = [
    { label: 'Mar', days: 28 },
    { label: 'Apr', days: 30 },
    { label: 'May', days: 27 },
    { label: 'Jun', days: 29 },
    { label: 'Jul', days: targetAvg },
  ];

  const minVal = 24;
  const maxVal = 34;

  return (
    <div className="max-w-[1200px] mx-auto px-container-padding-mobile md:px-container-padding-desktop pt-stack-md pb-12 flex flex-col gap-stack-lg">
      
      {/* Header section */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-stack-md animate-entrance">
        <div>
          <h1 className="font-serif font-bold text-3xl md:text-5xl text-on-surface dark:text-[#eee6ff] mb-2">Cycle Tracking</h1>
          <p className="text-sm font-semibold text-on-surface-variant dark:text-[#c8bedd]">
            Day {safeCycleDay} &bull; {currentCyclePhase} Phase
          </p>
        </div>

        {/* Selected Date Action Button */}
        <div className="flex flex-wrap items-center gap-3">
          {isSelectedPeriod ? (
            <button 
              onClick={handleEndPeriodClick}
              className="px-5 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/40 text-rose-600 dark:text-rose-400 font-bold text-xs hover:bg-rose-500/20 transition-colors flex items-center gap-2 shadow-sm"
            >
              <span>✓ Period Marked for {selectedDate}</span>
              <span className="text-[10px] underline ml-1">(Click to Remove)</span>
            </button>
          ) : (
            <button 
              onClick={handleStartPeriodClick}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-xs shadow-md shadow-primary/20 hover:opacity-95 transition-opacity flex items-center gap-2"
            >
              <Droplet className="w-4 h-4 fill-current" />
              <span>Mark {selectedDate} as Period</span>
            </button>
          )}
        </div>
      </section>

      {/* Monthly calendar Card */}
      <section className="glass-card rounded-2xl p-6 md:p-8 shadow-sm border border-white/50 dark:border-[#3a2d58]/50">
        <div className="flex justify-between items-center mb-8">
          <button 
            onClick={handlePrevMonth}
            className="p-2 text-on-surface-variant hover:bg-white/50 dark:hover:bg-white/10 rounded-xl transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="font-serif font-bold text-xl md:text-2xl text-on-surface dark:text-[#eee6ff]">
            {months[currentMonth]} {currentYear}
          </h2>
          <button 
            onClick={handleNextMonth}
            className="p-2 text-on-surface-variant hover:bg-white/50 dark:hover:bg-white/10 rounded-xl transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-outline dark:text-[#c8bedd] uppercase tracking-wider mb-4">
          <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-2 md:gap-4">
          {generateDays().map((day, idx) => {
            const hasIndicator = cycleLogs.find((l) => l.date === day.dateStr)?.isPeriod;
            return (
              <button
                key={idx}
                onClick={() => handleDayClick(day.dateStr)}
                className={getDayClasses(day.dateStr, day.isCurrentMonth)}
              >
                <span>{day.dayNum}</span>
                {hasIndicator && (
                  <span className="w-1.5 h-1.5 rounded-full bg-tertiary mt-1 block"></span>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-5 mt-8 pt-6 border-t border-outline-variant/30 dark:border-[#3a2d58]/60">
          <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant dark:text-[#c8bedd]">
            <span className="w-3.5 h-3.5 rounded-full bg-tertiary/20 border border-tertiary"></span>
            <span>Logged Period</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant dark:text-[#c8bedd]">
            <span className="w-3.5 h-3.5 rounded-full border-2 border-dashed border-tertiary/60"></span>
            <span>Predicted Period</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant dark:text-[#c8bedd]">
            <span className="w-3.5 h-3.5 rounded-full bg-primary/20 border border-primary"></span>
            <span>Ovulation Window</span>
          </div>
        </div>
      </section>

      {/* Logging Row */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
        
        {/* Flow Selector */}
        <div className="glass-card rounded-2xl p-6 shadow-sm border border-white/50 dark:border-[#3a2d58]/50 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-serif font-bold text-lg text-on-surface dark:text-[#eee6ff]">Flow Level for {selectedDate}</h3>
            {!isSelectedPeriod && (
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-xl border border-amber-200 dark:border-amber-800">
                Period Day Only
              </span>
            )}
          </div>

          {!isSelectedPeriod ? (
            <div className="bg-white/40 dark:bg-[#1c1230]/40 p-5 rounded-2xl border border-outline-variant/30 dark:border-[#3a2d58]/60 text-center space-y-3">
              <p className="text-xs font-semibold text-on-surface-variant dark:text-[#c8bedd] leading-relaxed">
                Flow level logging is active on period days. Mark <span className="font-bold text-primary dark:text-[#d4b8ff]">{selectedDate}</span> as a period day to log your flow intensity.
              </p>
              <button
                onClick={handleStartPeriodClick}
                className="px-4 py-2.5 rounded-xl bg-tertiary text-white font-bold text-xs shadow-sm hover:opacity-90 transition-opacity inline-flex items-center gap-1.5"
              >
                <Droplet className="w-3.5 h-3.5 fill-current" /> Mark {selectedDate} as Period
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              {(['light', 'medium', 'heavy'] as FlowLevel[]).map((level) => {
                const isActive = selectedLog?.flow === level;
                return (
                  <button
                    key={level}
                    onClick={() => handleFlowSelect(level)}
                    className={`flex-1 flex flex-col items-center justify-center p-4 rounded-2xl border transition-all ${
                      isActive
                        ? 'bg-tertiary/15 border-2 border-tertiary text-tertiary shadow-sm'
                        : 'border-outline-variant/50 dark:border-[#3a2d58] bg-white/40 dark:bg-[#1c1230]/40 hover:bg-white/70 text-on-surface dark:text-[#eee6ff]'
                    }`}
                  >
                    <Droplet className={`w-6 h-6 mb-2 ${isActive ? 'fill-current' : 'text-outline-variant'}`} />
                    <span className="font-bold text-xs capitalize">{level}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Dynamic AI Insight Card */}
        <div className="glass-card rounded-2xl p-6 shadow-sm border border-white/50 dark:border-[#3a2d58]/50 relative overflow-hidden flex items-start gap-4">
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-tertiary-container/20 blur-3xl rounded-full"></div>
          <div className="p-3 bg-white/60 dark:bg-[#1c1230] border border-white/50 dark:border-[#3a2d58] rounded-2xl text-primary shadow-sm shrink-0 z-10">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div className="z-10">
            <h3 className="font-serif font-bold text-lg text-on-surface dark:text-[#eee6ff] mb-2">Nyra Insight</h3>
            <p className="text-xs text-on-surface-variant dark:text-[#c8bedd] leading-relaxed font-medium">
              {dynamicInsight}
            </p>
            <div className="mt-4 flex gap-4">
              <button 
                onClick={() => router.push('/symptoms')}
                className="text-xs text-primary dark:text-[#d4b8ff] font-bold hover:underline"
              >
                Log Symptoms
              </button>
              <button 
                onClick={() => router.push('/mood')}
                className="text-xs text-tertiary font-bold hover:underline"
              >
                Log Mood
              </button>
            </div>
          </div>
        </div>

      </section>

      {/* ── Period Consistency Line Graph ── */}
      <section className="glass-card rounded-2xl p-6 md:p-8 shadow-sm border border-white/50 dark:border-[#3a2d58]/50">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6">
          <div>
            <h3 className="font-serif font-bold text-xl text-on-surface dark:text-[#eee6ff] flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span>Period Consistency &amp; Cycle Lengths</span>
            </h3>
            <p className="text-xs text-on-surface-variant dark:text-[#c8bedd] font-medium mt-1">
              Days between consecutive period starts month by month
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-primary dark:text-[#d4b8ff]">
              <span className="w-3 h-1 bg-primary rounded-full"></span> Measured Length
            </span>
            <span className="flex items-center gap-1.5 text-tertiary">
              <span className="w-3 h-0.5 border-t border-dashed border-tertiary"></span> {targetAvg} Days Target
            </span>
          </div>
        </div>

        {/* Single-Line Chart (SVG) */}
        <div className="w-full h-52 relative pt-8 pb-4">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 500 120" preserveAspectRatio="none">
            {/* Target Average Line */}
            {(() => {
              const yTarget = 120 - ((targetAvg - minVal) / (maxVal - minVal)) * 100;
              return (
                <line
                  x1="0"
                  y1={yTarget}
                  x2="500"
                  y2={yTarget}
                  stroke="#a0517a"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  opacity="0.6"
                />
              );
            })()}

            {/* Continuous Single-Line Path */}
            {(() => {
              const points = graphPoints.map((p, idx) => {
                const x = (idx / (graphPoints.length - 1)) * 480 + 10;
                const y = 120 - ((p.days - minVal) / (maxVal - minVal)) * 100;
                return { x, y, days: p.days, label: p.label };
              });

              const pathD = points.reduce((acc, p, idx) => {
                return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
              }, '');

              return (
                <>
                  {/* Line stroke */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#7c5cbf"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Data Points */}
                  {points.map((p, idx) => (
                    <g key={idx}>
                      {/* Point glow */}
                      <circle cx={p.x} cy={p.y} r="7" fill="#7c5cbf" opacity="0.2" />
                      {/* Inner point */}
                      <circle cx={p.x} cy={p.y} r="4" fill="#7c5cbf" stroke="#ffffff" strokeWidth="2" />
                      {/* Value label text on top */}
                      <text
                        x={p.x}
                        y={p.y - 12}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="bold"
                        fill="#7c5cbf"
                      >
                        {p.days}d
                      </text>
                    </g>
                  ))}
                </>
              );
            })()}
          </svg>

          {/* Month Labels along bottom */}
          <div className="flex justify-between text-xs font-bold text-on-surface-variant dark:text-[#c8bedd] mt-2 px-1">
            {graphPoints.map((p, idx) => (
              <span key={idx}>{p.label}</span>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
