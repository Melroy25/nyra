import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { mockMoods } from '../data/mood';
import { useStore } from '../store/useStore';
import { Check, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { motion } from 'framer-motion';

import { apiSaveCycleLog } from '../lib/api';

export default function MoodPage() {
  const router = useRouter();
  const { cycleLogs, logMood, logNotes, recalculateCycleMetrics } = useStore();

  const [selectedMood, setSelectedMood] = useState<string>('Calm');
  const [notes, setNotes] = useState<string>('');
  const [isSaved, setIsSaved] = useState(false);

  // Map mood labels to numeric scale for charting
  const moodScoreMap: Record<string, number> = {
    'Happy': 5,
    'Calm': 4,
    'Emotional': 3,
    'Anxious': 2,
    'Irritated': 1,
    'Sad': 0,
  };

  const getMoodEmoji = (score: number) => {
    if (score === 5) return '🌸';
    if (score === 4) return '🧘';
    if (score === 3) return '💖';
    if (score === 2) return '😰';
    if (score === 1) return '😠';
    return '🥺';
  };

  // Compile last 7 days of mood logs for Recharts
  const chartData = cycleLogs
    .filter((log) => log.mood !== null)
    .slice(-7)
    .map((log) => ({
      date: new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: moodScoreMap[log.mood || 'Calm'] || 4,
      mood: log.mood,
    }));

  const handleSave = async () => {
    const today = new Date().toISOString().split('T')[0];
    logMood(today, selectedMood);
    if (notes) logNotes(today, notes);

    try {
      await apiSaveCycleLog({ date: today, mood: selectedMood, notes: notes || null });
    } catch (err) {
      console.log('Saved locally:', err);
    }
    
    recalculateCycleMetrics();
    setIsSaved(true);
    
    setTimeout(() => {
      router.push('/dashboard');
    }, 1200);
  };

  return (
    <div className="max-w-[800px] mx-auto px-container-padding-mobile pt-stack-md pb-12 flex flex-col gap-stack-lg">
      
      {/* Page Header */}
      <section className="flex flex-col gap-unit animate-entrance">
        <h1 className="font-serif font-bold text-3xl md:text-5xl text-tertiary">Log Mood</h1>
        <p className="text-sm text-on-surface-variant">Sync your emotional rhythms with your cycle.</p>
      </section>

      {/* Mood Selector Grid */}
      <section className="flex flex-col gap-stack-sm">
        <h2 className="font-semibold text-sm text-on-surface mb-2">How do you feel in this moment?</h2>
        
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {mockMoods.map((mood) => {
            const isSelected = selectedMood === mood.name;
            return (
              <button
                key={mood.id}
                onClick={() => setSelectedMood(mood.name)}
                className={`glass-card rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all border ${
                  isSelected
                    ? 'border-primary ring-2 ring-primary bg-primary/5 scale-[0.98]'
                    : 'border-outline-variant/40 bg-white/40 hover:bg-white/70'
                }`}
              >
                <span className="text-3xl filter drop-shadow-sm">{mood.emoji}</span>
                <span className="font-semibold text-xs text-on-surface">{mood.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Additional Notes */}
      <section className="flex flex-col gap-stack-sm">
        <h2 className="font-semibold text-sm text-on-surface">Notes (Triggers, physical symptoms connection)</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="I noticed I have minor sugar cravings or feel a bit more reflective..."
          className="w-full min-h-[100px] glass-card rounded-xl p-4 font-semibold text-sm text-on-surface placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent resize-none transition-shadow"
        />
      </section>

      {/* Save Trigger */}
      <div>
        <button
          onClick={handleSave}
          disabled={isSaved}
          className="w-full bg-gradient-to-r from-primary to-secondary text-white font-bold text-sm py-4 rounded-full shadow-lg shadow-primary/20 hover:opacity-95 transform hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          {isSaved ? (
            <>
              <Check className="w-5 h-5" /> Mood Saved!
            </>
          ) : (
            'Save Mood Log'
          )}
        </button>
      </div>

      {/* Mood History Chart */}
      <section className="glass-card rounded-xl p-6 shadow-sm border border-white/40">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2 text-primary font-semibold text-sm">
            <Calendar className="w-4 h-4" />
            <span>Mood History Trends</span>
          </div>
          <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Last 7 logs</span>
        </div>

        {chartData.length > 0 ? (
          <div className="w-full h-64 text-xs font-semibold">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2D3FF" opacity={0.3} />
                <XAxis dataKey="date" stroke="#7a7583" tickLine={false} />
                <YAxis 
                  domain={[0, 5]} 
                  ticks={[0, 1, 2, 3, 4, 5]}
                  tickFormatter={(val) => getMoodEmoji(val)}
                  stroke="#7a7583" 
                  tickLine={false} 
                />
                <Tooltip 
                  formatter={(value: any, name: any, props: any) => [props.payload.mood, 'Mood']}
                  contentStyle={{ background: 'rgba(255, 255, 255, 0.9)', borderRadius: '1rem', border: '1px solid #eaddff' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#674bb5" 
                  strokeWidth={3} 
                  dot={{ r: 5, fill: '#674bb5', strokeWidth: 2, stroke: '#ffffff' }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-sm text-on-surface-variant italic">
            Log some moods to populate your history trends graph.
          </div>
        )}
      </section>

    </div>
  );
}
