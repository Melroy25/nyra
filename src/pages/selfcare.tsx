import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { 
  Pill, Sparkles, Droplet, Plus, Trash2, Check, Clock, PlusCircle, 
  Target, Copy, Search, FileText, Image as ImageIcon, X, Undo2, Bell, 
  Edit3, CheckCheck, Paperclip, ChevronRight, Share2, Sun, Moon, Filter
} from 'lucide-react';
import { RoutineItem } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { apiGetRoutines, apiCreateRoutine, apiToggleRoutine, apiDeleteRoutine } from '../lib/api';

interface Note {
  id: string;
  title: string;
  content: string;
  category: 'Personal' | 'Health & Cycle' | 'Skincare' | 'Doctor Notes' | 'Reminders' | 'Ideas';
  createdAt: string;
  imageUrl?: string;
  fileName?: string;
}

interface SkincareRoutineConfig {
  time: string;
  notify: boolean;
  steps: { id: string; name: string; completed: boolean }[];
}

const defaultNotes: Note[] = [
  {
    id: 'note-1',
    title: 'Doctor Visit & Hormone Panel Checklist',
    content: '1. Ask doctor about Vitamin D3 and B12 levels.\n2. Review thyroid profile (TSH) from last lab test.\n3. Inquire about magnesium bisglycinate for Luteal phase cramp relief.',
    category: 'Doctor Notes',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'note-2',
    title: 'Morning Skincare Ingredients to Keep',
    content: 'Use Gentle Cleanser, Niacinamide 5% serum, Hyaluronic Acid on damp skin, and SPF 50 Broad Spectrum sunscreen. Avoid harsh AHA/BHA exfoliants on ovulation phase days.',
    category: 'Skincare',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

// ── Structured Time Selector Dropdown Component ──
function StructuredTimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (newTime: string) => void;
}) {
  const parseVal = (str: string) => {
    const clean = (str || '08:00 AM').trim();
    const match = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match) {
      return {
        hour: match[1].padStart(2, '0'),
        minute: match[2],
        period: match[3].toUpperCase(),
      };
    }
    return { hour: '08', minute: '00', period: 'AM' };
  };

  const { hour, minute, period } = parseVal(value);

  const hours = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  const minutes = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

  return (
    <div className="grid grid-cols-3 gap-2">
      {/* Hour Select */}
      <select
        value={hour}
        onChange={(e) => onChange(`${e.target.value}:${minute} ${period}`)}
        className="px-3 py-2.5 rounded-xl border border-outline-variant/50 dark:border-[#3a2d58] bg-white/80 dark:bg-[#1c1230] text-on-surface dark:text-[#eee6ff] font-bold text-xs outline-none cursor-pointer"
      >
        {hours.map((h) => (
          <option key={h} value={h} className="bg-white dark:bg-[#16102a]">
            {h} Hour
          </option>
        ))}
      </select>

      {/* Minute Select */}
      <select
        value={minute}
        onChange={(e) => onChange(`${hour}:${e.target.value} ${period}`)}
        className="px-3 py-2.5 rounded-xl border border-outline-variant/50 dark:border-[#3a2d58] bg-white/80 dark:bg-[#1c1230] text-on-surface dark:text-[#eee6ff] font-bold text-xs outline-none cursor-pointer"
      >
        {minutes.map((m) => (
          <option key={m} value={m} className="bg-white dark:bg-[#16102a]">
            :{m} Min
          </option>
        ))}
      </select>

      {/* AM / PM Select */}
      <select
        value={period}
        onChange={(e) => onChange(`${hour}:${minute} ${e.target.value}`)}
        className="px-3 py-2.5 rounded-xl border border-outline-variant/50 dark:border-[#3a2d58] bg-primary text-white font-bold text-xs outline-none cursor-pointer"
      >
        <option value="AM" className="bg-white text-black dark:bg-[#16102a] dark:text-white">AM</option>
        <option value="PM" className="bg-white text-black dark:bg-[#16102a] dark:text-white">PM</option>
      </select>
    </div>
  );
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
    setWaterGoal, 
    resetWater,
    darkMode 
  } = useStore();

  const [activeTab, setActiveTab] = useState<'notes' | 'routines'>('notes');

  // ── Water weekly history from localStorage ──────────────────────────────
  const [weeklyWaterData, setWeeklyWaterData] = React.useState<{ day: string; amount: number; isToday: boolean; hasData: boolean }[]>([]);

  React.useEffect(() => {
    const today = new Date();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result: { day: string; amount: number; isToday: boolean; hasData: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = days[d.getDay()];
      const isToday = i === 0;
      const stored = localStorage.getItem(`nyra_water_${dateStr}`);
      const amount = stored !== null ? parseInt(stored, 10) : (isToday ? useStore.getState().waterIntake : 0);
      const hasData = stored !== null || isToday;
      result.push({ day: dayLabel, amount, isToday, hasData });
    }
    setWeeklyWaterData(result);
  }, [waterIntake]);

  // Save today's waterIntake to localStorage whenever it changes
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem(`nyra_water_${today}`, String(waterIntake));
  }, [waterIntake]);

  const daysWithRealData = weeklyWaterData.filter(d => d.hasData && d.amount > 0).length;


  // \u2500\u2500 1. MY NOTES STATE \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  const [notes, setNotes] = useState<Note[]>(defaultNotes);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  
  // New Note form fields
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] = useState<Note['category']>('Personal');
  const [noteImage, setNoteImage] = useState<string | null>(null);
  const [noteFileName, setNoteFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Note Copy & Delete Undo state
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [undoNote, setUndoNote] = useState<Note | null>(null);
  const [undoSecondsLeft, setUndoSecondsLeft] = useState(0);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ── 2. SKINCARE ROUTINES CUSTOMIZER STATE ──────────────────────────────────
  const [morningSkincare, setMorningSkincare] = useState<SkincareRoutineConfig>({
    time: '08:30 AM',
    notify: true,
    steps: [
      { id: 'ms-1', name: 'Gentle Face Wash', completed: false },
      { id: 'ms-2', name: 'Brush Teeth & Floss', completed: false },
      { id: 'ms-3', name: 'Vitamin C Serum', completed: false },
      { id: 'ms-4', name: 'Moisturizer & Sunscreen SPF 50', completed: false },
    ],
  });

  const [nightSkincare, setNightSkincare] = useState<SkincareRoutineConfig>({
    time: '10:00 PM',
    notify: true,
    steps: [
      { id: 'ns-1', name: 'Double Cleanser / Micellar Water', completed: false },
      { id: 'ns-2', name: 'Brush Teeth', completed: false },
      { id: 'ns-3', name: 'Retinol / Niacinamide Serum', completed: false },
      { id: 'ns-4', name: 'Night Repair Cream & Eye Cream', completed: false },
    ],
  });

  // Restore client localStorage after mount (fixes React Error #418 SSR mismatch)
  useEffect(() => {
    try {
      const savedNotes = localStorage.getItem('nyra_user_notes');
      if (savedNotes) {
        const parsed = JSON.parse(savedNotes);
        if (Array.isArray(parsed) && parsed.length > 0) setNotes(parsed);
      }
    } catch (e) {}

    try {
      const savedMorning = localStorage.getItem('nyra_skincare_morning');
      if (savedMorning) {
        const parsed = JSON.parse(savedMorning);
        if (parsed && parsed.time) {
          parsed.time = normalizeTimeString(parsed.time);
          setMorningSkincare(parsed);
        }
      }
    } catch (e) {}

    try {
      const savedNight = localStorage.getItem('nyra_skincare_night');
      if (savedNight) {
        const parsed = JSON.parse(savedNight);
        if (parsed && parsed.time) {
          parsed.time = normalizeTimeString(parsed.time);
          setNightSkincare(parsed);
        }
      }
    } catch (e) {}
  }, []);

  // Skincare modal editor
  const [editingSkincareType, setEditingSkincareType] = useState<'morning' | 'night' | null>(null);
  const [tempSkincareTime, setTempSkincareTime] = useState('08:30 AM');
  const [tempSkincareNotify, setTempSkincareNotify] = useState(true);
  const [tempSkincareSteps, setTempSkincareSteps] = useState<string[]>([]);
  const [newStepInput, setNewStepInput] = useState('');

  // ── 3. HYDRATION GOAL MODAL STATE ──────────────────────────────────────────
  const [showWaterGoalModal, setShowWaterGoalModal] = useState(false);
  const [customWaterGoal, setCustomWaterGoal] = useState(waterGoal || 2000);

  // ── 4. MEDICATIONS MODAL STATE ─────────────────────────────────────────────
  const [showAddMedModal, setShowAddMedModal] = useState(false);
  const [medName, setMedName] = useState('');
  const [medTime, setMedTime] = useState('08:00 AM');
  const [medFreq, setMedFreq] = useState('Daily');
  const [medType, setMedType] = useState<RoutineItem['type']>('medication');

  // Save notes & skincare state to localStorage on updates
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nyra_user_notes', JSON.stringify(notes));
    }
  }, [notes]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nyra_skincare_morning', JSON.stringify(morningSkincare));
      localStorage.setItem('nyra_skincare_night', JSON.stringify(nightSkincare));
    }
  }, [morningSkincare, nightSkincare]);

  // ── NOTES HANDLERS ────────────────────────────────────────────────────────
  const handleOpenNewNoteModal = () => {
    setEditingNote(null);
    setNoteTitle('');
    setNoteContent('');
    setNoteCategory('Personal');
    setNoteImage(null);
    setNoteFileName(null);
    setShowNoteModal(true);
  };

  const handleOpenEditNoteModal = (note: Note) => {
    setEditingNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteCategory(note.category);
    setNoteImage(note.imageUrl || null);
    setNoteFileName(note.fileName || null);
    setShowNoteModal(true);
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNoteFileName(file.name);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setNoteImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim()) return;

    if (editingNote) {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === editingNote.id
            ? {
                ...n,
                title: noteTitle.trim(),
                content: noteContent.trim(),
                category: noteCategory,
                imageUrl: noteImage || undefined,
                fileName: noteFileName || undefined,
              }
            : n
        )
      );
    } else {
      const newNote: Note = {
        id: `note-${Date.now()}`,
        title: noteTitle.trim(),
        content: noteContent.trim(),
        category: noteCategory,
        createdAt: new Date().toISOString(),
        imageUrl: noteImage || undefined,
        fileName: noteFileName || undefined,
      };
      setNotes((prev) => [newNote, ...prev]);
    }

    setShowNoteModal(false);
  };

  const handleCopyNote = (text: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedNoteId(id);
    setTimeout(() => setCopiedNoteId(null), 1500);
  };

  const handleConfirmDeleteClick = (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    setNoteToDelete(note);
    setShowConfirmDeleteModal(true);
  };

  const handleExecuteDelete = () => {
    if (!noteToDelete) return;
    const target = noteToDelete;
    setShowConfirmDeleteModal(false);
    setNoteToDelete(null);

    // Remove note and set undo state
    setNotes((prev) => prev.filter((n) => n.id !== target.id));
    setUndoNote(target);
    setUndoSecondsLeft(5);

    if (undoTimerRef.current) clearInterval(undoTimerRef.current);
    undoTimerRef.current = setInterval(() => {
      setUndoSecondsLeft((sec) => {
        if (sec <= 1) {
          clearInterval(undoTimerRef.current!);
          setUndoNote(null);
          return 0;
        }
        return sec - 1;
      });
    }, 1000);
  };

  const handleRestoreUndo = () => {
    if (undoNote) {
      setNotes((prev) => [undoNote, ...prev]);
      setUndoNote(null);
      if (undoTimerRef.current) clearInterval(undoTimerRef.current);
    }
  };

  // Filter notes
  const filteredNotes = notes.filter((n) => {
    const matchesCategory = selectedCategory === 'All' || n.category === selectedCategory;
    const matchesSearch =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // ── SKINCARE ROUTINE HANDLERS ─────────────────────────────────────────────
  const toggleSkincareStep = (type: 'morning' | 'night', stepId: string) => {
    if (type === 'morning') {
      setMorningSkincare((prev) => ({
        ...prev,
        steps: prev.steps.map((s) => (s.id === stepId ? { ...s, completed: !s.completed } : s)),
      }));
    } else {
      setNightSkincare((prev) => ({
        ...prev,
        steps: prev.steps.map((s) => (s.id === stepId ? { ...s, completed: !s.completed } : s)),
      }));
    }
  };

  const handleOpenSkincareModal = (type: 'morning' | 'night') => {
    setEditingSkincareType(type);
    const cfg = type === 'morning' ? morningSkincare : nightSkincare;
    setTempSkincareTime(cfg.time);
    setTempSkincareNotify(cfg.notify);
    setTempSkincareSteps(cfg.steps.map((s) => s.name));
    setNewStepInput('');
  };

  const handleAddTempStep = () => {
    if (!newStepInput.trim()) return;
    setTempSkincareSteps((prev) => [...prev, newStepInput.trim()]);
    setNewStepInput('');
  };

  const handleRemoveTempStep = (idx: number) => {
    setTempSkincareSteps((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveSkincareSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSkincareType) return;

    const formattedTime = normalizeTimeString(tempSkincareTime);

    const newStepsObj = tempSkincareSteps.map((name, i) => ({
      id: `${editingSkincareType}-${i}-${Date.now()}`,
      name,
      completed: false,
    }));

    if (editingSkincareType === 'morning') {
      setMorningSkincare({
        time: formattedTime,
        notify: tempSkincareNotify,
        steps: newStepsObj,
      });
    } else {
      setNightSkincare({
        time: formattedTime,
        notify: tempSkincareNotify,
        steps: newStepsObj,
      });
    }

    setEditingSkincareType(null);
  };

  // Helper helper to normalize user entered time strings
  function normalizeTimeString(str: string): string {
    if (!str) return '08:00 AM';
    const clean = str.trim().toLowerCase();
    const match = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
    if (match) {
      let hrs = parseInt(match[1], 10);
      const mins = match[2] ? parseInt(match[2], 10) : 0;
      const period = match[3].toUpperCase();
      if (hrs === 0) hrs = 12;
      if (hrs > 12) hrs = hrs % 12 || 12;
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${period}`;
    }
    const match24 = clean.match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
      let hrs = parseInt(match24[1], 10);
      const mins = parseInt(match24[2], 10);
      const period = hrs >= 12 ? 'PM' : 'AM';
      hrs = hrs % 12 === 0 ? 12 : hrs % 12;
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${period}`;
    }
    return str.trim();
  }

  // ── HYDRATION HANDLERS ───────────────────────────────────────────────────
  const handleSaveWaterGoal = () => {
    if (customWaterGoal > 0) {
      setWaterGoal(customWaterGoal);
      setShowWaterGoalModal(false);
    }
  };

  // ── MEDICATIONS HANDLERS ─────────────────────────────────────────────────
  const handleAddMedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!medName.trim()) return;
    addRoutine(medName, medTime, medFreq, medType);
    apiCreateRoutine({ name: medName, time: medTime, frequency: medFreq, type: medType }).catch(() => {});
    setMedName('');
    setShowAddMedModal(false);
  };

  const medications = routines.filter((r) => r.type === 'medication');
  const supplements = routines.filter((r) => r.type === 'supplement');

  return (
    <div className="max-w-[1100px] mx-auto px-container-padding-mobile md:px-container-padding-desktop pt-stack-md pb-12 flex flex-col gap-stack-lg">
      
      {/* Header section */}
      <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-entrance">
        <div>
          <h1 className="font-serif font-bold text-3xl md:text-5xl text-primary dark:text-[#d4b8ff]">Self Care Studio</h1>
          <p className="text-sm text-on-surface-variant dark:text-[#c8bedd] font-medium mt-1">
            Manage your daily skincare routines, hydration goals, medications, and personal notes.
          </p>
        </div>

        {/* Tab Switched pill selector */}
        <div className="flex bg-white/50 dark:bg-[#1c1230]/70 border border-outline-variant/30 dark:border-[#3a2d58]/60 rounded-2xl p-1 shadow-inner shrink-0">
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-5 py-2 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'notes'
                ? 'bg-primary text-white shadow-md'
                : 'text-on-surface dark:text-[#c8bedd] hover:text-primary dark:hover:text-[#d4b8ff] hover:bg-white/40 dark:hover:bg-white/10'
            }`}
          >
            My Notes
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
        {activeTab === 'notes' ? (
          // ── TAB 1: MY NOTES & DOCUMENTS APP ──
          <motion.div 
            key="notes-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col gap-6"
          >
            {/* Top Toolbar: Search + Category Filters + Create Note Button */}
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant dark:text-[#8a7fa0]" />
                <input
                  type="text"
                  placeholder="Search notes by title or content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-outline-variant/40 dark:border-[#3a2d58] bg-white/70 dark:bg-[#1c1230]/80 text-on-surface dark:text-[#eee6ff] placeholder-[#8a7fa0] text-xs font-semibold outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 shadow-sm"
                />
              </div>

              {/* Create Note Action Button */}
              <button
                onClick={handleOpenNewNoteModal}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:opacity-95 active:scale-95 transition-all shrink-0"
              >
                <Plus className="w-4 h-4" /> Create New Note
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex overflow-x-auto no-scrollbar gap-2 pb-1">
              {['All', 'Personal', 'Health & Cycle', 'Skincare', 'Doctor Notes', 'Reminders', 'Ideas'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                    selectedCategory === cat
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-white/50 dark:bg-[#1c1230]/60 border-outline-variant/30 dark:border-[#3a2d58]/60 text-on-surface dark:text-[#c8bedd] hover:bg-white dark:hover:bg-[#261d48]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Notes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => handleOpenEditNoteModal(note)}
                  className="glass-card rounded-2xl p-5 border border-white/50 dark:border-[#3a2d58]/60 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden min-h-[180px]"
                >
                  <div>
                    {/* Header: Category Badge + Copy & Delete Buttons */}
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary dark:text-[#d4b8ff] border border-primary/20">
                        {note.category}
                      </span>
                      
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleCopyNote(note.content, note.id, e)}
                          className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary dark:hover:text-[#d4b8ff] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                          title="Copy Note Text"
                        >
                          {copiedNoteId === note.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={(e) => handleConfirmDeleteClick(note, e)}
                          className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                          title="Delete Note"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Note Title */}
                    <h3 className="font-serif font-bold text-base text-on-background dark:text-[#eee6ff] mb-2 line-clamp-1">
                      {note.title}
                    </h3>

                    {/* Image or File Preview Attachment */}
                    {note.imageUrl && (
                      <div className="my-2 rounded-xl overflow-hidden max-h-32 border border-black/10 dark:border-white/10">
                        <img src={note.imageUrl} alt="Attachment" className="w-full h-full object-cover" />
                      </div>
                    )}
                    {note.fileName && !note.imageUrl && (
                      <div className="my-2 flex items-center gap-2 p-2 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/20 text-xs font-semibold text-primary dark:text-[#d4b8ff]">
                        <FileText className="w-4 h-4 shrink-0" />
                        <span className="truncate">{note.fileName}</span>
                      </div>
                    )}

                    {/* Note Content Preview */}
                    <p className="text-xs text-on-surface-variant dark:text-[#c8bedd] font-medium line-clamp-3 leading-relaxed whitespace-pre-line">
                      {note.content}
                    </p>
                  </div>

                  {/* Footer Date */}
                  <div className="mt-4 pt-2 border-t border-black/5 dark:border-white/5 flex justify-between items-center text-[10px] font-semibold text-on-surface-variant dark:text-[#8a7fa0]">
                    <span>{new Date(note.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <span className="text-primary dark:text-[#d4b8ff] group-hover:underline flex items-center gap-0.5">
                      View / Edit <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}

              {filteredNotes.length === 0 && (
                <div className="col-span-full py-16 flex flex-col items-center justify-center text-center glass-card rounded-3xl border border-white/40 dark:border-[#3a2d58]/60 p-8">
                  <FileText className="w-12 h-12 text-primary/40 dark:text-[#d4b8ff]/40 mb-3" />
                  <h3 className="font-serif font-bold text-lg text-on-background dark:text-[#eee6ff] mb-1">No notes found</h3>
                  <p className="text-xs text-on-surface-variant dark:text-[#c8bedd] max-w-sm mb-4">
                    Create your first note to store doctor recommendations, skincare routines, or daily reminders!
                  </p>
                  <button
                    onClick={handleOpenNewNoteModal}
                    className="px-5 py-2.5 rounded-2xl bg-primary text-white font-bold text-xs shadow-md"
                  >
                    + Create Note
                  </button>
                </div>
              )}
            </div>

            {/* Floating 5-Second Undo Toast Notification */}
            <AnimatePresence>
              {undoNote && (
                <motion.div
                  initial={{ opacity: 0, y: 50, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 50, scale: 0.9 }}
                  className="fixed bottom-6 right-6 z-50 bg-[#16102a] text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-white/20 flex items-center gap-4 min-w-[280px]"
                >
                  <div className="flex-1">
                    <p className="text-xs font-bold">Note deleted</p>
                    <p className="text-[10px] text-gray-300 truncate max-w-[180px]">"{undoNote.title}"</p>
                  </div>
                  <button
                    onClick={handleRestoreUndo}
                    className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                  >
                    <Undo2 className="w-3.5 h-3.5" /> Undo ({undoSecondsLeft}s)
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          // ── TAB 2: DAILY ROUTINES (MEDS, SKINCARE & WATER) ──
          <motion.div 
            key="routines-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-12 gap-gutter"
          >
            {/* Left Column Checklist */}
            <div className="md:col-span-8 space-y-6">
              
              {/* Medications List */}
              <div className="glass-card rounded-2xl p-5 border border-white/40 dark:border-[#3a2d58]/50 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-serif font-bold text-lg text-on-background dark:text-[#eee6ff] flex items-center gap-2">
                    <Pill className="w-5 h-5 text-primary dark:text-[#d4b8ff]" />
                    <span>Medications</span>
                  </h3>
                  <button 
                    onClick={() => setShowAddMedModal(true)}
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

              {/* Skincare Routines List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Morning Skincare */}
                <div className="glass-card rounded-2xl p-5 border border-white/40 dark:border-[#3a2d58]/50 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-serif font-bold text-base text-on-background dark:text-[#eee6ff] flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-tertiary" />
                        <span>Morning Skincare</span>
                      </h3>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-tertiary/10 text-tertiary border border-tertiary/20 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {morningSkincare.time}
                        </span>
                        <button
                          onClick={() => handleOpenSkincareModal('morning')}
                          className="p-1 rounded-lg text-primary hover:bg-primary/10 transition-colors text-xs font-bold flex items-center gap-1 ml-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Edit
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {morningSkincare.steps.map((sk) => (
                        <button
                          key={sk.id}
                          onClick={() => toggleSkincareStep('morning', sk.id)}
                          className="w-full text-left flex items-center gap-3 p-2 hover:bg-white/40 dark:hover:bg-white/5 rounded-lg transition-colors group"
                        >
                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                            sk.completed ? 'bg-tertiary border-tertiary text-white' : 'border-outline-variant dark:border-[#3a2d58] group-hover:bg-white dark:group-hover:bg-white/10'
                          }`}>
                            {sk.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                          <span className={`text-xs font-semibold ${sk.completed ? 'line-through text-outline dark:text-[#8a7fa0]' : 'text-on-surface dark:text-[#eee6ff]'}`}>
                            {sk.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Night Skincare */}
                <div className="glass-card rounded-2xl p-5 border border-white/40 dark:border-[#3a2d58]/50 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-serif font-bold text-base text-on-background dark:text-[#eee6ff] flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-secondary" />
                        <span>Night Skincare</span>
                      </h3>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {nightSkincare.time}
                        </span>
                        <button
                          onClick={() => handleOpenSkincareModal('night')}
                          className="p-1 rounded-lg text-primary hover:bg-primary/10 transition-colors text-xs font-bold flex items-center gap-1 ml-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Edit
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {nightSkincare.steps.map((sk) => (
                        <button
                          key={sk.id}
                          onClick={() => toggleSkincareStep('night', sk.id)}
                          className="w-full text-left flex items-center gap-3 p-2 hover:bg-white/40 dark:hover:bg-white/5 rounded-lg transition-colors group"
                        >
                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                            sk.completed ? 'bg-secondary border-secondary text-white' : 'border-outline-variant dark:border-[#3a2d58] group-hover:bg-white dark:group-hover:bg-white/10'
                          }`}>
                            {sk.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                          <span className={`text-xs font-semibold ${sk.completed ? 'line-through text-outline dark:text-[#8a7fa0]' : 'text-on-surface dark:text-[#eee6ff]'}`}>
                            {sk.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

              {/* Supplements List */}
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

            {/* Right Column Water Intake Tracker & Graph */}
            {useStore.getState().featureToggles.waterEnabled && (
              <div className="md:col-span-4 flex flex-col gap-4">
                <div className="glass-card rounded-2xl p-6 border border-white/40 dark:border-[#3a2d58]/50 shadow-sm flex flex-col items-center justify-between text-center relative overflow-hidden h-full min-h-[360px]">
                  <div className="absolute -bottom-16 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
                  
                  <div className="space-y-2 z-10 w-full">
                    <div className="flex justify-between items-center w-full mb-2">
                      <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                        <Droplet className="w-5 h-5 fill-current" />
                      </div>
                      {/* Edit Goal Button */}
                      <button
                        onClick={() => {
                          setCustomWaterGoal(waterGoal);
                          setShowWaterGoalModal(true);
                        }}
                        className="px-3 py-1 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary dark:text-[#d4b8ff] text-xs font-bold flex items-center gap-1 transition-colors border border-primary/20"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit Goal
                      </button>
                    </div>

                    <h3 className="font-serif font-bold text-xl text-on-background dark:text-[#eee6ff]">Hydration Goal</h3>
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
                        strokeDasharray={`${Math.min(100, Math.round((waterIntake / waterGoal) * 100))}, 100`} 
                        strokeLinecap="round" 
                        strokeWidth="2.5"
                      ></path>
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="font-serif font-bold text-2xl text-on-surface dark:text-[#eee6ff]">{waterIntake} ml</span>
                      <span className="text-[10px] text-on-surface-variant dark:text-[#c8bedd] font-bold uppercase tracking-wider mt-0.5">GOAL {waterGoal}ML</span>
                    </div>
                  </div>

                  <div className="w-full flex gap-2 z-10">
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
                      title="Reset Water Intake"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 📊 Weekly Water Intake Graph Widget */}
                <div className="glass-card rounded-2xl p-5 border border-white/40 dark:border-[#3a2d58]/50 shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-serif font-bold text-sm text-on-background dark:text-[#eee6ff] flex items-center gap-1.5">
                      <Droplet className="w-4 h-4 text-cyan-500" />
                      <span>Weekly Water Graph</span>
                    </h4>
                    <span className="text-[10px] font-bold text-primary dark:text-[#d4b8ff]">
                      Today: {waterIntake} ml
                    </span>
                  </div>

                  {daysWithRealData < 2 ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                      <Droplet className="w-8 h-8 text-cyan-400/40" />
                      <p className="text-xs font-semibold text-on-surface-variant dark:text-[#c8bedd] text-center">
                        Graph will appear once you have at least 2 days of water data.
                      </p>
                      <p className="text-[10px] text-on-surface-variant/60 dark:text-[#c8bedd]/60 text-center">
                        Keep logging water today and tomorrow!
                      </p>
                    </div>
                  ) : (
                    /* Bar Chart Container */
                    <div className="flex items-end justify-between h-32 pt-4 pb-1 px-2 gap-1.5 border-b border-black/5 dark:border-white/5">
                      {weeklyWaterData.map((d) => {
                        if (!d.hasData || d.amount === 0) {
                          return (
                            <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                              <div className="w-full max-w-[24px] h-full flex items-end">
                                <div className="w-full rounded-t-lg bg-black/5 dark:bg-white/5" style={{ height: '4px' }} />
                              </div>
                              <span className="text-[10px] font-bold text-on-surface-variant/40">{d.day}</span>
                            </div>
                          );
                        }
                        const heightPercent = Math.min(100, Math.max(8, Math.round((d.amount / waterGoal) * 100)));
                        return (
                          <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5 group h-full justify-end">
                            <span className="text-[9px] font-bold text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">
                              {d.amount}
                            </span>
                            <div className="w-full max-w-[24px] bg-cyan-500/10 dark:bg-cyan-500/20 rounded-t-lg relative overflow-hidden h-full flex items-end">
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${heightPercent}%` }}
                                transition={{ duration: 0.5 }}
                                className={`w-full rounded-t-lg ${
                                  d.isToday
                                    ? 'bg-gradient-to-t from-primary to-cyan-400 shadow-md'
                                    : 'bg-primary/50 dark:bg-primary/40'
                                }`}
                              />
                            </div>
                            <span className={`text-[10px] font-bold ${d.isToday ? 'text-primary dark:text-[#d4b8ff]' : 'text-on-surface-variant'}`}>
                              {d.day}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL 1: CREATE / EDIT NOTE ── */}
      <AnimatePresence>
        {showNoteModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white dark:bg-[#16102a] rounded-3xl max-w-lg w-full p-6 md:p-8 border border-white dark:border-[#3a2d58]/60 shadow-2xl relative flex flex-col max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-serif font-bold text-xl text-on-surface dark:text-[#eee6ff]">
                  {editingNote ? 'Edit Note' : 'Create New Note'}
                </h3>
                <button 
                  onClick={() => setShowNoteModal(false)}
                  className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-on-surface-variant" />
                </button>
              </div>

              <form onSubmit={handleSaveNoteSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant dark:text-[#c8bedd] uppercase tracking-wider mb-1.5">Note Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Doctor Blood Test Results"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-outline-variant/50 dark:border-[#3a2d58] focus:border-primary outline-none text-sm font-semibold bg-white/80 dark:bg-[#1c1230] text-on-surface dark:text-[#eee6ff]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface-variant dark:text-[#c8bedd] uppercase tracking-wider mb-1.5">Category</label>
                  <select
                    value={noteCategory}
                    onChange={(e) => setNoteCategory(e.target.value as Note['category'])}
                    className="w-full px-4 py-3 rounded-2xl border border-outline-variant/50 dark:border-[#3a2d58] focus:border-primary outline-none text-xs font-bold bg-white/80 dark:bg-[#1c1230] text-on-surface dark:text-[#eee6ff]"
                  >
                    <option value="Personal">Personal</option>
                    <option value="Health & Cycle">Health & Cycle</option>
                    <option value="Skincare">Skincare</option>
                    <option value="Doctor Notes">Doctor Notes</option>
                    <option value="Reminders">Reminders</option>
                    <option value="Ideas">Ideas</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface-variant dark:text-[#c8bedd] uppercase tracking-wider mb-1.5">Content / Details</label>
                  <textarea
                    rows={5}
                    required
                    placeholder="Write your note, instructions, or paste details here..."
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-outline-variant/50 dark:border-[#3a2d58] focus:border-primary outline-none text-xs font-medium bg-white/80 dark:bg-[#1c1230] text-on-surface dark:text-[#eee6ff] leading-relaxed"
                  />
                </div>

                {/* Attach File / Image */}
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant dark:text-[#c8bedd] uppercase tracking-wider mb-1.5">Attachment (Image or Document)</label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*,.pdf,.doc,.docx"
                    className="hidden"
                    onChange={handleFileAttach}
                  />

                  {noteImage ? (
                    <div className="relative inline-block rounded-2xl overflow-hidden border-2 border-primary max-h-40">
                      <img src={noteImage} alt="Attachment" className="max-h-36 w-auto object-cover" />
                      <button
                        type="button"
                        onClick={() => { setNoteImage(null); setNoteFileName(null); }}
                        className="absolute top-2 right-2 bg-black/70 text-white rounded-full p-1 hover:bg-red-500 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : noteFileName ? (
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-primary/10 border border-primary/20 text-xs font-semibold text-primary dark:text-[#d4b8ff]">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span>{noteFileName}</span>
                      </div>
                      <button type="button" onClick={() => setNoteFileName(null)} className="text-red-500 hover:underline">Remove</button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-3 rounded-2xl border border-dashed border-outline-variant dark:border-[#3a2d58] hover:bg-primary/5 text-xs font-bold text-primary dark:text-[#d4b8ff] flex items-center justify-center gap-2 transition-colors"
                    >
                      <Paperclip className="w-4 h-4" /> Attach Image or Document
                    </button>
                  )}
                </div>

                <div className="pt-3 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowNoteModal(false)}
                    className="flex-1 py-3 rounded-2xl border border-outline-variant dark:border-[#3a2d58] text-on-surface-variant font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-xs shadow-md hover:opacity-95"
                  >
                    Save Note
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL 2: CONFIRM NOTE DELETE WITH ARE YOU SURE ── */}
      <AnimatePresence>
        {showConfirmDeleteModal && noteToDelete && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white dark:bg-[#16102a] rounded-3xl max-w-sm w-full p-6 border border-white dark:border-[#3a2d58]/60 shadow-2xl text-center"
            >
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-bold text-lg text-on-surface dark:text-[#eee6ff] mb-1">Delete this Note?</h3>
              <p className="text-xs text-on-surface-variant dark:text-[#c8bedd] mb-4">
                Are you sure you want to delete "{noteToDelete.title}"? You will have 5 seconds to Undo.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmDeleteModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-outline-variant dark:border-[#3a2d58] text-xs font-bold text-on-surface"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteDelete}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md"
                >
                  Yes, Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL 3: EDIT SKINCARE ROUTINES & REMINDER TIME ── */}
      <AnimatePresence>
        {editingSkincareType && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white dark:bg-[#16102a] rounded-3xl max-w-md w-full p-6 md:p-8 border border-white dark:border-[#3a2d58]/60 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-serif font-bold text-xl text-on-surface dark:text-[#eee6ff]">
                  Edit {editingSkincareType === 'morning' ? 'Morning' : 'Night'} Skincare Routine
                </h3>
                <button onClick={() => setEditingSkincareType(null)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveSkincareSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant dark:text-[#c8bedd] uppercase tracking-wider mb-2">
                    Reminder Notification Time
                  </label>
                  <StructuredTimePicker
                    value={tempSkincareTime}
                    onChange={(newTime) => setTempSkincareTime(newTime)}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="notifyToggle"
                    checked={tempSkincareNotify}
                    onChange={(e) => setTempSkincareNotify(e.target.checked)}
                    className="w-4 h-4 rounded text-primary"
                  />
                  <label htmlFor="notifyToggle" className="text-xs font-bold text-on-surface dark:text-[#eee6ff] cursor-pointer">
                    Send push notification reminder at this time
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface-variant dark:text-[#c8bedd] uppercase tracking-wider mb-2">
                    Skincare Steps & Products
                  </label>

                  {/* Add Step Input */}
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      placeholder="Add a step (e.g. Face Wash, Serum, Sunscreen)..."
                      value={newStepInput}
                      onChange={(e) => setNewStepInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTempStep(); } }}
                      className="flex-1 px-3 py-2 rounded-xl border border-outline-variant/50 dark:border-[#3a2d58] text-xs font-medium bg-white/80 dark:bg-[#1c1230] text-on-surface dark:text-[#eee6ff]"
                    />
                    <button
                      type="button"
                      onClick={handleAddTempStep}
                      className="px-4 py-2 rounded-xl bg-primary text-white font-bold text-xs"
                    >
                      + Add
                    </button>
                  </div>

                  {/* Steps List */}
                  <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                    {tempSkincareSteps.map((step, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2.5 bg-white/50 dark:bg-[#1c1230]/70 rounded-xl border border-black/5 dark:border-white/5 text-xs font-semibold text-on-surface dark:text-[#eee6ff]">
                        <span>{idx + 1}. {step}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTempStep(idx)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingSkincareType(null)}
                    className="flex-1 py-3 rounded-2xl border border-outline-variant dark:border-[#3a2d58] text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-xs shadow-md"
                  >
                    Save Routine
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL 4: EDIT HYDRATION WATER GOAL ── */}
      <AnimatePresence>
        {showWaterGoalModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white dark:bg-[#16102a] rounded-3xl max-w-sm w-full p-6 border border-white dark:border-[#3a2d58]/60 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-serif font-bold text-xl text-on-surface dark:text-[#eee6ff]">Edit Water Target Goal</h3>
                <button onClick={() => setShowWaterGoalModal(false)} className="p-1.5 rounded-full hover:bg-black/5">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant dark:text-[#c8bedd] uppercase tracking-wider mb-2">Target Goal (ml)</label>
                  <input
                    type="number"
                    step={100}
                    value={customWaterGoal}
                    onChange={(e) => setCustomWaterGoal(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-2xl border border-outline-variant/50 dark:border-[#3a2d58] outline-none text-base font-bold text-center bg-white/80 dark:bg-[#1c1230] text-primary dark:text-[#d4b8ff]"
                  />
                </div>

                {/* Quick Presets */}
                <div className="grid grid-cols-3 gap-2">
                  {[1500, 2000, 2500, 3000, 3500, 4000].map((goal) => (
                    <button
                      key={goal}
                      onClick={() => setCustomWaterGoal(goal)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                        customWaterGoal === goal
                          ? 'bg-primary text-white border-primary'
                          : 'border-outline-variant/40 hover:bg-primary/10 text-on-surface dark:text-[#c8bedd]'
                      }`}
                    >
                      {goal} ml
                    </button>
                  ))}
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    onClick={() => setShowWaterGoalModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-outline-variant dark:border-[#3a2d58] text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveWaterGoal}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-white font-bold text-xs shadow-md"
                  >
                    Save Goal
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL 5: ADD MEDICATION ── */}
      <AnimatePresence>
        {showAddMedModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white dark:bg-[#16102a] rounded-3xl max-w-md w-full p-6 md:p-8 border border-white dark:border-[#3a2d58]/60 shadow-2xl relative"
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
                    className="w-full px-4 py-3 rounded-2xl border border-outline-variant dark:border-[#3a2d58] outline-none text-sm font-semibold bg-white/70 dark:bg-[#1c1230] text-on-surface dark:text-[#eee6ff]"
                  />
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant dark:text-[#c8bedd] uppercase tracking-wider mb-2">
                      Notification Time
                    </label>
                    <StructuredTimePicker
                      value={medTime}
                      onChange={(newTime) => setMedTime(newTime)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant dark:text-[#c8bedd] uppercase tracking-wider mb-2">
                      Frequency
                    </label>
                    <select
                      value={medFreq}
                      onChange={(e) => setMedFreq(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-outline-variant/50 dark:border-[#3a2d58] bg-white/80 dark:bg-[#1c1230] text-on-surface dark:text-[#eee6ff] font-bold text-xs outline-none cursor-pointer"
                    >
                      <option value="Daily">Daily (Every Day)</option>
                      <option value="Twice Daily">Twice Daily (Morning & Night)</option>
                      <option value="Every Other Day">Every Other Day</option>
                      <option value="Weekly">Weekly</option>
                      <option value="As Needed">As Needed</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface-variant dark:text-[#c8bedd] uppercase tracking-wider mb-2">Type</label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setMedType('medication')}
                      className={`flex-1 py-3 rounded-xl border font-bold text-xs transition-colors ${
                        medType === 'medication' ? 'bg-primary border-primary text-white' : 'border-outline-variant dark:border-[#3a2d58] text-on-surface'
                      }`}
                    >
                      Medication
                    </button>
                    <button
                      type="button"
                      onClick={() => setMedType('supplement')}
                      className={`flex-1 py-3 rounded-xl border font-bold text-xs transition-colors ${
                        medType === 'supplement' ? 'bg-primary border-primary text-white' : 'border-outline-variant dark:border-[#3a2d58] text-on-surface'
                      }`}
                    >
                      Supplement
                    </button>
                  </div>
                </div>

                <div className="pt-4 flex gap-4">
                  <button
                    type="button"
                    onClick={() => setShowAddMedModal(false)}
                    className="flex-1 py-3 rounded-2xl border border-outline-variant dark:border-[#3a2d58] text-on-surface-variant font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-xs shadow-md"
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
