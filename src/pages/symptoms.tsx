import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Droplet, Brain, Sparkles, Wind, Battery, Activity, Frown, Sparkle, Plus, Check, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Symptom } from '../types';

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
  const { logSymptom, removeSymptom, setSeverity, logNotes, recalculateCycleMetrics } = useStore();

  const [symptomsList, setSymptomsList] = useState<Symptom[]>(initialSymptomsList);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(['Cramps', 'Bloating']);
  
  // Individual Pain Level / Severity per symptom (e.g. { Cramps: 7, Bloating: 4 })
  const [severities, setSeverities] = useState<Record<string, number>>({
    'Cramps': 7,
    'Bloating': 4,
  });

  const [notes, setNotes] = useState<string>('');
  const [isSaved, setIsSaved] = useState(false);

  // Custom Symptom Modal State
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [customName, setCustomName] = useState('');

  const toggleSymptom = (id: string) => {
    if (selectedSymptoms.includes(id)) {
      setSelectedSymptoms(selectedSymptoms.filter((s) => s !== id));
      const nextSev = { ...severities };
      delete nextSev[id];
      setSeverities(nextSev);
    } else {
      setSelectedSymptoms([...selectedSymptoms, id]);
      setSeverities({ ...severities, [id]: 5 });
    }
  };

  const handleSeverityChange = (id: string, val: number) => {
    setSeverities({ ...severities, [id]: val });
  };

  const handleAddCustomSymptom = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customName.trim();
    if (!trimmed) return;

    if (!symptomsList.find((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
      const newSym: Symptom = { id: trimmed, name: trimmed, iconName: 'Activity' };
      setSymptomsList([...symptomsList, newSym]);
      setSelectedSymptoms([...selectedSymptoms, trimmed]);
      setSeverities({ ...severities, [trimmed]: 5 });
    } else {
      if (!selectedSymptoms.includes(trimmed)) {
        setSelectedSymptoms([...selectedSymptoms, trimmed]);
        setSeverities({ ...severities, [trimmed]: 5 });
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

    // Compute max pain level across selected symptoms for primary log severity
    const maxPain = selectedSymptoms.length > 0
      ? Math.max(...selectedSymptoms.map((s) => severities[s] ?? 5))
      : 0;

    setSeverity(today, maxPain);
    if (notes) logNotes(today, notes);
    
    try {
      await apiSaveCycleLog({
        date: today,
        symptoms: selectedSymptoms,
        severity: maxPain,
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

  const getPainLabel = (val: number) => {
    if (val === 0) return 'None';
    if (val <= 3) return 'Mild Pain';
    if (val <= 6) return 'Moderate Pain';
    if (val <= 8) return 'Severe Pain';
    return 'Extreme Pain';
  };

  const getPainBadgeColor = (val: number) => {
    if (val <= 3) return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800';
    if (val <= 6) return 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800';
    return 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800';
  };

  return (
    <div className="max-w-[700px] mx-auto px-container-padding-mobile pt-stack-md pb-12 flex flex-col gap-stack-lg">
      
      {/* Page Header */}
      <section className="flex flex-col gap-unit animate-entrance">
        <h1 className="font-serif font-bold text-3xl md:text-5xl text-primary dark:text-[#eee6ff]">Log Symptoms</h1>
        <p className="text-sm text-on-surface-variant dark:text-[#c8bedd]">Select what you&apos;re experiencing and set pain levels individually.</p>
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

      {/* ── Per-Symptom Pain Level / Severity Controls ── */}
      {selectedSymptoms.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-base text-on-surface dark:text-[#eee6ff]">Symptom Pain &amp; Intensity Levels</h2>
            <span className="text-xs font-semibold text-on-surface-variant dark:text-[#c8bedd]">{selectedSymptoms.length} Selected</span>
          </div>

          <div className="space-y-3">
            {selectedSymptoms.map((symId) => {
              const symObj = symptomsList.find((s) => s.id === symId) || { id: symId, name: symId, iconName: 'Activity' };
              const IconComp = getIcon(symObj.iconName);
              const val = severities[symId] ?? 5;

              return (
                <div 
                  key={symId}
                  className="glass-card rounded-2xl p-5 border border-white/50 dark:border-[#3a2d58]/50 shadow-sm flex flex-col gap-3"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary dark:text-[#d4b8ff]">
                        <IconComp className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-sm text-[#18003d] dark:text-[#eee6ff]">{symObj.name}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-xl border ${getPainBadgeColor(val)}`}>
                        {getPainLabel(val)}
                      </span>
                      <span className="font-serif font-bold text-lg text-primary dark:text-[#d4b8ff]">{val} / 10</span>
                    </div>
                  </div>

                  {/* Individual Range Slider */}
                  <div className="w-full pt-1">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={val}
                      onChange={(e) => handleSeverityChange(symId, parseInt(e.target.value))}
                      className="w-full h-2 bg-outline-variant/60 dark:bg-white/10 rounded-full appearance-none outline-none focus:ring-0 cursor-pointer"
                      style={{ '--value': `${val * 10}%` } as React.CSSProperties}
                    />
                    <div className="flex justify-between text-[10px] font-bold text-outline dark:text-[#c8bedd] mt-1.5">
                      <span>0 (None)</span>
                      <span>5 (Moderate)</span>
                      <span>10 (Severe)</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Additional Notes */}
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
