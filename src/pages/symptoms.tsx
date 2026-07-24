import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Droplet, Brain, Sparkles, Wind, Battery, Activity, Frown, Sparkle, Plus, Check } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Symptom } from '../types';
import { motion } from 'framer-motion';

const symptomsList: Symptom[] = [
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

  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(['Bloating']);
  const [severity, setSeverityVal] = useState<number>(5);
  const [notes, setNotes] = useState<string>('');
  const [isSaved, setIsSaved] = useState(false);

  const toggleSymptom = (id: string) => {
    if (selectedSymptoms.includes(id)) {
      setSelectedSymptoms(selectedSymptoms.filter((s) => s !== id));
    } else {
      setSelectedSymptoms([...selectedSymptoms, id]);
    }
  };

  const handleSave = () => {
    const today = new Date().toISOString().split('T')[0];
    
    // Clear previous logged items first or set new items
    symptomsList.forEach((s) => {
      removeSymptom(today, s.id);
    });
    
    selectedSymptoms.forEach((s) => {
      logSymptom(today, s);
    });

    setSeverity(today, severity);
    logNotes(today, notes);
    
    recalculateCycleMetrics();
    setIsSaved(true);
    
    setTimeout(() => {
      router.push('/dashboard');
    }, 1500);
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

  return (
    <div className="max-w-[700px] mx-auto px-container-padding-mobile pt-stack-md pb-12 flex flex-col gap-stack-lg">
      
      {/* Page Header */}
      <section className="flex flex-col gap-unit animate-entrance">
        <h1 className="font-serif font-bold text-3xl md:text-5xl text-primary">Log Symptoms</h1>
        <p className="text-sm text-on-surface-variant">How are you feeling today?</p>
      </section>

      {/* Symptoms Grid */}
      <section className="flex flex-col gap-stack-sm">
        <h2 className="font-semibold text-sm text-on-surface mb-2">Select what you're experiencing</h2>
        
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {symptomsList.map((sym) => {
            const isSelected = selectedSymptoms.includes(sym.id);
            const IconComponent = getIcon(sym.iconName);
            return (
              <button
                key={sym.id}
                onClick={() => toggleSymptom(sym.id)}
                className={`glass-card rounded-xl p-4 flex flex-col items-center justify-center gap-2 aspect-square cursor-pointer active:scale-95 transition-all ${
                  isSelected
                    ? 'bg-primary/10 border-2 border-primary text-primary shadow-inner scale-[0.98]'
                    : 'border-outline-variant bg-white/40 hover:bg-white/70 text-on-surface'
                }`}
              >
                <div className={`transition-colors ${isSelected ? 'text-primary' : 'text-on-surface-variant'}`}>
                  <IconComponent className="w-8 h-8" />
                </div>
                <span className="font-semibold text-xs text-center line-clamp-2">{sym.name}</span>
              </button>
            );
          })}

          <button className="glass-card rounded-xl p-4 flex flex-col items-center justify-center gap-2 aspect-square border-dashed border-outline-variant/60 bg-white/20 text-outline hover:bg-white/50 active:scale-95 transition-all">
            <Plus className="w-8 h-8 text-outline-variant" />
            <span className="font-semibold text-xs">Add Custom</span>
          </button>
        </div>
      </section>

      {/* Severity Slider */}
      <section className="glass-card rounded-xl p-6 flex flex-col gap-4 relative overflow-hidden shadow-sm">
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-tertiary-fixed/30 opacity-60 blur-3xl rounded-full pointer-events-none"></div>
        
        <div className="flex justify-between items-center relative z-10">
          <h2 className="font-bold text-sm text-on-surface">Severity</h2>
          <span className="font-serif font-bold text-2xl text-primary">{severity}</span>
        </div>
        
        <div className="relative z-10 w-full pt-2">
          <input
            type="range"
            min="0"
            max="10"
            value={severity}
            onChange={(e) => setSeverityVal(parseInt(e.target.value))}
            className="w-full h-1 bg-outline-variant/60 rounded-full appearance-none outline-none focus:ring-0 cursor-pointer"
            style={{ '--value': `${severity * 10}%` } as React.CSSProperties}
          />
          <div className="flex justify-between text-[10px] text-outline font-bold mt-2">
            <span>Mild</span>
            <span>Severe</span>
          </div>
        </div>
      </section>

      {/* Notes Textarea */}
      <section className="flex flex-col gap-stack-sm">
        <h2 className="font-bold text-sm text-on-surface">Additional Notes</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any context or triggers you noticed?"
          className="w-full min-h-[120px] glass-card rounded-xl p-4 font-semibold text-sm text-on-surface placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent resize-none transition-shadow"
        />
      </section>

      {/* Save Button */}
      <div className="mt-4 pb-6">
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
            'Save Log'
          )}
        </button>
      </div>

    </div>
  );
}
