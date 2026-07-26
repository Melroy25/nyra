import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeft, Bell, Shield, Download, Trash2, Check, Sparkles, ToggleLeft, ToggleRight, Smartphone, MonitorSmartphone, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiGetNotificationSettings, apiUpdateNotificationSettings } from '../lib/api';
import { requestNativeNotificationPermission, sendNativeNotification } from '../lib/pushNotifications';

export default function SettingsPage() {
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
      return;
    }
    const ua = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) setIsIos(true);

    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  // Notification toggles — loaded from Supabase
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [reminders, setReminders] = useState({
    period: true,
    ovulation: true,
    water: false,
    medication: true,
    partnerUpdates: true,
    dailyCheckins: false,
  });

  // Privacy toggles (local only, no schema change needed)
  const [privacy, setPrivacy] = useState({
    sharePeriod: true,
    shareEnergy: true,
    shareCravings: true,
    shareMood: false,
  });

  // Load notification settings from DB on mount
  useEffect(() => {
    apiGetNotificationSettings()
      .then(({ settings }) => {
        if (settings) {
          setReminders({
            period: settings.period_reminders ?? true,
            ovulation: settings.fertile_window_alerts ?? true,
            water: settings.water_reminders ?? false,
            medication: settings.daily_checkins ?? true,
            partnerUpdates: settings.partner_updates ?? true,
            dailyCheckins: settings.daily_checkins ?? false,
          });
        }
      })
      .catch(() => {/* use defaults */})
      .finally(() => setSettingsLoading(false));
  }, []);

  const toggleReminder = async (key: keyof typeof reminders) => {
    const newVal = !reminders[key];
    setReminders((prev) => ({ ...prev, [key]: newVal }));

    // Request native notification permission when any toggle is turned ON
    if (newVal) {
      const granted = await requestNativeNotificationPermission();
      if (granted) {
        sendNativeNotification('Nyra Notifications Enabled 🌸', {
          body: 'You will now receive real device notifications from Nyra.',
          tag: 'nyra-perm',
        });
      }
    }

    // Map local keys to DB column names
    const dbKeyMap: Record<string, string> = {
      period: 'period_reminders',
      ovulation: 'fertile_window_alerts',
      water: 'water_reminders',
      medication: 'daily_checkins',
      partnerUpdates: 'partner_updates',
      dailyCheckins: 'daily_checkins',
    };
    try {
      await apiUpdateNotificationSettings({ [dbKeyMap[key]]: newVal });
    } catch (err) {
      console.log('Failed to sync setting:', err);
    }
  };

  const togglePrivacy = (key: keyof typeof privacy) => {
    setPrivacy((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      router.push('/profile');
    }, 1200);
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

        {/* Native push notification note */}
        <div className="flex items-start gap-3 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl p-3">
          <Smartphone className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-primary dark:text-[#d4b8ff] font-semibold leading-relaxed">
            Nyra uses your device's native notification system. Enable any toggle below to allow real push alerts — just like any other app.
          </p>
        </div>
        
        <div className="flex flex-col gap-3">
          {settingsLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
          ) : (
            [
              { label: 'Period Reminders', desc: 'Device alerts 2 days before your predicted period starts.', key: 'period' },
              { label: 'Fertile Window Alerts', desc: 'Native alerts at the start of your ovulation window.', key: 'ovulation' },
              { label: 'Water Reminders', desc: 'Hourly device alerts to hit your daily hydration goal.', key: 'water' },
              { label: 'Daily Check-In', desc: 'Morning reminder to log your mood and symptoms.', key: 'dailyCheckins' },
              { label: 'Partner Updates', desc: 'Get device alerts when your partner sends notes or stickers.', key: 'partnerUpdates' },
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
            })
          )}
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

      {/* Install App as PWA */}
      <section className="glass-card rounded-xl p-5 border border-primary/20 dark:border-[#3a2d58]/60 shadow-sm bg-gradient-to-br from-primary/5 to-tertiary/5 dark:from-primary/10 dark:to-tertiary/10 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <MonitorSmartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-base text-on-background dark:text-[#eee6ff]">Install Nyra App</h3>
            <p className="text-xs text-on-surface-variant dark:text-[#c8bedd] font-semibold">Add Nyra to your home screen for instant 1-tap access.</p>
          </div>
        </div>

        {isInstalled ? (
          <div className="flex items-center gap-2 text-xs font-bold text-primary dark:text-[#d4b8ff]">
            <Check className="w-4 h-4" /> Nyra is already installed on this device!
          </div>
        ) : isIos ? (
          <div className="bg-white/60 dark:bg-[#1c1230]/60 rounded-xl p-4 border border-black/8 dark:border-[#3a2d58]/40 text-xs text-[#3d3050] dark:text-[#c8bedd] font-medium space-y-1.5">
            <p className="font-bold text-[#18003d] dark:text-[#eee6ff] mb-2">iPhone / iPad Instructions:</p>
            <p>1. Tap the <strong>Share ⎋</strong> button in your Safari browser.</p>
            <p>2. Scroll and tap <strong>"Add to Home Screen"</strong>.</p>
            <p>3. Tap <strong>"Add"</strong> — Nyra will appear on your home screen!</p>
          </div>
        ) : deferredPrompt ? (
          <button
            onClick={handleInstall}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-sm shadow-md shadow-primary/20 hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" /> Install App Now
          </button>
        ) : (
          <div className="text-xs text-[#3d3050] dark:text-[#c8bedd] font-medium bg-white/50 dark:bg-[#1c1230]/50 rounded-xl p-3 border border-black/8 dark:border-[#3a2d58]/40">
            Open Nyra in <strong>Chrome</strong> (Android/Desktop) to get the install prompt, or use <strong>Safari</strong> on iPhone and tap "Add to Home Screen".
          </div>
        )}
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
