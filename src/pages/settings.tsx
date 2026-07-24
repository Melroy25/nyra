import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeft, Bell, Shield, Download, Trash2, Check, Sparkles, ToggleLeft, ToggleRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SettingsPage() {
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(false);

  // Notification toggles
  const [reminders, setReminders] = useState({
    period: true,
    ovulation: true,
    water: false,
    medication: true,
    selfCare: false,
    insights: true,
    messages: true,
  });

  // Privacy toggles
  const [privacy, setPrivacy] = useState({
    sharePeriod: true,
    shareEnergy: true,
    shareCravings: true,
    shareMood: false,
  });

  const toggleReminder = (key: keyof typeof reminders) => {
    setReminders((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const togglePrivacy = (key: keyof typeof privacy) => {
    setPrivacy((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      router.push('/profile');
    }, 1500);
  };

  return (
    <div className="max-w-[700px] mx-auto px-container-padding-mobile pt-stack-md pb-12 flex flex-col gap-stack-lg">
      
      {/* Header details */}
      <section className="flex items-center gap-4 animate-entrance">
        <button 
          onClick={() => router.push('/profile')}
          className="p-2 bg-white/60 border border-white/50 rounded-full hover:bg-white text-on-surface-variant transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-serif font-bold text-2xl md:text-3xl text-on-surface">Settings</h1>
          <p className="text-xs text-on-surface-variant">Manage your notifications, data privacy, and sharing controls.</p>
        </div>
      </section>

      {/* Notifications configuration */}
      <section className="glass-card rounded-xl p-5 border border-white/40 dark:border-[#3a2d58]/50 shadow-sm space-y-4">
        <h3 className="font-serif font-bold text-lg text-on-background dark:text-[#eee6ff] flex items-center gap-2 mb-2">
          <Bell className="w-4 h-4 text-primary" />
          <span>Notifications & Reminders</span>
        </h3>
        
        <div className="flex flex-col gap-3">
          {[
            { label: 'Period Reminders', desc: 'Get alerts 2 days before predicted period starts.', key: 'period' },
            { label: 'Ovulation Reminders', desc: 'Alerts at the start of fertility windows.', key: 'ovulation' },
            { label: 'Water Reminders', desc: 'Hourly alerts to keep hydration targets on track.', key: 'water' },
            { label: 'Medication Reminders', desc: 'Alerts based on medicine timing checklists.', key: 'medication' },
            { label: 'Self-Care Reminders', desc: 'Alerts suggesting relaxation yoga or sounds.', key: 'selfCare' },
            { label: 'AI Insights alerts', desc: 'Daily dynamic suggestions notifications.', key: 'insights' },
            { label: 'Partner Message alerts', desc: 'Get alerts when partner sends notes or stickers.', key: 'messages' },
          ].map((item) => {
            const isChecked = reminders[item.key as keyof typeof reminders];
            return (
              <div key={item.key} className="flex justify-between items-center py-2 border-b border-outline-variant/10">
                <div className="space-y-0.5 pr-4">
                  <h4 className="text-sm font-bold text-on-surface dark:text-[#eee6ff]">{item.label}</h4>
                  <p className="text-xs text-on-surface-variant dark:text-[#c8bedd] font-semibold leading-normal">{item.desc}</p>
                </div>
                <button 
                  onClick={() => toggleReminder(item.key as keyof typeof reminders)}
                  className={`p-1 transition-colors ${isChecked ? 'text-primary' : 'text-outline-variant'}`}
                >
                  {isChecked ? <ToggleRight className="w-9 h-9" /> : <ToggleLeft className="w-9 h-9" />}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Partner Sharing Permissions */}
      <section className="glass-card rounded-xl p-5 border border-white/40 dark:border-[#3a2d58]/50 shadow-sm space-y-4">
        <h3 className="font-serif font-bold text-lg text-on-background dark:text-[#eee6ff] flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-tertiary" />
          <span>Partner Privacy controls</span>
        </h3>
        
        <div className="flex flex-col gap-3">
          {[
            { label: 'Share Period Predictions', desc: 'Allow partner to view your expected period dates.', key: 'sharePeriod' },
            { label: 'Share Energy Level updates', desc: 'Let partner know when you log fatigue or sluggishness.', key: 'shareEnergy' },
            { label: 'Share Cravings logs', desc: 'Automatically alert partner to food cravings logs.', key: 'shareCravings' },
            { label: 'Share Mood logs', desc: 'Allow partner to view logged emotional cycles.', key: 'shareMood' },
          ].map((item) => {
            const isChecked = privacy[item.key as keyof typeof privacy];
            return (
              <div key={item.key} className="flex justify-between items-center py-2 border-b border-outline-variant/10">
                <div className="space-y-0.5 pr-4">
                  <h4 className="text-sm font-bold text-on-surface dark:text-[#eee6ff]">{item.label}</h4>
                  <p className="text-xs text-on-surface-variant dark:text-[#c8bedd] font-semibold leading-normal">{item.desc}</p>
                </div>
                <button 
                  onClick={() => togglePrivacy(item.key as keyof typeof privacy)}
                  className={`p-1 transition-colors ${isChecked ? 'text-tertiary' : 'text-outline-variant'}`}
                >
                  {isChecked ? <ToggleRight className="w-9 h-9" /> : <ToggleLeft className="w-9 h-9" />}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Local data controls */}
      <section className="glass-card rounded-xl p-5 border border-white/40 dark:border-[#3a2d58]/50 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h3 className="font-serif font-bold text-base text-on-background dark:text-[#eee6ff] mb-1">Your Account Data</h3>
          <p className="text-xs text-on-surface-variant dark:text-[#c8bedd] font-semibold">Download or completely wipe your data records.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 border border-outline-variant/60 dark:border-[#3a2d58]/60 rounded-full text-xs font-bold bg-white/40 dark:bg-[#1c1230]/60 dark:text-[#eee6ff] hover:bg-white dark:hover:bg-[#1c1230] flex items-center gap-1.5 transition-colors">
            <Download className="w-3.5 h-3.5" /> Download Data
          </button>
          <button className="px-4 py-2 border border-error/20 rounded-full text-xs font-bold bg-error-container/20 text-error hover:bg-error-container/40 flex items-center gap-1.5 transition-colors">
            <Trash2 className="w-3.5 h-3.5" /> Clear All
          </button>
        </div>
      </section>

      {/* Save control */}
      <div className="mt-4 pb-6">
        <button
          onClick={handleSave}
          disabled={isSaved}
          className="w-full bg-gradient-to-r from-primary to-secondary text-white font-bold text-sm py-4 rounded-full shadow-lg shadow-primary/20 hover:opacity-95 transform hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          {isSaved ? (
            <>
              <Check className="w-5 h-5" /> Settings Saved!
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>

    </div>
  );
}
