import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeft, Bell, Shield, Trash2, Check, ToggleLeft, ToggleRight, Smartphone, Loader2, AlertTriangle, Key, X, Lock } from 'lucide-react';
import { useStore } from '../store/useStore';
import { apiGetNotificationSettings, apiUpdateNotificationSettings, apiDeleteAccount, apiRequestPasswordReset, apiResetPassword } from '../lib/api';
import { requestNativeNotificationPermission, sendNativeNotification } from '../lib/pushNotifications';

export default function SettingsPage() {
  const router = useRouter();
  const { user, setUser, featureToggles, setFeatureToggle } = useStore();
  const [isSaved, setIsSaved] = useState(false);

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

  // Privacy toggles with localStorage & DB persistence
  const [privacy, setPrivacy] = useState({
    sharePeriod: true,
    shareEnergy: true,
    shareCravings: true,
    shareMood: true,
  });

  // Delete Account Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Forgot Password / OTP Modal State
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetStep, setResetStep] = useState<'request' | 'verify'>('request');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const [resetErr, setResetErr] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Load notification & privacy settings from DB / localStorage on mount
  useEffect(() => {
    try {
      const savedPrivacy = localStorage.getItem('nyra_privacy_settings');
      if (savedPrivacy) {
        const parsed = JSON.parse(savedPrivacy);
        if (parsed) setPrivacy(parsed);
      }
    } catch (e) {}

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

    if (newVal) {
      const granted = await requestNativeNotificationPermission();
      if (granted) {
        sendNativeNotification('Nyra Notifications Enabled 🌸', {
          body: 'You will now receive real device notifications from Nyra.',
          tag: 'nyra-perm',
        });
      }
    }

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
    setPrivacy((prev) => {
      const nextPrivacy = { ...prev, [key]: !prev[key] };
      if (typeof window !== 'undefined') {
        localStorage.setItem('nyra_privacy_settings', JSON.stringify(nextPrivacy));
      }
      return nextPrivacy;
    });
  };

  const handleSave = async () => {
    setIsSaved(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nyra_privacy_settings', JSON.stringify(privacy));
    }
    try {
      await apiUpdateNotificationSettings({
        period_reminders: reminders.period,
        fertile_window_alerts: reminders.ovulation,
        water_reminders: reminders.water,
        daily_checkins: reminders.dailyCheckins,
        partner_updates: reminders.partnerUpdates,
      });
    } catch (err) {}

    setTimeout(() => {
      setIsSaved(false);
      router.push('/profile');
    }, 1200);
  };

  // Delete Account Handler
  const handleDeleteAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError('');
    setIsDeleting(true);

    try {
      const res = await apiDeleteAccount(deletePassword);
      if (res?.success) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('nyra_token');
        }
        setUser(null);
        router.push('/login');
      } else {
        setDeleteError('Failed to delete account.');
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Incorrect password. Account deletion canceled.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Forgot Password Step 1: Request OTP Email
  const handleRequestResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetErr('');
    setResetMsg('');
    setIsResetting(true);

    try {
      const res = await apiRequestPasswordReset(resetEmail || user?.email || '');
      if (res?.success) {
        setResetMsg('OTP reset code sent to your email. Check your inbox!');
        setResetStep('verify');
      }
    } catch (err: any) {
      setResetErr(err.message || 'Failed to send reset email.');
    } finally {
      setIsResetting(false);
    }
  };

  // Forgot Password Step 2: Verify OTP & Change Password
  const handleVerifyOtpAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetErr('');
    setResetMsg('');
    setIsResetting(true);

    try {
      const res = await apiResetPassword(resetEmail || user?.email || '', resetOtp, newPassword);
      if (res?.success) {
        setResetMsg('Password updated successfully!');
        setTimeout(() => {
          setIsForgotModalOpen(false);
          setResetStep('request');
        }, 1500);
      }
    } catch (err: any) {
      setResetErr(err.message || 'Invalid or expired OTP code.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="max-w-[700px] mx-auto px-container-padding-mobile pt-stack-md pb-12 flex flex-col gap-stack-lg">
      
      {/* Header details */}
      <section className="flex items-center gap-4 animate-entrance">
        <button 
          onClick={() => router.push('/profile')}
          className="p-2 bg-white/60 dark:bg-white/10 border border-white/50 dark:border-[#3a2d58] rounded-full hover:bg-white text-on-surface-variant transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-serif font-bold text-2xl md:text-3xl text-on-surface">Settings</h1>
          <p className="text-xs text-on-surface-variant">Manage your notifications, privacy, and security controls.</p>
        </div>
      </section>

      {/* Notifications configuration */}
      <section className="glass-card rounded-xl p-5 border border-white/40 dark:border-[#3a2d58]/50 shadow-sm space-y-4">
        <h3 className="font-serif font-bold text-lg text-on-background dark:text-[#eee6ff] flex items-center gap-2 mb-2">
          <Bell className="w-4 h-4 text-primary" />
          <span>{user?.role === 'partner' ? 'Partner Notifications & Reminders' : 'Notifications & Reminders'}</span>
        </h3>

        <div className="flex items-start gap-3 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl p-3">
          <Smartphone className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-primary dark:text-[#d4b8ff] font-semibold leading-relaxed">
            Nyra uses your device&apos;s native notification system. Enable any toggle below to allow real push alerts.
          </p>
        </div>
        
        <div className="flex flex-col gap-3">
          {settingsLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
          ) : (
            (user?.role === 'partner' ? [
              { label: 'Period Reminders', desc: 'Device alerts 3, 2, and 1 day before her predicted period starts.', key: 'period' },
              { label: 'Fertile Window Alerts', desc: 'Native alerts at the start of her ovulation window.', key: 'ovulation' },
              { label: 'Chat Message Notifications', desc: 'Get device alerts when she sends chat messages or stickers.', key: 'partnerUpdates' },
            ] : [
              { label: 'Period Reminders', desc: 'Device alerts 2 days before your predicted period starts.', key: 'period' },
              { label: 'Fertile Window Alerts', desc: 'Native alerts at the start of your ovulation window.', key: 'ovulation' },
              { label: 'Daily Check-In', desc: 'Morning reminder to log your daily mood and symptoms.', key: 'dailyCheckins' },
              { label: 'Chat Message Notifications', desc: 'Get device alerts when your partner sends chat messages.', key: 'partnerUpdates' },
              { label: 'Medications & Skincare Reminders', desc: 'Device alerts at your scheduled times for medications and skincare.', key: 'medication' },
              { label: 'Water Drink Reminders', desc: 'Periodic device alerts to stay hydrated and hit your goal.', key: 'water' },
            ]).map((item) => {
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

      {/* App Feature Customization (Show / Hide Features) */}
      {user?.role !== 'partner' ? (
        <section className="glass-card rounded-xl p-5 border border-white/40 dark:border-[#3a2d58]/50 shadow-sm space-y-4">
          <h3 className="font-serif font-bold text-lg text-on-background dark:text-[#eee6ff] flex items-center gap-2 mb-2">
            <Smartphone className="w-4 h-4 text-secondary" />
            <span>Feature Controls (Show / Hide Modules)</span>
          </h3>

          <div className="flex flex-col gap-3">
            {[
              { 
                label: 'Water Tracker & Weekly Graph', 
                desc: 'If turned OFF, the entire Water Tracking card & graph will be hidden across Dashboard & Routines.', 
                key: 'waterEnabled' 
              },
              { 
                label: 'Mood Tracking Module', 
                desc: 'If turned OFF, Mood logging shortcuts & analytics will be hidden.', 
                key: 'moodEnabled' 
              },
              { 
                label: 'Symptoms Logging Module', 
                desc: 'If turned OFF, Symptoms logging shortcuts & analytics will be hidden.', 
                key: 'symptomsEnabled' 
              },
            ].map((feat) => {
              const isEnabled = featureToggles ? Boolean(featureToggles[feat.key as keyof typeof featureToggles]) : true;
              return (
                <div key={feat.key} className="flex justify-between items-center py-2 border-b border-outline-variant/10">
                  <div className="space-y-0.5 pr-4">
                    <h4 className="text-sm font-bold text-on-surface dark:text-[#eee6ff]">{feat.label}</h4>
                    <p className="text-xs text-on-surface-variant dark:text-[#c8bedd] font-semibold leading-normal">{feat.desc}</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      if (setFeatureToggle) {
                        setFeatureToggle(feat.key as any, !isEnabled);
                      }
                    }}
                    className={`p-1 transition-colors ${isEnabled ? 'text-secondary' : 'text-outline-variant'}`}
                  >
                    {isEnabled ? <ToggleRight className="w-9 h-9" /> : <ToggleLeft className="w-9 h-9" />}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Partner Sharing Permissions */}
      <section className="glass-card rounded-xl p-5 border border-white/40 dark:border-[#3a2d58]/50 shadow-sm space-y-4">
        <h3 className="font-serif font-bold text-lg text-on-background dark:text-[#eee6ff] flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-tertiary" />
          <span>Partner Privacy Controls</span>
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

      {/* Account Deletion Section */}
      <section className="glass-card rounded-xl p-5 border border-red-200/50 dark:border-red-900/40 bg-red-500/5 dark:bg-red-950/20 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h3 className="font-serif font-bold text-base text-red-600 dark:text-red-400 mb-1 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Delete Account
          </h3>
          <p className="text-xs text-on-surface-variant dark:text-[#c8bedd] font-semibold">Permanently wipe your account, logs, and partner links.</p>
        </div>
        <button
          onClick={() => {
            setDeletePassword('');
            setDeleteError('');
            setIsDeleteModalOpen(true);
          }}
          className="px-4 py-2 border border-red-500/30 rounded-xl text-xs font-bold bg-red-500 text-white hover:bg-red-600 flex items-center gap-1.5 transition-all shadow-sm shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" /> Delete Account
        </button>
      </section>

      {/* Save control */}
      <div className="mt-2 pb-6">
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

      {/* ── DELETE ACCOUNT CONFIRMATION MODAL ── */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#16102a] border border-red-500/30 rounded-3xl p-6 w-full max-w-md shadow-2xl relative space-y-4">
            <div className="flex justify-between items-center border-b border-outline-variant/20 dark:border-[#3a2d58] pb-3">
              <h3 className="font-serif font-bold text-lg text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> Delete Account Confirmation
              </h3>
              <button onClick={() => setIsDeleteModalOpen(false)} className="p-1 rounded-full text-on-surface-variant hover:bg-black/5 dark:hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-on-surface dark:text-[#c8bedd] font-semibold leading-relaxed">
              This action is permanent and cannot be undone. Enter your password to verify ownership and confirm account deletion.
            </p>

            {deleteError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs font-bold text-red-600 dark:text-red-400">
                {deleteError}
              </div>
            )}

            <form onSubmit={handleDeleteAccountSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface dark:text-[#c8bedd] uppercase tracking-wider mb-1">Your Password</label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Enter your current password"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-outline-variant dark:border-[#3a2d58] bg-white/80 dark:bg-[#1c1230] text-sm font-semibold text-[#18003d] dark:text-[#eee6ff] outline-none focus:ring-2 focus:ring-red-500/30"
                />
              </div>

              <div className="flex justify-between items-center text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setResetEmail(user?.email || '');
                    setResetStep('request');
                    setResetMsg('');
                    setResetErr('');
                    setIsForgotModalOpen(true);
                  }}
                  className="text-primary dark:text-[#d4b8ff] hover:underline font-bold"
                >
                  Forgot password? Reset via OTP
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-outline-variant dark:border-[#3a2d58] text-xs font-bold text-on-surface dark:text-[#c8bedd]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeleting || !deletePassword}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold shadow-md hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Deletion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── FORGOT PASSWORD / OTP MODAL ── */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#16102a] border border-primary/30 rounded-3xl p-6 w-full max-w-md shadow-2xl relative space-y-4">
            <div className="flex justify-between items-center border-b border-outline-variant/20 dark:border-[#3a2d58] pb-3">
              <h3 className="font-serif font-bold text-lg text-primary dark:text-[#d4b8ff] flex items-center gap-2">
                <Key className="w-5 h-5" /> Forgot Password / OTP Reset
              </h3>
              <button onClick={() => setIsForgotModalOpen(false)} className="p-1 rounded-full text-on-surface-variant hover:bg-black/5 dark:hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetMsg && (
              <div className="p-3 bg-primary/10 border border-primary/30 rounded-xl text-xs font-bold text-primary dark:text-[#d4b8ff]">
                {resetMsg}
              </div>
            )}
            {resetErr && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs font-bold text-red-600 dark:text-red-400">
                {resetErr}
              </div>
            )}

            {resetStep === 'request' ? (
              <form onSubmit={handleRequestResetOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface dark:text-[#c8bedd] uppercase tracking-wider mb-1">Email Address</label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant dark:border-[#3a2d58] bg-white/80 dark:bg-[#1c1230] text-sm font-semibold text-[#18003d] dark:text-[#eee6ff] outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isResetting || !resetEmail}
                  className="w-full py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-md hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isResetting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Code (OTP)'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtpAndReset} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface dark:text-[#c8bedd] uppercase tracking-wider mb-1">Enter OTP Code</label>
                  <input
                    type="text"
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value)}
                    placeholder="Enter OTP from your email"
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant dark:border-[#3a2d58] bg-white/80 dark:bg-[#1c1230] text-sm font-semibold text-[#18003d] dark:text-[#eee6ff] outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface dark:text-[#c8bedd] uppercase tracking-wider mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter at least 6 characters"
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant dark:border-[#3a2d58] bg-white/80 dark:bg-[#1c1230] text-sm font-semibold text-[#18003d] dark:text-[#eee6ff] outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isResetting || !resetOtp || !newPassword}
                  className="w-full py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-md hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isResetting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Set New Password'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
