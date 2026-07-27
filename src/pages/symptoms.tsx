import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Droplet, Brain, Sparkles, Wind, Battery, Activity, Frown, Sparkle, Plus, Check, Calendar, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Symptom } from '../types';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

import { apiSaveCycleLog } from '../lib/api';

const initialSymptomsList: Symptom[] = [
  { id: 'Cramps', name: 'Cramps', iconName: 'Droplet' },
  { id: 'Headache', name: 'Headache', iconName: 'Brain' },
  { id: 'Acne', name: 'Acne', iconName: 'Sparkles' },
  { id: 'Bloating', name: 'Bloating', iconName: 'Wind' },
  { id: 'Fatigue', name: 'Fatigue', iconName: 'Battery' },
  { id: 'Back pain', name: 'Back pain', iconName: 'Activity' },
  { id: 'Nausea', name: 'Nausea', iconName: 'Frown' },
  { id: 'Breast tenderness', name: 'Breast tenderness', iconName: 'Sparkle' },
];

export default function SymptomsPage() {
  const router = useRouter();
  const { cycleLogs, logSymptom, removeSymptom, setSeverity, logNotes, recalculateCycleMetrics } = useStore();

  const [symptomsList, setSymptomsList] = useState<Symptom[]>(initialSymptomsList);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(['Bloating']);
  const [severity, setSeverityVal] = useState<number>(5);
  const [notes, setNotes] = useState<string>('');
  const [isSaved, setIsSaved] = useState(false);

  // Custom Symptom Modal State
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [customName, setCustomName] = useState('');

  const toggleSymptom = (id: string) => {
    if (selectedSymptoms.includes(id)) {
      setSelectedSymptoms(selectedSymptoms.filter((s) => s !== id));
    } else {
      setSelectedSymptoms([...selectedSymptoms, id]);
    }
  };

  const handleAddCustomSymptom = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customName.trim();
    if (!trimmed) return;

    if (!symptomsList.find((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
      const newSym: Symptom = { id: trimmed, name: trimmed, iconName: 'Activity' };
      setSymptomsList([...symptomsList, newSym]);
      setSelectedSymptoms([...selectedSymptoms, trimmed]);
    } else {
      if (!selectedSymptoms.includes(trimmed)) {
        setSelectedSymptoms([...selectedSymptoms, trimmed]);
      }
    }

    setCustomName('');
    setShowAddCustomModal(false);
  };

  const handleSave = async () => {
    const today = new Date().toISOString().split('T')[0];
    
    // Clear previous logged items first or set new items
    symptomsList.forEach((s) => {
      removeSymptom(today, s.id);
    });
    
    selectedSymptoms.forEach((s) => {
      logSymptom(today, s);
    });

    setSeverity(today, severity);
    if (notes) logNotes(today, notes);
    
    try {
      await apiSaveCycleLog({
        date: today,
        symptoms: selectedSymptoms,
        severity,
        notes: notes || null,
      });
    } catch (err) {
      console.log('Saved symptoms locally:', err);
    }

    recalculateCycleMetrics();
    setIsSaved(true);
    
    setTimeout(() => {
      router.push('/dashboard');
    }, 1200);
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Droplet': return Droplet;
      case 'Brain': return Brain;
      case 'Sparkles': return Sparkles;
      case 'Wind': return Wind;
      case 'Battery': return Battery;
      case 'Activity': return Activity;
      case 'Frown': return Frown;
      case 'Sparkle': return Sparkle;
      default: return Activity;
    }
  };

  // Compile last 7 days of symptom logs for Recharts trend graph
  const chartData = cycleLogs
    .filter((log) => (log.symptoms && log.symptoms.length > 0) || log.severity !== undefined)
    .slice(-7)
    .map((log) => ({
      date: new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      severity: log.severity !== undefined ? log.severity : 5,
      symptomCount: log.symptoms ? log.symptoms.length : 0,
      symptomsText: log.symptoms && log.symptoms.length > 0 ? log.symptoms.join(', ') : 'None',
    }));

  return (
    <div className="max-w-[700px] mx-auto px-container-padding-mobile pt-stack-md pb-12 flex flex-col gap-stack-lg">
      
      {/* Page Header */}
      <section className="flex flex-col gap-unit animate-entrance">
        <h1 className="font-serif font-bold text-3xl md:text-5xl text-primary dark:text-[#eee6ff]">Log Symptoms</h1>
        <p className="text-sm text-on-surface-variant dark:text-[#c8bedd]">How are you feeling today?</p>
      </section>

      {/* Symptoms Grid */}
      <section className="flex flex-col gap-stack-sm">
        <h2 className="font-semibold text-sm text-on-surface dark:text-[#eee6ff] mb-2">Select what you&apos;re experiencing</h2>
        
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {symptomsList.map((sym) => {
            const isSelected = selectedSymptoms.includes(sym.id);
            const IconComponent = getIcon(sym.iconName);
            return (
              <button
                key={sym.id}
                onClick={() => toggleSymptom(sym.id)}
                className={`glass-card rounded-2xl p-4 flex flex-col items-center justify-center gap-2 aspect-square cursor-pointer active:scale-95 transition-all border ${
                  isSelected
                    ? 'bg-primary/10 border-2 border-primary text-primary shadow-inner scale-[0.98]'
                    : 'border-outline-variant/40 dark:border-[#3a2d58] bg-white/40 dark:bg-[#1c1230]/40 hover:bg-white/70 text-on-surface dark:text-[#eee6ff]'
                }`}
              >
                <div className={`transition-colors ${isSelected ? 'text-primary dark:text-[#d4b8ff]' : 'text-on-surface-variant dark:text-[#c8bedd]'}`}>
                  <IconComponent className="w-8 h-8" />
                </div>
                <span className="font-semibold text-xs text-center line-clamp-2">{sym.name}</span>
              </button>
            );
          })}

          <button 
            onClick={() => setShowAddCustomModal(true)}
            className="glass-card rounded-2xl p-4 flex flex-col items-center justify-center gap-2 aspect-square border-2 border-dashed border-outline-variant/60 dark:border-[#3a2d58] bg-white/20 dark:bg-[#1c1230]/20 text-outline dark:text-[#c8bedd] hover:bg-white/50 dark:hover:bg-[#1c1230]/60 active:scale-95 transition-all"
          >
            <Plus className="w-8 h-8 text-primary dark:text-[#d4b8ff]" />
            <span className="font-semibold text-xs">Add Custom</span>
          </button>
        </div>
      </section>

      {/* Severity Pain Level Slider */}
      <section className="glass-card rounded-2xl p-6 flex flex-col gap-4 relative overflow-hidden shadow-sm border border-white/50 dark:border-[#3a2d58]/50">
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-tertiary-fixed/30 opacity-60 blur-3xl rounded-full pointer-events-none"></div>
        
        <div className="flex justify-between items-center relative z-10">
          <div>
            <h2 className="font-bold text-sm text-on-surface dark:text-[#eee6ff]">Pain / Severity Level</h2>
            <p className="text-[11px] text-on-surface-variant dark:text-[#c8bedd]">Rate how intense your symptoms feel right now</p>
          </div>
          <span className="font-serif font-bold text-3xl text-primary dark:text-[#d4b8ff]">{severity} / 10</span>
        </div>
        
        <div className="relative z-10 w-full pt-2">
          <input
            type="range"
            min="0"
            max="10"
            value={severity}
            onChange={(e) => setSeverityVal(parseInt(e.target.value))}
            className="w-full h-2 bg-outline-variant/60 dark:bg-white/10 rounded-full appearance-none outline-none focus:ring-0 cursor-pointer"
            style={{ '--value': `${severity * 10}%` } as React.CSSProperties}
          />
          <div className="flex justify-between text-[11px] font-bold text-outline dark:text-[#c8bedd] mt-2">
            <span>0 - Mild / None</span>
            <span>5 - Moderate</span>
            <span>10 - Severe</span>
          </div>
        </div>
      </section>

      {/* Notes Textarea */}
      <section className="flex flex-col gap-stack-sm">
        <h2 className="font-bold text-sm text-on-surface dark:text-[#eee6ff]">Additional Notes</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any context, pain locations, or triggers you noticed?"
          className="w-full min-h-[120px] glass-card rounded-2xl p-4 font-semibold text-sm text-on-surface dark:text-[#eee6ff] placeholder-outline dark:placeholder-[#c8bedd]/50 focus:outline-none focus:ring-2 focus:ring-primary/40 border border-white/50 dark:border-[#3a2d58] resize-none transition-shadow"
        />
      </section>

      {/* Save Button */}
      <div>
        <button
          onClick={handleSave}
          disabled={isSaved}
          className="w-full bg-gradient-to-r from-primary to-secondary text-white font-bold text-sm py-4 rounded-full shadow-lg shadow-primary/20 hover:opacity-95 transform hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          {isSaved ? (
            <>
              <Check className="w-5 h-5" /> Saved Successfully!
            </>
          ) : (
            'Save Symptom Log'
          )}
        </button>
      </div>

      {/* ── Symptom Severity & History Trend Graph ── */}
      <section className="glass-card rounded-2xl p-6 shadow-sm border border-white/40 dark:border-[#3a2d58]/50">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2 text-primary dark:text-[#d4b8ff] font-bold text-sm">
            <Calendar className="w-4 h-4" />
            <span>Symptom Severity Trends</span>
          </div>
          <span className="text-[10px] font-bold text-outline dark:text-[#c8bedd] uppercase tracking-wider">Logged History</span>
        </div>

        {chartData.length > 0 ? (
          <div className="w-full h-64 text-xs font-semibold">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2D3FF" opacity={0.3} />
                <XAxis dataKey="date" stroke="#7a7583" tickLine={false} />
                <YAxis 
                  domain={[0, 10]} 
                  ticks={[0, 2, 4, 6, 8, 10]}
                  stroke="#7a7583" 
                  tickLine={false} 
                />
                <Tooltip 
                  formatter={(value: any, name: any, props: any) => [
                    `${value}/10 Pain (${props.payload.symptomsText})`,
                    'Severity',
                  ]}
                  contentStyle={{ background: 'rgba(255, 255, 255, 0.95)', borderRadius: '1rem', border: '1px solid #eaddff', color: '#18003d' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="severity" 
                  stroke="#7c5cbf" 
                  strokeWidth={3} 
                  dot={{ r: 5, fill: '#7c5cbf', strokeWidth: 2, stroke: '#ffffff' }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-44 flex items-center justify-center text-xs text-on-surface-variant dark:text-[#c8bedd] italic text-center p-4">
            Log your symptoms and pain severity above to display your symptom trend graph.
          </div>
        )}
      </section>

      {/* ── Add Custom Symptom Modal ── */}
      {showAddCustomModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form 
            onSubmit={handleAddCustomSymptom}
            className="bg-white dark:bg-[#16102a] border border-white/40 dark:border-[#3a2d58] rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200"
          >
            <div className="flex justify-between items-center border-b border-outline-variant/20 dark:border-[#3a2d58] pb-3">
              <h3 className="font-serif font-bold text-lg text-[#18003d] dark:text-[#eee6ff]">
                Add Custom Symptom
              </h3>
              <button
                type="button"
                onClick={() => setShowAddCustomModal(false)}
                className="p-1 rounded-full text-on-surface-variant hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-[#3d3050] dark:text-[#c8bedd] block mb-2">Symptom Name</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Dizziness, Sugar Cravings, Mood Swings"
                autoFocus
                className="w-full px-4 py-3 rounded-xl border border-outline-variant/40 dark:border-[#3a2d58] bg-white/50 dark:bg-[#1c1230]/50 text-sm font-semibold text-[#18003d] dark:text-[#eee6ff] focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddCustomModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-black/5 dark:hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-md hover:opacity-90 transition-opacity"
              >
                Add Symptom
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
