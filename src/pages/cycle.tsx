import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { ChevronLeft, ChevronRight, Sparkles, Droplet, Info, Heart } from 'lucide-react';
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
    recalculateCycleMetrics
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

    // Next month filler days to complete standard grid rows
    const totalSlots = 35; // 5 rows
    const fillerCount = totalSlots - days.length;
    const remainingFiller = fillerCount < 0 ? 42 - days.length : fillerCount; // 6 rows if needed
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
      base += 'text-on-surface hover:bg-white/40 ';
    }

    if (isSelected) {
      base += 'ring-2 ring-primary bg-white shadow-sm border border-white/50 ';
    }

    // Determine phase formatting
    if (log?.isPeriod) {
      base += 'bg-tertiary-fixed/30 text-tertiary ';
    } else if (log?.isOvulation) {
      base += 'bg-primary-fixed/30 text-primary ';
    } else {
      // Dummy rule for predicted period range
      const dayVal = parseInt(dateStr.split('-')[2]);
      if (isCurrentMonth && dayVal >= 26 && dayVal <= 30) {
        base += 'border border-dashed border-tertiary/40 ';
      }
    }

    return base;
  };

  return (
    <div className="max-w-[1200px] mx-auto px-container-padding-mobile md:px-container-padding-desktop pt-stack-md pb-12 flex flex-col gap-stack-lg">
      
      {/* Header section */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-stack-md animate-entrance">
        <div>
          <h1 className="font-serif font-bold text-3xl md:text-5xl text-on-surface dark:text-[#eee6ff] mb-2">Cycle Tracking</h1>
          <p className="text-sm font-semibold text-on-surface-variant">
            Day {currentCycleDay} &bull; {currentCyclePhase} Phase
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleStartPeriodClick}
            className="px-6 py-3 rounded-full bg-gradient-to-r from-primary to-secondary text-white font-bold text-sm shadow-md shadow-primary/20 hover:opacity-95 transition-opacity"
          >
            Start Period
          </button>
          <button 
            onClick={handleEndPeriodClick}
            className="px-6 py-3 rounded-full bg-white/60 border border-outline-variant text-on-surface font-bold text-sm hover:bg-white transition-colors"
          >
            End Period
          </button>
        </div>
      </section>

      {/* Monthly calendar Card */}
      <section className="glass-card rounded-xl p-6 md:p-8 shadow-sm dark:border dark:border-[#3a2d58]/50">
        <div className="flex justify-between items-center mb-8">
          <button 
            onClick={handlePrevMonth}
            className="p-2 text-on-surface-variant hover:bg-white/50 rounded-full transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="font-serif font-bold text-xl md:text-2xl text-on-surface dark:text-[#eee6ff]">
            {months[currentMonth]} {currentYear}
          </h2>
          <button 
            onClick={handleNextMonth}
            className="p-2 text-on-surface-variant hover:bg-white/50 rounded-full transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-outline uppercase tracking-wider mb-4">
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
        <div className="flex flex-wrap gap-5 mt-8 pt-6 border-t border-outline-variant/30">
          <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
            <span className="w-3.5 h-3.5 rounded-full bg-tertiary-fixed border border-tertiary/20"></span>
            <span>Period Days</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
            <span className="w-3.5 h-3.5 rounded-full border-2 border-dashed border-tertiary/60"></span>
            <span>Predicted Period</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
            <span className="w-3.5 h-3.5 rounded-full bg-primary-fixed border border-primary/20"></span>
            <span>Ovulation Window</span>
          </div>
        </div>
      </section>

      {/* Logging Row */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
        
        {/* Flow Selector */}
        <div className="glass-card rounded-xl p-6 shadow-sm flex flex-col justify-between dark:border dark:border-[#3a2d58]/50">
          <h3 className="font-serif font-bold text-xl text-on-surface dark:text-[#eee6ff] mb-4">Flow Level for {selectedDate}</h3>
          <div className="flex gap-4">
            {(['light', 'medium', 'heavy'] as FlowLevel[]).map((level) => {
              const isActive = selectedLog?.flow === level;
              return (
                <button
                  key={level}
                  onClick={() => handleFlowSelect(level)}
                  className={`flex-1 flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                    isActive
                      ? 'bg-tertiary/10 border-2 border-tertiary text-tertiary'
                      : 'border-outline-variant bg-white/40 hover:bg-white/70 text-on-surface'
                  }`}
                >
                  <Droplet className={`w-6 h-6 mb-2 ${isActive ? 'fill-current' : 'text-outline-variant'}`} />
                  <span className="font-bold text-xs capitalize">{level}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* AI Insight */}
        <div className="glass-card rounded-xl p-6 shadow-sm relative overflow-hidden flex items-start gap-4 dark:border dark:border-[#3a2d58]/50">
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-tertiary-container/20 blur-3xl rounded-full"></div>
          <div className="p-3 bg-white/60 border border-white/50 rounded-full text-primary shadow-sm shrink-0 z-10">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div className="z-10">
            <h3 className="font-serif font-bold text-xl text-on-surface dark:text-[#eee6ff] mb-2">Nyra Insight</h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Your cycle has been consistent for the last 6 months. Your biological metrics indicate a healthy rhythm. Click below to add other symptoms or moods to keep your companion accurate.
            </p>
            <div className="mt-4 flex gap-4">
              <button 
                onClick={() => router.push('/symptoms')}
                className="text-xs text-primary font-bold hover:underline"
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

    </div>
  );
}
