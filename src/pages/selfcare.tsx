import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { 
  Thermometer, Activity, Heart, Volume2, Play, Pause, ChevronRight, 
  Pill, Sparkles, Droplet, Plus, Trash2, Check, Clock, PlusCircle, 
  Target, Award 
} from 'lucide-react';
import { RoutineItem } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  apiGetRoutines, apiCreateRoutine, apiToggleRoutine, apiDeleteRoutine,
  apiGetDailyLog, apiUpdateWaterIntake 
} from '../lib/api';

interface CareItem {
  id: string;
  name: string;
  duration: string;
  description: string;
}

interface CareCategory {
  title: string;
  icon: any;
  color: string;
  items: CareItem[];
}

export default function SelfCarePage() {
  const { 
    routines, 
    toggleRoutine, 
    addRoutine, 
    deleteRoutine, 
    waterIntake, 
    waterGoal, 
    addWater, 
    resetWater 
  } = useStore();

  const [activeTab, setActiveTab] = useState<'wellness' | 'routines'>('wellness');
  const [activeCategory, setActiveCategory] = useState<string>('Pain Relief');
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const [trackProgress, setTrackProgress] = useState(0);

  // Medication states
  const [showAddModal, setShowAddModal] = useState(false);
  const [medName, setMedName] = useState('');
  const [medTime, setMedTime] = useState('08:00 AM');
  const [medFreq, setMedFreq] = useState('Daily');
  const [medType, setMedType] = useState<RoutineItem['type']>('medication');

  const categories: Record<string, CareCategory> = {
    'Pain Relief': {
      title: 'Pain Relief',
      icon: Thermometer,
      color: 'text-error bg-error-container/30',
      items: [
        { id: 'pr-1', name: 'Heat Therapy Compress', duration: '20 Min', description: 'Apply a hot water pack or compress to the lower abdomen to relax uterine muscles and improve local circulation.' },
        { id: 'pr-2', name: 'Pelvic Floor Stretch', duration: '10 Min', description: 'Gentle child pose and butterfly stretching to expand lower pelvic spaces and ease lower back tightness.' },
        { id: 'pr-3', name: 'Aromatherapy Massage', duration: '15 Min', description: 'Massage lavender or clary sage oil onto pressure points to calm nerve receptors and relieve menstrual cramps.' },
      ],
    },
    'Yoga': {
      title: 'Yoga',
      icon: Heart,
      color: 'text-primary bg-primary-fixed/30',
      items: [
        { id: 'yo-1', name: 'Period Comfort Yoga', duration: '15 Min', description: 'A restorative flow omitting intense inversions. Focuses on breathing, mild twists, and supportive bolsters.' },
        { id: 'yo-2', name: 'Relaxation Yin Yoga', duration: '25 Min', description: 'Deep, slow passive holds targeting connective tissues to switch off fight-or-flight signals.' },
        { id: 'yo-3', name: 'Hormonal Balance Flow', duration: '20 Min', description: 'Gentle sequence targeting the endocrine gland areas to ease transition symptoms during cycle shifts.' },
      ],
    },
    'Exercise & Recovery': {
      title: 'Exercise & Recovery',
      icon: Activity,
      color: 'text-secondary bg-secondary-fixed/30',
      items: [
        { id: 'ex-1', name: 'Low-Intensity Walking', duration: '30 Min', description: 'A casual outdoor walk to stimulate endorphins and natural pain relief without strain.' },
        { id: 'ex-2', name: 'Full-Body Active Recovery', duration: '20 Min', description: 'Light mobilization routines focusing on joints and breathwork to reduce muscle soreness.' },
        { id: 'ex-3', name: 'Strength Foundations', duration: '25 Min', description: 'Low weight, controlled resistance training suitable for the follicular or high-energy days.' },
      ],
    },
    'Meditation Sounds': {
      title: 'Meditation Sounds',
      icon: Volume2,
      color: 'text-tertiary bg-tertiary-fixed/30',
      items: [
        { id: 'so-1', name: 'Deep Sleep Solfeggio 528Hz', duration: 'Audio Track', description: 'Simulated sound wave known for cell repair, anxiety relief, and deep sleep cycles.' },
        { id: 'so-2', name: 'Anxiety Healing Ocean Waves', duration: 'Audio Track', description: 'Ambient shoreline notes to slow heart rate and ground hyperactive thoughts.' },
        { id: 'so-3', name: 'Guided Period Breathing Space', duration: 'Audio Track', description: 'A soft voice guide to breathing past lower back pain and physical cramping.' },
      ],
    },
  };

  // Simulate progress indicator for audio sounds
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (playingTrack) {
      interval = setInterval(() => {
        setTrackProgress((p) => {
          if (p >= 100) {
            setPlayingTrack(null);
            return 0;
          }
          return p + 2;
        });
      }, 500);
    } else {
      setTrackProgress(0);
    }
    return () => clearInterval(interval);
  }, [playingTrack]);

  const handleTrackPlayToggle = (trackId: string) => {
    if (playingTrack === trackId) {
      setPlayingTrack(null);
    } else {
      setPlayingTrack(trackId);
      setTrackProgress(0);
    }
  };

  const handleAddMedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!medName.trim()) return;

    addRoutine(medName, medTime, medFreq, medType);
    setMedName('');
    setShowAddModal(false);
  };

  // Group routines by type
  const medications = routines.filter((r) => r.type === 'medication');
  const morningSkincare = routines.filter((r) => r.type === 'skincare_morning');
  const nightSkincare = routines.filter((r) => r.type === 'skincare_night');
  const supplements = routines.filter((r) => r.type === 'supplement');

  return (
    <div className="max-w-[1100px] mx-auto px-container-padding-mobile md:px-container-padding-desktop pt-stack-md pb-12 flex flex-col gap-stack-lg">
      
      {/* Header section */}
      <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-entrance">
        <div>
          <h1 className="font-serif font-bold text-3xl md:text-5xl text-primary dark:text-[#d4b8ff]">Self Care Studio</h1>
          <p className="text-sm text-on-surface-variant dark:text-[#c8bedd] font-medium">
            Nurture your body with wellness exercises and daily medication check-offs.
          </p>
        </div>

        {/* Tab Switched pill selector */}
        <div className="flex bg-white/40 dark:bg-[#1c1230]/60 border border-outline-variant/30 dark:border-[#3a2d58]/60 rounded-2xl p-1 shadow-inner shrink-0">
          <button
            onClick={() => setActiveTab('wellness')}
            className={`px-5 py-2 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'wellness'
                ? 'bg-primary text-white shadow-md'
                : 'text-on-surface dark:text-[#c8bedd] hover:text-primary dark:hover:text-[#d4b8ff] hover:bg-white/40 dark:hover:bg-white/10'
            }`}
          >
            Wellness Studio
          </button>
          <button
            onClick={() => setActiveTab('routines')}
            className={`px-5 py-2 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'routines'
                ? 'bg-primary text-white shadow-md'
                : 'text-on-surface dark:text-[#c8bedd] hover:text-primary dark:hover:text-[#d4b8ff] hover:bg-white/40 dark:hover:bg-white/10'
            }`}
          >
            Daily Routines
          </button>
        </div>
      </section>

      {/* Main View Render */}
      <AnimatePresence mode="wait">
        {activeTab === 'wellness' ? (
          // WELLNESS TAB: YOGA, SOUNDS, EXERCISE
          <motion.div 
            key="wellness-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col gap-6"
          >
            {/* Category selection */}
            <div className="flex overflow-x-auto no-scrollbar gap-2.5 pb-2 -mx-container-padding-mobile px-container-padding-mobile md:mx-0 md:px-0">
              {Object.values(categories).map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.title;
                return (
                  <button
                    key={cat.title}
                    onClick={() => {
                      setActiveCategory(cat.title);
                      if (cat.title !== 'Meditation Sounds') setPlayingTrack(null);
                    }}
                    className={`whitespace-nowrap flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs border transition-all ${
                      isActive
                        ? 'bg-primary text-white border-primary shadow-sm scale-[1.02]'
                        : 'bg-white/50 dark:bg-[#1c1230]/70 border-outline-variant/35 dark:border-[#3a2d58]/70 hover:bg-white dark:hover:bg-[#261d48]/70 text-on-surface dark:text-[#c8bedd] hover:text-primary dark:hover:text-[#d4b8ff]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{cat.title}</span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter mt-2">
              <div className="md:col-span-8 flex flex-col gap-4">
                <h3 className="font-serif font-bold text-xl text-on-background dark:text-[#eee6ff]">{activeCategory} Guides</h3>
                <div className="flex flex-col gap-4">
                  {(categories[activeCategory]?.items ?? []).map((item) => {
                    const isSound = activeCategory === 'Meditation Sounds';
                    const isCurrentTrackPlaying = playingTrack === item.id;
                    
                    return (
                      <div 
                        key={item.id} 
                        className="glass-card rounded-xl p-5 border border-white/40 dark:border-white/10 shadow-sm relative overflow-hidden flex flex-col justify-between group transition-all"
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold bg-white/60 dark:bg-surface-container/60 border border-white/50 dark:border-white/10 px-2.5 py-0.5 rounded-full text-on-surface-variant">{item.duration}</span>
                            <h4 className="font-serif font-semibold text-lg text-[#18003d] dark:text-[#eee6ff] pt-2">{item.name}</h4>
                          </div>
                          
                          {isSound ? (
                            <button 
                              onClick={() => handleTrackPlayToggle(item.id)}
                              className={`p-3 rounded-full flex items-center justify-center shadow-md active:scale-95 transition-all ${
                                isCurrentTrackPlaying 
                                  ? 'bg-tertiary text-white shadow-tertiary/20' 
                                  : 'bg-gradient-to-r from-primary to-secondary text-white hover:opacity-95'
                              }`}
                            >
                              {isCurrentTrackPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                            </button>
                          ) : (
                            <button className="p-2 bg-white/60 dark:bg-surface-container-high/60 border border-white hover:bg-white rounded-full transition-colors">
                              <ChevronRight className="w-4 h-4 text-on-surface-variant" />
                            </button>
                          )}
                        </div>
                        
                        <p className="text-xs text-on-surface-variant dark:text-[#c8bedd] mt-3 leading-relaxed font-semibold">{item.description}</p>
                        
                        {isSound && isCurrentTrackPlaying && (
                          <div className="mt-4 w-full h-1 bg-outline-variant/30 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-tertiary transition-all duration-300"
                              style={{ width: `${trackProgress}%` }}
                            ></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Side Tracker widget */}
              <div className="md:col-span-4">
                <div className="glass-card rounded-2xl p-6 border border-white/40 dark:border-[#3a2d58]/50 shadow-sm flex flex-col justify-between relative overflow-hidden h-full min-h-[250px]">
                  <div className="absolute -right-12 -top-12 w-32 h-32 bg-primary-fixed/20 rounded-full blur-3xl"></div>
                  
                  <div className="space-y-4 z-10">
                    <div className="flex items-center gap-2 text-primary dark:text-inverse-primary font-bold text-sm">
                      <Target className="w-4 h-4" />
                      <span>Wellness Goal</span>
                    </div>
                    <h3 className="font-serif font-bold text-lg leading-snug">Relaxation Progress</h3>
                    <p className="text-xs text-on-surface-variant dark:text-[#c8bedd] leading-relaxed">
                      Completing active stretches stimulates lymphatic drainage and eases premenstrual tension.
                    </p>
                  </div>
                  
                  <div className="mt-8 space-y-3.5 z-10">
                    <div className="flex justify-between items-center text-xs font-semibold text-on-surface dark:text-[#eee6ff] border-b border-outline-variant/20 dark:border-[#3a2d58]/60 pb-2">
                      <span>Sessions Tracked</span>
                      <span className="font-bold text-primary dark:text-[#d4b8ff]">1 / 2 Completed</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-semibold text-on-surface dark:text-[#eee6ff]">
                      <span>Streak Status</span>
                      <span className="font-bold flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-tertiary" /> 4 days
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          // ROUTINES TAB: MEDICINES, SKINCARE, WATER INTAKE
          <motion.div 
            key="routines-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-12 gap-gutter"
          >
            {/* Left Column Checklist */}
            <div className="md:col-span-8 space-y-6">
              
              {/* Medications list */}
              <div className="glass-card rounded-2xl p-5 border border-white/40 dark:border-[#3a2d58]/50 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-serif font-bold text-lg text-on-background dark:text-[#eee6ff] flex items-center gap-2">
                    <Pill className="w-5 h-5 text-primary dark:text-[#d4b8ff]" />
                    <span>Medications</span>
                  </h3>
                  <button 
                    onClick={() => setShowAddModal(true)}
                    className="text-xs font-bold text-primary dark:text-[#d4b8ff] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Medication
                  </button>
                </div>

                {medications.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {medications.map((med) => (
                      <div key={med.id} className="flex justify-between items-center bg-white/40 dark:bg-surface-container/20 rounded-xl p-3 border border-white/50 dark:border-white/10">
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => toggleRoutine(med.id)}
                            className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                              med.completed ? 'bg-primary border-primary text-white' : 'border-outline-variant hover:bg-white'
                            }`}
                          >
                            {med.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </button>
                          <div>
                            <h4 className={`text-sm font-bold ${med.completed ? 'line-through text-outline' : 'text-on-surface'}`}>{med.name}</h4>
                            <div className="flex items-center gap-1.5 text-[10px] text-on-surface-variant font-semibold mt-0.5">
                              <Clock className="w-3 h-3" />
                              <span>{med.time} &bull; {med.frequency}</span>
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => deleteRoutine(med.id)}
                          className="text-on-surface-variant hover:text-error p-1.5 rounded-full hover:bg-white dark:hover:bg-white/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-on-surface-variant dark:text-[#c8bedd] italic">No medications tracked. Click Add Medication.</p>
                )}
              </div>

              {/* Skincare routines list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Morning Skincare */}
                <div className="glass-card rounded-2xl p-5 border border-white/40 dark:border-[#3a2d58]/50 shadow-sm">
                  <h3 className="font-serif font-bold text-base text-on-background dark:text-[#eee6ff] mb-4 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-tertiary" />
                    <span>Morning Skincare</span>
                  </h3>
                  <div className="flex flex-col gap-2.5">
                    {morningSkincare.map((sk) => (
                      <button
                        key={sk.id}
                        onClick={() => toggleRoutine(sk.id)}
                        className="w-full text-left flex items-center gap-3 p-2 hover:bg-white/40 dark:hover:bg-white/5 rounded-lg transition-colors group"
                      >
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                          sk.completed ? 'bg-tertiary border-tertiary text-white' : 'border-outline-variant dark:border-[#3a2d58] group-hover:bg-white dark:group-hover:bg-white/10'
                        }`}>
                          {sk.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <span className={`text-sm font-semibold ${sk.completed ? 'line-through text-outline dark:text-[#8a7fa0]' : 'text-on-surface dark:text-[#eee6ff]'}`}>
                          {sk.name}
                        </span>
                      </button>
                    ))}
                    {morningSkincare.length === 0 && (
                      <button onClick={() => addRoutine('Cleanser', '08:30 AM', 'Daily', 'skincare_morning')} className="text-xs font-bold text-primary dark:text-[#d4b8ff] hover:underline flex items-center gap-1">
                        <PlusCircle className="w-3.5 h-3.5" /> Initialize standard Morning routine
                      </button>
                    )}
                  </div>
                </div>

                {/* Night Skincare */}
                <div className="glass-card rounded-2xl p-5 border border-white/40 dark:border-[#3a2d58]/50 shadow-sm">
                  <h3 className="font-serif font-bold text-base text-on-background dark:text-[#eee6ff] mb-4 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-secondary" />
                    <span>Night Skincare</span>
                  </h3>
                  <div className="flex flex-col gap-2.5">
                    {nightSkincare.map((sk) => (
                      <button
                        key={sk.id}
                        onClick={() => toggleRoutine(sk.id)}
                        className="w-full text-left flex items-center gap-3 p-2 hover:bg-white/40 dark:hover:bg-white/5 rounded-lg transition-colors group"
                      >
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                          sk.completed ? 'bg-secondary border-secondary text-white' : 'border-outline-variant dark:border-[#3a2d58] group-hover:bg-white dark:group-hover:bg-white/10'
                        }`}>
                          {sk.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <span className={`text-sm font-semibold ${sk.completed ? 'line-through text-outline dark:text-[#8a7fa0]' : 'text-on-surface dark:text-[#eee6ff]'}`}>
                          {sk.name}
                        </span>
                      </button>
                    ))}
                    {nightSkincare.length === 0 && (
                      <button onClick={() => addRoutine('Retinol/Serum', '10:00 PM', 'Daily', 'skincare_night')} className="text-xs font-bold text-primary dark:text-[#d4b8ff] hover:underline flex items-center gap-1">
                        <PlusCircle className="w-3.5 h-3.5" /> Initialize standard Night routine
                      </button>
                    )}
                  </div>
                </div>

              </div>

              {/* Supplements list */}
              <div className="glass-card rounded-2xl p-5 border border-white/40 dark:border-[#3a2d58]/50 shadow-sm">
                <h3 className="font-serif font-bold text-base text-on-background dark:text-[#eee6ff] mb-4 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary" />
                  <span>Daily Supplements</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {supplements.map((sup) => (
                    <button
                      key={sup.id}
                      onClick={() => toggleRoutine(sup.id)}
                      className="text-left flex items-center gap-3 p-3 bg-white/30 dark:bg-[#1c1230]/60 border border-white/40 dark:border-[#3a2d58]/50 rounded-xl hover:bg-white/60 dark:hover:bg-[#261d48]/60 transition-colors group"
                    >
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                        sup.completed ? 'bg-primary border-primary text-white' : 'border-outline-variant dark:border-[#3a2d58] group-hover:bg-white dark:group-hover:bg-white/10'
                      }`}>
                        {sup.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <div>
                        <span className={`text-sm font-bold block ${sup.completed ? 'line-through text-outline dark:text-[#8a7fa0]' : 'text-on-surface dark:text-[#eee6ff]'}`}>
                          {sup.name}
                        </span>
                        <span className="text-[10px] text-on-surface-variant dark:text-[#c8bedd] font-semibold">{sup.time}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Right Column Water Intake tracker */}
            <div className="md:col-span-4">
              <div className="glass-card rounded-2xl p-6 border border-white/40 dark:border-[#3a2d58]/50 shadow-sm flex flex-col items-center justify-between text-center relative overflow-hidden h-full min-h-[350px]">
                <div className="absolute -bottom-16 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
                
                <div className="space-y-2 z-10 w-full">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto text-primary border border-primary/20 shadow-inner mb-4">
                    <Droplet className="w-6 h-6 fill-current" />
                  </div>
                  <h3 className="font-serif font-bold text-xl text-on-background dark:text-[#eee6ff]">Hydration</h3>
                  <p className="text-xs text-on-surface-variant dark:text-[#c8bedd] font-semibold">Keep hydration steady to relieve body cramps.</p>
                </div>

                <div className="relative w-40 h-40 flex items-center justify-center my-6 z-10 shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path className="text-surface-dim" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2.5"></path>
                    <path 
                      className="text-primary" 
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeDasharray={`${(waterIntake / waterGoal) * 100}, 100`} 
                      strokeLinecap="round" 
                      strokeWidth="2.5"
                    ></path>
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="font-serif font-bold text-2xl text-on-surface dark:text-[#eee6ff]">{waterIntake} ml</span>
                    <span className="text-[10px] text-on-surface-variant dark:text-[#c8bedd] font-bold uppercase tracking-wider mt-0.5">Goal {waterGoal}ml</span>
                  </div>
                </div>

                <div className="w-full flex gap-3 z-10">
                  <button 
                    onClick={() => addWater(250)}
                    className="flex-1 py-2 rounded-2xl border border-primary/20 dark:border-primary/30 hover:border-primary bg-primary/5 dark:bg-primary/10 hover:bg-primary/15 text-xs font-bold text-primary dark:text-[#d4b8ff] transition-all"
                  >
                    +250 ml
                  </button>
                  <button 
                    onClick={() => addWater(500)}
                    className="flex-1 py-2 rounded-2xl border border-primary/20 dark:border-primary/30 hover:border-primary bg-primary/5 dark:bg-primary/10 hover:bg-primary/15 text-xs font-bold text-primary dark:text-[#d4b8ff] transition-all"
                  >
                    +500 ml
                  </button>
                  <button 
                    onClick={resetWater}
                    className="p-2 text-on-surface-variant dark:text-[#c8bedd] hover:text-error hover:bg-white/40 dark:hover:bg-white/10 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Medication Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
              <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white dark:bg-[#16102a] rounded-2xl max-w-md w-full p-6 md:p-8 border border-white dark:border-[#3a2d58]/60 shadow-2xl relative"
            >
              <h3 className="font-serif font-bold text-xl text-on-surface dark:text-[#eee6ff] mb-4">Add Medication / Supplement</h3>
              <form onSubmit={handleAddMedSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant dark:text-[#c8bedd] uppercase tracking-wider mb-2">Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ibuprofen, Iron"
                    value={medName}
                    onChange={(e) => setMedName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-outline-variant dark:border-[#3a2d58] focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm font-semibold bg-white/70 dark:bg-[#1c1230] text-on-surface dark:text-[#eee6ff] dark:placeholder-[#8a7fa0]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant dark:text-[#c8bedd] uppercase tracking-wider mb-2">Time</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 08:00 AM"
                      value={medTime}
                      onChange={(e) => setMedTime(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-outline-variant dark:border-[#3a2d58] focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm font-semibold bg-white/70 dark:bg-[#1c1230] text-on-surface dark:text-[#eee6ff] dark:placeholder-[#8a7fa0]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant dark:text-[#c8bedd] uppercase tracking-wider mb-2">Frequency</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Daily"
                      value={medFreq}
                      onChange={(e) => setMedFreq(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-outline-variant dark:border-[#3a2d58] focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm font-semibold bg-white/70 dark:bg-[#1c1230] text-on-surface dark:text-[#eee6ff] dark:placeholder-[#8a7fa0]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface-variant dark:text-[#c8bedd] uppercase tracking-wider mb-2">Type</label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setMedType('medication')}
                      className={`flex-1 py-3 rounded-xl border font-bold text-xs transition-colors ${
                        medType === 'medication' ? 'bg-primary border-primary text-white' : 'border-outline-variant dark:border-[#3a2d58] hover:bg-white/50 dark:hover:bg-white/10 text-on-surface dark:text-[#c8bedd]'
                      }`}
                    >
                      Medication
                    </button>
                    <button
                      type="button"
                      onClick={() => setMedType('supplement')}
                      className={`flex-1 py-3 rounded-xl border font-bold text-xs transition-colors ${
                        medType === 'supplement' ? 'bg-primary border-primary text-white' : 'border-outline-variant dark:border-[#3a2d58] hover:bg-white/50 dark:hover:bg-white/10 text-on-surface dark:text-[#c8bedd]'
                      }`}
                    >
                      Supplement
                    </button>
                  </div>
                </div>

                <div className="pt-4 flex gap-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-3 rounded-xl border border-outline-variant dark:border-[#3a2d58] hover:bg-white/50 dark:hover:bg-white/10 text-on-surface-variant dark:text-[#c8bedd] font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-xs shadow-md hover:opacity-95"
                  >
                    Add Tracker
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
