import React from 'react';
import { useNyraStore } from '../store/useNyraStore';
import { getCyclePhaseInfo } from '../utils/cycleHelpers';
import { formatDate } from '../data/mockData';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { Calendar, Activity, TrendingUp, Brain } from 'lucide-react';

export const SymptomIntelligence: React.FC = () => {
  const { logs, cycles, profile } = useNyraStore();

  const todayStr = formatDate(new Date());
  const cycleInfo = getCyclePhaseInfo(
    todayStr,
    cycles,
    profile.avgCycleLength,
    profile.avgPeriodLength
  );

  // 1. Process line chart data (last 15 days of Energy and Sleep)
  const sortedLogs = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  const last15Logs = sortedLogs.slice(-15);
  
  const lineChartData = last15Logs.map(log => {
    // Format date string for label e.g., "Jun 12"
    const dateObj = new Date(log.date);
    const label = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return {
      date: label,
      Energy: log.energy || 3,
      Sleep: log.sleep || 7
    };
  });

  // 2. Process bar chart data (aggregated symptoms count across 6 months)
  const symptomCounts: Record<string, number> = {};
  logs.forEach(log => {
    log.symptoms.forEach(s => {
      symptomCounts[s] = (symptomCounts[s] || 0) + 1;
    });
  });

  const barChartData = Object.entries(symptomCounts).map(([name, count]) => ({
    name,
    Occurrences: count
  })).sort((a, b) => b.Occurrences - a.Occurrences);

  // 3. Educational contents based on phase
  const getPhaseDetails = () => {
    switch (cycleInfo.phaseName) {
      case 'Menstrual':
        return {
          ovulationText: 'Ovulation predicted in ~14 days.',
          windowText: 'Low Fertility window.',
          summary: 'Your body is shedding the uterine lining. Rest, gentle stretching, and hydration are prioritized as energy reserves are low.'
        };
      case 'Follicular':
        return {
          ovulationText: 'Ovulation predicted in ~7 days.',
          windowText: 'Fertility starting to rise.',
          summary: 'FSH (Follicle Stimulating Hormone) triggers estrogen rise, stimulating follicle development. Physical strength and mood climb.'
        };
      case 'Ovulatory':
        return {
          ovulationText: 'Ovulation day is active today/tomorrow!',
          windowText: 'Peak Fertility window (3 days remaining).',
          summary: 'LH (Luteinizing Hormone) peaks, releasing the mature egg. Estrogen peaks. You are in your peak metabolic and fertile window.'
        };
      case 'Luteal':
        return {
          ovulationText: 'Ovulation completed.',
          windowText: 'Low Fertility window.',
          summary: 'Progesterone dominancy prepares the uterine lining for potential implantation. Metablism peaks, nesting and rest increase.'
        };
    }
  };

  const phaseDetails = getPhaseDetails();

  return (
    <div className="flex-1 p-5 pt-[68px] space-y-5 pb-10 overflow-y-auto">
      
      {/* Page Title */}
      <div>
        <h2 className="text-xl font-bold font-serif text-textpurple">Insights & Analytics</h2>
        <p className="text-xs text-slate-400 mt-0.5">Symptom intelligence, trends, and fertility prediction</p>
      </div>

      {/* Interactive Phase Gauges & Fertility Context */}
      <div className="p-5 rounded-3xl bg-white border border-purple-100/50 shadow-sm space-y-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-primary flex items-center justify-center">
              <Calendar className="w-4.5 h-4.5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-textpurple">Fertility & Ovulation Tracking</h4>
              <p className="text-[9px] text-slate-400">Current Phase: {cycleInfo.phaseName}</p>
            </div>
          </div>
          {cycleInfo.isFertile ? (
            <span className="text-[9px] font-bold text-white bg-emerald-500 border border-emerald-400 py-1 px-2.5 rounded-full animate-pulse-ring">
              Peak Fertility
            </span>
          ) : (
            <span className="text-[9px] font-bold text-slate-400 bg-slate-100 py-1 px-2.5 rounded-full">
              Low Fertility
            </span>
          )}
        </div>

        {/* Phase progress visual timeline dots */}
        <div>
          <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 block mb-2">Cycle Timeline (Avg {profile.avgCycleLength} Days)</span>
          <div className="flex justify-between gap-1 items-center bg-slate-50 p-2.5 rounded-2xl border border-purple-50">
            {Array.from({ length: 14 }).map((_, i) => {
              // map to 14 markers to save UI space
              const stepIndex = Math.floor((profile.avgCycleLength / 14) * i) + 1;
              const isCurrent = Math.abs(cycleInfo.cycleDay - stepIndex) <= 1;
              
              let markerColor = 'bg-slate-200';
              if (stepIndex <= profile.avgPeriodLength) markerColor = 'bg-rose-400';
              else if (stepIndex <= Math.floor(profile.avgCycleLength / 2) - 2) markerColor = 'bg-purple-300';
              else if (stepIndex <= Math.floor(profile.avgCycleLength / 2) + 2) markerColor = 'bg-amber-400';
              else markerColor = 'bg-indigo-400';

              return (
                <div 
                  key={i} 
                  className={`relative flex items-center justify-center shrink-0 ${
                    isCurrent ? 'w-5.5 h-5.5 rounded-full bg-white shadow-xs border border-purple-100' : 'w-2 h-2'
                  }`}
                >
                  {isCurrent ? (
                    <span className={`w-3.5 h-3.5 rounded-full ${markerColor} block animate-pulse`} />
                  ) : (
                    <span className={`w-2 h-2 rounded-full ${markerColor} block`} />
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-2 px-1">
            <span className="text-rose-400">Menstrual</span>
            <span className="text-purple-400">Follicular</span>
            <span className="text-amber-500">Ovulatory</span>
            <span className="text-indigo-400">Luteal</span>
          </div>
        </div>

        {/* Education and Prediction info */}
        <div className="space-y-2 pt-2 border-t border-purple-50 text-xs">
          <div className="flex justify-between items-center text-[11px]">
            <span className="font-semibold text-textpurple">Ovulation Status:</span>
            <span className="font-bold text-slate-600">{phaseDetails.ovulationText}</span>
          </div>
          <div className="flex justify-between items-center text-[11px]">
            <span className="font-semibold text-textpurple">Window Details:</span>
            <span className="font-bold text-slate-600">{phaseDetails.windowText}</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed pt-1.5 border-t border-dashed border-purple-50">
            {phaseDetails.summary}
          </p>
        </div>
      </div>

      {/* AI Symptom Intelligence Box */}
      <div className="p-4 rounded-2xl glass-card border border-purple-100/50 flex gap-3.5 items-start">
        <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm">
          <Brain className="w-5 h-5 fill-white/10" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-textpurple flex items-center gap-1.5">
            AI Generated Diagnostic Trends
          </h4>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            "You typically experience **bloating** and **cramps** 3 days before your period (Day 25-27 of the Luteal phase), matching cyclic drops in progesterone. Your **energy** peaks around Day 13-14, matching LH surges during ovulation."
          </p>
        </div>
      </div>

      {/* Recharts - Mood/Energy Timeline */}
      <div className="p-5 rounded-3xl bg-white border border-purple-100/50 shadow-sm space-y-4">
        <h4 className="text-xs font-bold text-textpurple flex items-center gap-1.5 border-b border-purple-50 pb-2">
          <Activity className="w-4 h-4 text-primary" /> Energy & Sleep (Last 15 Logs)
        </h4>
        <div className="h-48 w-full text-[10px]">
          {lineChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineChartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1E8FF" />
                <XAxis dataKey="date" stroke="#94A3B8" />
                <YAxis stroke="#94A3B8" domain={[0, 12]} />
                <Tooltip />
                <Line type="monotone" dataKey="Energy" stroke="#A78BFA" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Sleep" stroke="#F9A8D4" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">Not enough log history</div>
          )}
        </div>
        <div className="flex justify-center gap-4 text-[10px] font-semibold">
          <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-primary" /> Energy (1-5)</div>
          <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-accent" /> Sleep (Hours)</div>
        </div>
      </div>

      {/* Recharts - Symptom Frequency Chart */}
      <div className="p-5 rounded-3xl bg-white border border-purple-100/50 shadow-sm space-y-4">
        <h4 className="text-xs font-bold text-textpurple flex items-center gap-1.5 border-b border-purple-50 pb-2">
          <TrendingUp className="w-4 h-4 text-accent" /> Symptom Frequency (6-Month History)
        </h4>
        <div className="h-48 w-full text-[10px]">
          {barChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1E8FF" />
                <XAxis dataKey="name" stroke="#94A3B8" />
                <YAxis stroke="#94A3B8" />
                <Tooltip />
                <Bar dataKey="Occurrences" fill="#A78BFA" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">No symptoms logged yet</div>
          )}
        </div>
      </div>

    </div>
  );
};
