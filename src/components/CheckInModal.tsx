import React, { useState, useEffect } from 'react';
import { useNyraStore } from '../store/useNyraStore';
import type { DailyLog, MoodType, SymptomType, CravingType, FlowType } from '../types';
import { X, Check, Save } from 'lucide-react';
import { formatDate } from '../data/mockData';

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateStr?: string; // defaults to today
}

export const CheckInModal: React.FC<CheckInModalProps> = ({ isOpen, onClose, dateStr }) => {
  const { logs, addOrUpdateLog } = useNyraStore();
  const targetDate = dateStr || formatDate(new Date());

  // Find if there is an existing log for this date
  const existingLog = logs.find(l => l.date === targetDate);

  // Modal local state
  const [mood, setMood] = useState<MoodType>('Calm');
  const [flow, setFlow] = useState<FlowType>('None');
  const [symptoms, setSymptoms] = useState<SymptomType[]>([]);
  const [cravings, setCravings] = useState<CravingType[]>([]);
  const [energy, setEnergy] = useState<number>(4);
  const [sleep, setSleep] = useState<number>(7.5);
  const [hydration, setHydration] = useState<number>(4);
  const [notes, setNotes] = useState<string>('');

  // Load existing log if present
  useEffect(() => {
    if (existingLog) {
      setMood(existingLog.mood);
      setFlow(existingLog.flow);
      setSymptoms(existingLog.symptoms);
      setCravings(existingLog.cravings);
      setEnergy(existingLog.energy);
      setSleep(existingLog.sleep);
      setHydration(existingLog.hydration);
      setNotes(existingLog.notes);
    } else {
      // Defaults
      setMood('Calm');
      setFlow('None');
      setSymptoms([]);
      setCravings([]);
      setEnergy(4);
      setSleep(7.5);
      setHydration(4);
      setNotes('');
    }
  }, [existingLog, targetDate, isOpen]);

  if (!isOpen) return null;

  const moodOptions: { type: MoodType; emoji: string }[] = [
    { type: 'Calm', emoji: '😌' },
    { type: 'Happy', emoji: '😊' },
    { type: 'Emotional', emoji: '🥺' },
    { type: 'Sad', emoji: '😢' },
    { type: 'Irritated', emoji: '😠' },
    { type: 'Anxious', emoji: '😰' },
  ];

  const flowOptions: { type: FlowType; label: string }[] = [
    { type: 'None', label: 'None' },
    { type: 'Light', label: 'Light' },
    { type: 'Medium', label: 'Medium' },
    { type: 'Heavy', label: 'Heavy' },
  ];

  const symptomList: SymptomType[] = [
    'Cramps', 'Headache', 'Acne', 'Bloating', 'Back Pain', 'Fatigue', 'Breast Tenderness'
  ];

  const cravingList: CravingType[] = [
    'Chocolate', 'Sugar', 'Salty', 'Spicy', 'Carbs'
  ];

  const handleToggleSymptom = (s: SymptomType) => {
    if (symptoms.includes(s)) {
      setSymptoms(symptoms.filter(x => x !== s));
    } else {
      setSymptoms([...symptoms, s]);
    }
  };

  const handleToggleCraving = (c: CravingType) => {
    if (cravings.includes(c)) {
      setCravings(cravings.filter(x => x !== c));
    } else {
      setCravings([...cravings, c]);
    }
  };

  const handleSave = () => {
    const updatedLog: DailyLog = {
      date: targetDate,
      mood,
      flow,
      symptoms,
      cravings,
      energy,
      sleep,
      hydration,
      notes
    };
    
    addOrUpdateLog(updatedLog);
    onClose();
  };

  return (
    <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex flex-col justify-end">
      {/* Tap outside to close */}
      <div className="absolute inset-0 -z-10" onClick={onClose}></div>
      
      {/* Modal Container */}
      <div className="bg-white rounded-t-[32px] max-h-[90%] overflow-y-auto flex flex-col shadow-2xl border-t border-purple-100 p-6 text-textpurple">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-purple-50 mb-5">
          <div>
            <h3 className="font-serif text-lg font-bold">Log Health Details</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Logging for {new Date(targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Fields */}
        <div className="space-y-5 flex-1">
          {/* Flow intensity */}
          <div>
            <h4 className="text-xs font-bold mb-2 flex items-center gap-1.5">🩸 Period Flow</h4>
            <div className="grid grid-cols-4 gap-2">
              {flowOptions.map(f => (
                <button
                  key={f.type}
                  onClick={() => setFlow(f.type)}
                  className={`py-2 px-1 rounded-xl text-xs font-semibold border text-center transition-all ${
                    flow === f.type 
                      ? 'bg-accent/20 border-accent/70 text-accent font-bold shadow-sm'
                      : 'bg-white border-purple-100 text-slate-500 hover:bg-purple-50/50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mood Selector */}
          <div>
            <h4 className="text-xs font-bold mb-2 flex items-center gap-1.5">🧠 Current Mood</h4>
            <div className="grid grid-cols-3 gap-2">
              {moodOptions.map(m => (
                <button
                  key={m.type}
                  onClick={() => setMood(m.type)}
                  className={`py-2 px-2.5 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                    mood === m.type
                      ? 'bg-primary/20 border-primary/70 text-primary font-bold shadow-sm'
                      : 'bg-white border-purple-100 text-slate-500 hover:bg-purple-50/50'
                  }`}
                >
                  <span>{m.emoji}</span>
                  <span>{m.type}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Symptoms Checklist */}
          <div>
            <h4 className="text-xs font-bold mb-2 flex items-center gap-1.5">⚡ Symptoms</h4>
            <div className="flex flex-wrap gap-2">
              {symptomList.map(s => {
                const isSelected = symptoms.includes(s);
                return (
                  <button
                    key={s}
                    onClick={() => handleToggleSymptom(s)}
                    className={`py-1.5 px-3 rounded-full text-xs transition-all flex items-center gap-1 border ${
                      isSelected 
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm' 
                        : 'bg-white text-slate-500 border-purple-100 hover:bg-purple-50/50'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cravings Checklist */}
          <div>
            <h4 className="text-xs font-bold mb-2 flex items-center gap-1.5">🍕 Cravings</h4>
            <div className="flex flex-wrap gap-2">
              {cravingList.map(c => {
                const isSelected = cravings.includes(c);
                return (
                  <button
                    key={c}
                    onClick={() => handleToggleCraving(c)}
                    className={`py-1.5 px-3 rounded-full text-xs transition-all flex items-center gap-1 border ${
                      isSelected 
                        ? 'bg-pink-500 text-white border-pink-500 shadow-sm' 
                        : 'bg-white text-slate-500 border-purple-100 hover:bg-purple-50/50'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Energy & Sleep */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <h4 className="text-xs font-bold">⚡ Energy (1-5)</h4>
                <span className="text-xs font-bold text-primary">{energy}/5</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={energy}
                onChange={(e) => setEnergy(parseInt(e.target.value))}
                className="w-full accent-primary bg-purple-100 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <h4 className="text-xs font-bold">😴 Sleep Hours</h4>
                <span className="text-xs font-bold text-primary">{sleep.toFixed(1)}h</span>
              </div>
              <input
                type="range"
                min="0"
                max="24"
                step="0.5"
                value={sleep}
                onChange={(e) => setSleep(parseFloat(parseFloat(e.target.value).toFixed(1)))}
                className="w-full accent-primary bg-purple-100 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Water Intake */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <h4 className="text-xs font-bold">🥛 Water (Cups)</h4>
              <span className="text-xs font-bold text-primary">{hydration} cups</span>
            </div>
            <div className="flex gap-2 items-center">
              <input
                type="range"
                min="0"
                max="12"
                value={hydration}
                onChange={(e) => setHydration(parseInt(e.target.value))}
                className="flex-1 accent-primary bg-purple-100 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => setHydration(Math.max(0, hydration - 1))}
                  className="w-7 h-7 bg-slate-100 rounded-lg text-xs font-bold flex items-center justify-center hover:bg-slate-200"
                >
                  -
                </button>
                <button
                  onClick={() => setHydration(Math.min(12, hydration + 1))}
                  className="w-7 h-7 bg-primary/20 text-primary rounded-lg text-xs font-bold flex items-center justify-center hover:bg-primary/30"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <h4 className="text-xs font-bold mb-2">📝 Daily Notes</h4>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How are you feeling today physically or emotionally? Note any reminders..."
              className="w-full p-3 text-xs text-textpurple bg-slate-50 border border-purple-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="mt-6 w-full py-3.5 rounded-2xl bg-gradient-to-r from-primary to-accent text-white font-semibold flex items-center justify-center gap-2 hover:opacity-95 transition-opacity shadow-lg shadow-primary/20 cursor-pointer"
        >
          <Save className="w-4.5 h-4.5" />
          Save Log Details
        </button>
      </div>
    </div>
  );
};
