import React, { useState, useEffect } from 'react';
import { useNyraStore } from '../store/useNyraStore';
import { useAuth } from '../hooks/useAuth';
import { Bell, Heart, Camera, LogOut, Download, Copy, Check } from 'lucide-react';

// Helper to parse 24h string "HH:MM" to { hour, minute, ampm }
const parse24h = (time24: string) => {
  if (!time24) return { hour: '08', minute: '00', ampm: 'AM' };
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  if (isNaN(h)) h = 8;
  const ampm = h >= 12 ? 'PM' : 'AM';
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  const hour = h12.toString().padStart(2, '0');
  
  // Normalize minute to nearest 5 minutes
  let m = parseInt(mStr, 10);
  if (isNaN(m)) m = 0;
  const roundedM = Math.round(m / 5) * 5;
  const normalizedM = roundedM >= 60 ? 55 : roundedM; // cap at 55
  const minute = normalizedM.toString().padStart(2, '0');
  
  return { hour, minute, ampm };
};

// Helper to compile { hour, minute, ampm } back to 24h string "HH:MM"
const format24h = (hour12: string, minute: string, ampm: string) => {
  let h = parseInt(hour12, 10);
  if (isNaN(h)) h = 8;
  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return `${h.toString().padStart(2, '0')}:${minute}`;
};

interface TimeSelectGroupProps {
  value: string;
  onChange: (val: string) => void;
}

const TimeSelectGroup: React.FC<TimeSelectGroupProps> = ({ value, onChange }) => {
  const { hour, minute, ampm } = parse24h(value);

  const handleHourChange = (newHour: string) => {
    onChange(format24h(newHour, minute, ampm));
  };

  const handleMinuteChange = (newMin: string) => {
    onChange(format24h(hour, newMin, ampm));
  };

  const handleAmpmChange = (newAmpm: string) => {
    onChange(format24h(hour, minute, newAmpm));
  };

  return (
    <div className="flex gap-1 items-center bg-white dark:bg-slate-900 border border-purple-100 dark:border-white/10 rounded-xl px-2 py-1 shadow-xs shrink-0 max-w-[115px] w-full justify-between">
      <select
        value={hour}
        onChange={(e) => handleHourChange(e.target.value)}
        className="bg-transparent border-0 text-[10px] text-textpurple dark:text-purple-100 font-bold focus:outline-none cursor-pointer py-0.5 w-6 text-center appearance-none"
      >
        {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map((h) => (
          <option key={h} value={h} className="bg-white dark:bg-slate-800 text-textpurple dark:text-purple-100">{h}</option>
        ))}
      </select>
      <span className="text-[10px] text-slate-400 font-bold">:</span>
      <select
        value={minute}
        onChange={(e) => handleMinuteChange(e.target.value)}
        className="bg-transparent border-0 text-[10px] text-textpurple dark:text-purple-100 font-bold focus:outline-none cursor-pointer py-0.5 w-6 text-center appearance-none"
      >
        {Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0')).map((m) => (
          <option key={m} value={m} className="bg-white dark:bg-slate-800 text-textpurple dark:text-purple-100">{m}</option>
        ))}
      </select>
      <select
        value={ampm}
        onChange={(e) => handleAmpmChange(e.target.value)}
        className="bg-transparent border-0 text-[10px] text-textpurple dark:text-purple-100 font-bold focus:outline-none cursor-pointer py-0.5 w-8 text-center appearance-none"
      >
        <option value="AM" className="bg-white dark:bg-slate-800 text-textpurple dark:text-purple-100">AM</option>
        <option value="PM" className="bg-white dark:bg-slate-800 text-textpurple dark:text-purple-100">PM</option>
      </select>
    </div>
  );
};

export const ProfileScreen: React.FC = () => {
  const { 
    profile, 
    updateProfile, 
    notifications, 
    updateNotifications, 
    darkMode, 
    toggleDarkMode,
    medications,
    addMedication,
    removeMedication,
    resetState
  } = useNyraStore();
  const { signOut } = useAuth();

  // Local form states
  const [name, setName] = useState(profile.name);
  const [age, setAge] = useState(profile.age);
  const [cycleLength, setCycleLength] = useState(profile.avgCycleLength);
  const [periodLength, setPeriodLength] = useState(profile.avgPeriodLength);
  const [lastPeriodStart, setLastPeriodStart] = useState(profile.lastPeriodStart || '');
  const [lastPeriodEnd, setLastPeriodEnd] = useState(profile.lastPeriodEnd || '');
  const [hydrationGoal, setHydrationGoal] = useState(profile.hydrationGoal || 8);
  const [isSaved, setIsSaved] = useState(false);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) {
      setIsInstallable(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  const copyWidgetLink = (type: string) => {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/?widget=${type}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedText(type);
      setTimeout(() => setCopiedText(null), 2000);
    });
  };

  const handleSignOut = async () => {
    await signOut();
    resetState();
  };

  // Medication form states & handlers
  const [newMedName, setNewMedName] = useState('');
  const [medFrequency, setMedFrequency] = useState<1 | 2 | 3>(1);
  const [newMedTime1, setNewMedTime1] = useState('08:00');
  const [newMedTime2, setNewMedTime2] = useState('14:00');
  const [newMedTime3, setNewMedTime3] = useState('20:00');
  const [medDurationDays, setMedDurationDays] = useState(7);

  const handleAddMedClick = () => {
    if (!newMedName.trim()) return;
    const times = [];
    if (medFrequency >= 1) times.push(newMedTime1);
    if (medFrequency >= 2) times.push(newMedTime2);
    if (medFrequency >= 3) times.push(newMedTime3);
    addMedication(newMedName, times, medDurationDays);
    setNewMedName('');
  };

  const getDaysRemaining = (med: any) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(med.startDate);
    start.setHours(0, 0, 0, 0);
    const elapsedDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return med.durationDays - elapsedDays;
  };

  const getDaysRemainingText = (med: any): string => {
    const remaining = getDaysRemaining(med);
    if (remaining <= 0) return 'Ended';
    return `${remaining}d left`;
  };

  const formatTime12h = (time24h: string): string => {
    if (!time24h) return '8:00 PM';
    const [hoursStr, minutesStr] = time24h.split(':');
    const hours = parseInt(hoursStr, 10);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;
    return `${displayHours}:${minutesStr} ${ampm}`;
  };

  const handleNotificationToggle = (key: keyof typeof notifications) => {
    updateNotifications({ [key]: !notifications[key] });
  };

  const handleSaveProfile = () => {
    updateProfile({
      name,
      age,
      avgCycleLength: cycleLength,
      avgPeriodLength: periodLength,
      lastPeriodStart,
      lastPeriodEnd,
      hydrationGoal
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="flex-1 p-5 pt-[68px] space-y-5 pb-10 overflow-y-auto">
      
      {/* Profile Header card */}
      <div className="p-5 rounded-3xl bg-white border border-purple-100/50 shadow-sm flex items-center gap-4">
        <div className="relative group shrink-0">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white text-2xl font-bold shadow-md overflow-hidden">
            {profile.avatar ? (
              <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              profile.name[0]
            )}
          </div>
          <label className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-white border border-purple-100 shadow-sm flex items-center justify-center text-slate-500 hover:text-primary transition-colors cursor-pointer">
            <Camera className="w-3.5 h-3.5" />
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    if (typeof reader.result === 'string') {
                      updateProfile({ avatar: reader.result });
                    }
                  };
                  reader.readAsDataURL(e.target.files[0]);
                }
              }}
            />
          </label>
        </div>
        <div>
          <h3 className="font-serif text-lg font-bold text-textpurple">{profile.name}</h3>
          <p className="text-[10px] text-slate-400">Age: {profile.age} • Average Cycle: {profile.avgCycleLength} Days</p>
        </div>
      </div>

      {/* Account Profile Settings card */}
      <div className="p-5 rounded-3xl bg-white border border-purple-100/50 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-purple-50 pb-2">
          <h4 className="text-xs font-bold text-textpurple flex items-center gap-1.5">
            👤 Account Profile Settings
          </h4>
          <button
            onClick={handleSaveProfile}
            className={`px-3 py-1 text-[10px] font-bold rounded-lg shadow-xs transition-colors cursor-pointer ${
              isSaved ? 'bg-emerald-500 text-white' : 'bg-primary hover:bg-primary/95 text-white'
            }`}
          >
            {isSaved ? '✓ Saved' : 'Set'}
          </button>
        </div>
        
        <div className="space-y-3">
          {/* Name & Age Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-purple-100 bg-white text-xs text-textpurple focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Age (Years)</label>
              <input
                type="number"
                min="14"
                max="60"
                value={age}
                onChange={(e) => setAge(parseInt(e.target.value) || age)}
                className="w-full px-3 py-2 rounded-xl border border-purple-100 bg-white text-xs text-textpurple focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Average Cycle & Period Lengths */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Cycle Duration (Days)</label>
              <input
                type="number"
                min="21"
                max="40"
                value={cycleLength}
                onChange={(e) => setCycleLength(parseInt(e.target.value) || cycleLength)}
                className="w-full px-3 py-2 rounded-xl border border-purple-100 bg-white text-xs text-textpurple focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Period Duration (Days)</label>
              <input
                type="number"
                min="3"
                max="10"
                value={periodLength}
                onChange={(e) => setPeriodLength(parseInt(e.target.value) || periodLength)}
                className="w-full px-3 py-2 rounded-xl border border-purple-100 bg-white text-xs text-textpurple focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Last Period Start & End Dates */}
          <div className="grid grid-cols-2 gap-3 border-t border-purple-50 pt-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Last Period Start</label>
              <input
                type="date"
                value={lastPeriodStart}
                onChange={(e) => setLastPeriodStart(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-purple-100 bg-white text-xs text-textpurple focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">When It Ended</label>
              <input
                type="date"
                value={lastPeriodEnd}
                onChange={(e) => setLastPeriodEnd(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-purple-100 bg-white text-xs text-textpurple focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Hydration Goal Settings */}
          <div className="border-t border-purple-50 pt-3">
            <label className="block text-[10px] font-bold text-slate-400 mb-1">Daily Hydration Goal (Cups)</label>
            <input
              type="number"
              min="1"
              max="20"
              value={hydrationGoal}
              onChange={(e) => setHydrationGoal(parseInt(e.target.value) || hydrationGoal)}
              className="w-full px-3 py-2 rounded-xl border border-purple-100 bg-white text-xs text-textpurple focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
        </div>
      </div>

      {/* Interface Settings */}
      <div className="p-5 rounded-3xl bg-white border border-purple-100/50 shadow-sm space-y-3.5">
        <h4 className="text-xs font-bold text-textpurple flex items-center gap-1.5 border-b border-purple-50 pb-2">
          🎨 Interface Settings
        </h4>
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-500 font-medium">Dark Mode Theme</span>
          <button
            onClick={toggleDarkMode}
            className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
              darkMode ? 'bg-primary' : 'bg-slate-200'
            }`}
          >
            <div className={`w-4 h-4 bg-white rounded-full transition-transform shadow-xs ${
              darkMode ? 'translate-x-4' : 'translate-x-0'
            }`} />
          </button>
        </div>
      </div>

      {/* Notification Reminders */}
      <div className="p-5 rounded-3xl bg-white border border-purple-100/50 shadow-sm space-y-3.5">
        <h4 className="text-xs font-bold text-textpurple flex items-center gap-1.5 border-b border-purple-50 pb-2">
          <Bell className="w-4 h-4 text-primary" /> Daily Reminders Settings
        </h4>

        {/* Toggles list */}
        <div className="space-y-3.5">
          {[
            { key: 'periodReminders', label: 'Period Predictions & Start alerts' },
            { key: 'ovulationReminders', label: 'Ovulation & Fertility window alerts' },
            { key: 'dailyCheckIn', label: 'Check-in logging request' },
            { key: 'waterReminders', label: 'Water hydration goal reminders' },
            { key: 'medicationReminders', label: 'Medication or supplement reminders' },
          ].map((item) => {
            const isChecked = notifications[item.key as keyof typeof notifications];
            return (
              <div key={item.key} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-medium">{item.label}</span>
                  <button
                    onClick={() => handleNotificationToggle(item.key as keyof typeof notifications)}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                      isChecked ? 'bg-primary' : 'bg-slate-200'
                    }`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform shadow-xs ${
                      isChecked ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
                {item.key === 'dailyCheckIn' && isChecked && (
                  <div className="ml-4 flex items-center justify-between bg-purple-50/50 border border-purple-100/30 p-2.5 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-medium">Log Reminder Time</span>
                    <TimeSelectGroup
                      value={notifications.dailyCheckInTime || '20:00'}
                      onChange={(val) => updateNotifications({ dailyCheckInTime: val })}
                    />
                  </div>
                )}
                {item.key === 'medicationReminders' && isChecked && (
                  <div className="ml-4 space-y-2.5 bg-purple-50/50 border border-purple-100/30 p-3 rounded-xl mt-1">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                      Active Medications & Times
                    </span>
                    
                    {/* Medications List */}
                    <div className="space-y-1.5">
                      {medications.length > 0 ? (
                        medications.map((med) => {
                          const remaining = getDaysRemaining(med);
                          const isEnded = remaining <= 0;
                          return (
                            <div key={med.id} className="flex justify-between items-center bg-white dark:bg-slate-900/50 p-2 rounded-lg border border-purple-100 dark:border-white/5">
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-xs font-semibold ${isEnded ? 'text-slate-400 line-through' : 'text-textpurple'}`}>{med.name}</span>
                                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                                    isEnded 
                                      ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400' 
                                      : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                                  }`}>
                                    {getDaysRemainingText(med)}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {med.times.map((t, i) => (
                                    <span key={i} className="text-[8px] text-slate-400 bg-purple-50 dark:bg-purple-950/40 px-1 py-0.2 rounded font-mono font-semibold">
                                      {formatTime12h(t)}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <button
                                onClick={() => removeMedication(med.id)}
                                className="text-slate-400 hover:text-rose-500 text-xs font-bold px-1.5 cursor-pointer"
                                title="Remove"
                              >
                                ✕
                              </button>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-[10px] text-slate-400 italic">No medications added yet.</p>
                      )}
                    </div>
                    
                    {/* Add Medication Form */}
                    <div className="border-t border-purple-100 dark:border-white/10 pt-2.5 space-y-2.5">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-1">
                          <label className="block text-[9px] text-slate-400 mb-0.5 font-bold">Medication Name</label>
                          <input
                            type="text"
                            value={newMedName}
                            onChange={(e) => setNewMedName(e.target.value)}
                            placeholder="e.g. Vitamin D"
                            className="w-full px-2 py-1 bg-white dark:bg-slate-900 text-[11px] text-textpurple rounded-lg border border-purple-100 dark:border-white/10 focus:outline-none"
                          />
                        </div>
                        <div className="col-span-1">
                          <label className="block text-[9px] text-slate-400 mb-0.5 font-bold">Duration (Days)</label>
                          <input
                            type="number"
                            min="1"
                            max="365"
                            value={medDurationDays}
                            onChange={(e) => setMedDurationDays(parseInt(e.target.value) || 7)}
                            className="w-full px-2 py-1 bg-white dark:bg-slate-900 text-[11px] text-textpurple rounded-lg border border-purple-100 dark:border-white/10 focus:outline-none"
                          />
                        </div>
                        <div className="col-span-1">
                          <label className="block text-[9px] text-slate-400 mb-0.5 font-bold">Frequency</label>
                          <select
                            value={medFrequency}
                            onChange={(e) => setMedFrequency(parseInt(e.target.value) as 1 | 2 | 3)}
                            className="w-full px-1.5 py-1 bg-white dark:bg-slate-900 text-[11px] text-textpurple rounded-lg border border-purple-100 dark:border-white/10 focus:outline-none cursor-pointer"
                          >
                            <option value="1">1x daily</option>
                            <option value="2">2x daily</option>
                            <option value="3">3x daily</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 items-end justify-between bg-purple-50/30 dark:bg-slate-900/30 p-2 rounded-xl border border-purple-100/30 dark:border-white/5">
                        <div className="flex flex-1 gap-2 min-w-0">
                          {medFrequency >= 1 && (
                            <div className="flex-1 min-w-[95px]">
                              <label className="block text-[8px] text-slate-400 mb-0.5 font-bold">Time 1</label>
                              <TimeSelectGroup
                                value={newMedTime1}
                                onChange={setNewMedTime1}
                              />
                            </div>
                          )}
                          {medFrequency >= 2 && (
                            <div className="flex-1 min-w-[95px]">
                              <label className="block text-[8px] text-slate-400 mb-0.5 font-bold">Time 2</label>
                              <TimeSelectGroup
                                value={newMedTime2}
                                onChange={setNewMedTime2}
                              />
                            </div>
                          )}
                          {medFrequency >= 3 && (
                            <div className="flex-1 min-w-[95px]">
                              <label className="block text-[8px] text-slate-400 mb-0.5 font-bold">Time 3</label>
                              <TimeSelectGroup
                                value={newMedTime3}
                                onChange={setNewMedTime3}
                              />
                            </div>
                          )}
                        </div>
                        <button
                          onClick={handleAddMedClick}
                          className="px-4 py-1.5 bg-primary text-white text-[11px] font-bold rounded-lg hover:bg-primary/95 transition-colors cursor-pointer shrink-0 h-7 flex items-center justify-center"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* PWA & Widgets Hub Card */}
      <div className="p-5 rounded-3xl bg-white border border-purple-100/50 shadow-sm space-y-4">
        <h4 className="text-xs font-bold text-textpurple flex items-center gap-1.5 border-b border-purple-50 pb-2">
          🧩 Nyra Widgets & PWA Hub
        </h4>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Install Nyra as a Progressive Web App for offline support, and copy interactive widget links to pin on your desktop or mobile home screen.
        </p>

        {/* PWA Install Button */}
        {isInstallable ? (
          <button
            onClick={handleInstallApp}
            className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary/95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Install Nyra Web App
          </button>
        ) : (
          <div className="w-full py-2.5 rounded-xl bg-purple-50/50 text-textpurple font-semibold text-xs flex items-center justify-center gap-1.5 border border-purple-100/30">
            <span>✨</span> App is running in PWA Mode
          </div>
        )}

        {/* Widgets Links Grid */}
        <div className="space-y-2.5 mt-3 pt-3 border-t border-purple-50">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
            Standalone Widget Links
          </span>
          <div className="grid grid-cols-2 gap-2.5">
            {/* Cycle Widget Link */}
            <div className="p-3 rounded-2xl bg-purple-50/50 border border-purple-100/50 flex flex-col justify-between items-start min-h-[90px]">
              <div>
                <span className="text-[10px] font-bold text-textpurple block">Cycle Widget</span>
                <span className="text-[9px] text-slate-400 block mt-0.5">Current cycle day progress ring</span>
              </div>
              <button
                onClick={() => copyWidgetLink('cycle')}
                className="w-full mt-2.5 py-1.5 rounded-lg bg-white border border-purple-100 hover:bg-purple-50 text-[10px] text-primary font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                {copiedText === 'cycle' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy Link
                  </>
                )}
              </button>
            </div>

            {/* Hydration Widget Link */}
            <div className="p-3 rounded-2xl bg-purple-50/50 border border-purple-100/50 flex flex-col justify-between items-start min-h-[90px]">
              <div>
                <span className="text-[10px] font-bold text-textpurple block">Water Widget</span>
                <span className="text-[9px] text-slate-400 block mt-0.5">Logged water intake & quick log</span>
              </div>
              <button
                onClick={() => copyWidgetLink('water')}
                className="w-full mt-2.5 py-1.5 rounded-lg bg-white border border-purple-100 hover:bg-purple-50 text-[10px] text-primary font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                {copiedText === 'water' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy Link
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sign Out Button */}
      <button
        onClick={handleSignOut}
        className="w-full py-3.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-500 font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer border border-red-500/20"
      >
        <LogOut className="w-4 h-4" />
        Sign Out
      </button>

      {/* Brand footer */}
      <div className="text-center py-4">
        <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
          Made with <Heart className="w-3 h-3 text-accent fill-accent" /> by M-Creations
        </p>
        <p className="text-[9px] text-slate-300 mt-1">Nyra App v1.0.0</p>
      </div>

    </div>
  );
};
