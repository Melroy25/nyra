import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useStore } from '../store/useStore';
import { Calendar, Heart, Pencil, X, Check, Loader2 } from 'lucide-react';
import { apiUpdateProfile } from '../lib/api';

const avatarPresets = [
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
];

const availableGoals = [
  'Track cycle',
  'Improve nutrition',
  'Understand symptoms',
  'Improve wellness & Sleep',
  'Fertility tracking',
];

export default function ProfilePage() {
  const router = useRouter();
  const { onboardingData, user, setUser, updateOnboardingData } = useStore();

  const name = user?.name || onboardingData.name || 'User';
  const age = user?.age || onboardingData.age || 0;
  const dob = user?.dateOfBirth || onboardingData.dob || '';
  const avatarUrl = user?.avatarUrl || avatarPresets[0];
  const cycleLength = onboardingData.averageCycleLength || 28;
  const periodDuration = onboardingData.periodDuration || 5;
  const goals = user?.goals && user.goals.length > 0 ? user.goals : onboardingData.goals || ['Track cycle'];

  // Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState(name);
  const [editAge, setEditAge] = useState(age);
  const [editDob, setEditDob] = useState(dob);
  const [editAvatar, setEditAvatar] = useState(avatarUrl);
  const [editGoals, setEditGoals] = useState<string[]>(goals);
  const [isSaving, setIsSaving] = useState(false);

  const headingCls = 'text-[#18003d] dark:text-[#eee6ff]';
  const labelCls   = 'text-[#3d3050] dark:text-[#c8bedd]';

  const handleGoalToggle = (g: string) => {
    if (editGoals.includes(g)) {
      setEditGoals(editGoals.filter((item) => item !== g));
    } else {
      setEditGoals([...editGoals, g]);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Call Supabase API
      const res = await apiUpdateProfile({
        name: editName,
        age: editAge,
        dateOfBirth: editDob,
        goals: editGoals,
        avatarUrl: editAvatar,
      });

      if (res?.user) {
        setUser({
          ...user,
          ...res.user,
        });
      }

      // Sync local Zustand state
      updateOnboardingData({
        name: editName,
        age: editAge,
        dob: editDob,
        goals: editGoals,
      });

      setIsEditOpen(false);
    } catch (err) {
      console.log('Failed to save profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-[800px] mx-auto px-container-padding-mobile pt-stack-md pb-12 flex flex-col gap-stack-lg">

      {/* ── Profile Header Card ── */}
      <section className="glass-card rounded-2xl p-6 border border-white/50 dark:border-[#3a2d58]/40 shadow-sm flex flex-col sm:flex-row items-center gap-6 animate-entrance">
        <div className="w-20 h-20 rounded-full bg-surface-container-high overflow-hidden border-2 border-primary/20 shadow-md shrink-0">
          <img
            src={avatarUrl}
            alt={`${name} Avatar`}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="text-center sm:text-left flex-1 space-y-1">
          <h1 className={`font-serif font-bold text-2xl md:text-3xl ${headingCls}`}>{name}</h1>
          <p className={`text-xs font-semibold ${labelCls}`}>
            {age ? `Age ${age}` : 'Age not set'} {dob ? `• Born ${dob}` : ''}
          </p>
        </div>

        {/* Edit Profile Button */}
        <button
          onClick={() => {
            setEditName(name);
            setEditAge(age);
            setEditDob(dob);
            setEditAvatar(avatarUrl);
            setEditGoals(goals);
            setIsEditOpen(true);
          }}
          className="px-4 py-2.5 bg-primary text-white rounded-xl font-bold text-xs shadow-md hover:bg-primary/90 flex items-center gap-2 transition-all active:scale-95 shrink-0"
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit Profile
        </button>
      </section>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Cycle Configuration Card */}
        <div className="glass-card rounded-2xl p-5 border border-white/40 dark:border-[#3a2d58]/50 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className={`font-serif font-bold text-lg ${headingCls} mb-4 flex items-center gap-2`}>
              <Calendar className="w-4 h-4 text-primary" />
              <span>Cycle Configuration</span>
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs font-semibold border-b border-black/8 dark:border-[#3a2d58]/60 pb-2">
                <span className={labelCls}>Average Cycle Length</span>
                <span className="font-bold text-primary dark:text-[#d4b8ff]">{cycleLength} Days</span>
              </div>
              <div className="flex justify-between items-center text-xs font-semibold border-b border-black/8 dark:border-[#3a2d58]/60 pb-2">
                <span className={labelCls}>Average Period Duration</span>
                <span className="font-bold text-primary dark:text-[#d4b8ff]">{periodDuration} Days</span>
              </div>
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className={labelCls}>Next Period Peak</span>
                <span className={`font-bold ${headingCls}`}>Normal</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => router.push('/onboarding')}
            className="w-full mt-6 py-2.5 rounded-2xl border border-primary/30 dark:border-primary/40 hover:border-primary bg-primary/5 dark:bg-primary/10 hover:bg-primary/15 text-xs font-bold text-primary dark:text-[#d4b8ff] transition-all"
          >
            Update Cycle Parameters
          </button>
        </div>

        {/* Partner Connection Card */}
        <div className="glass-card rounded-2xl p-5 border border-white/40 dark:border-[#3a2d58]/50 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className={`font-serif font-bold text-lg ${headingCls} mb-4 flex items-center gap-2`}>
              <Heart className="w-4 h-4 text-tertiary" />
              <span>Connected Partner</span>
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs font-semibold border-b border-black/8 dark:border-[#3a2d58]/60 pb-2">
                <span className={labelCls}>Link Status</span>
                <span className={`font-bold ${user?.connectedPartnerId || user?.connectedPartner ? 'text-tertiary' : 'text-slate-400'}`}>
                  {user?.connectedPartnerId || user?.connectedPartner ? 'Connected' : 'Not Connected'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs font-semibold border-b border-black/8 dark:border-[#3a2d58]/60 pb-2">
                <span className={labelCls}>Partner Connection Code</span>
                <span className={`font-bold ${headingCls}`}>{user?.partnerCode || 'Not Generated'}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className={labelCls}>Partner View Permissions</span>
                <span
                  className="font-bold text-primary dark:text-[#d4b8ff] hover:underline cursor-pointer"
                  onClick={() => router.push('/settings')}
                >Custom</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => router.push('/partner')}
            className="w-full mt-6 py-2.5 rounded-2xl border border-tertiary/30 dark:border-tertiary/40 hover:border-tertiary bg-tertiary/5 dark:bg-tertiary/10 hover:bg-tertiary/15 text-xs font-bold text-tertiary transition-all"
          >
            View Partner Updates
          </button>
        </div>

      </div>

      {/* ── Goals Section ── */}
      <section className="glass-card rounded-2xl p-5 border border-white/40 dark:border-[#3a2d58]/50 shadow-sm">
        <h3 className={`font-serif font-bold text-lg ${headingCls} mb-4`}>Your Active Focus &amp; Goals</h3>
        <div className="flex flex-wrap gap-2.5">
          {goals.map((goal, idx) => (
            <span
              key={idx}
              className="px-4 py-2 bg-primary/10 dark:bg-primary/20 border border-primary/20 dark:border-primary/30 rounded-xl text-xs font-bold text-primary dark:text-[#d4b8ff]"
            >
              {goal}
            </span>
          ))}
        </div>
      </section>

      {/* ── Edit Profile Modal ── */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#16102a] border border-white/40 dark:border-[#3a2d58] rounded-3xl p-6 w-full max-w-md shadow-2xl relative space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-outline-variant/20 dark:border-[#3a2d58] pb-3">
              <h3 className="font-serif font-bold text-xl text-[#18003d] dark:text-[#eee6ff]">Edit Profile</h3>
              <button
                onClick={() => setIsEditOpen(false)}
                className="p-1 rounded-full text-on-surface-variant hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Avatar Selection */}
              <div>
                <label className="block text-xs font-bold text-[#3d3050] dark:text-[#c8bedd] uppercase tracking-wider mb-2">Profile Picture</label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {avatarPresets.map((presetUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setEditAvatar(presetUrl)}
                      className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-all shrink-0 ${
                        editAvatar === presetUrl ? 'border-primary ring-2 ring-primary/40 scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={presetUrl} alt="Preset avatar" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-[#3d3050] dark:text-[#c8bedd] uppercase tracking-wider mb-1">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Enter your name"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-outline-variant dark:border-[#3a2d58] bg-white/80 dark:bg-[#1c1230] text-sm font-semibold text-[#18003d] dark:text-[#eee6ff] outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Age & DOB */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#3d3050] dark:text-[#c8bedd] uppercase tracking-wider mb-1">Age</label>
                  <input
                    type="number"
                    value={editAge || ''}
                    onChange={(e) => setEditAge(parseInt(e.target.value) || 0)}
                    placeholder="Enter age"
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant dark:border-[#3a2d58] bg-white/80 dark:bg-[#1c1230] text-sm font-semibold text-[#18003d] dark:text-[#eee6ff] outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#3d3050] dark:text-[#c8bedd] uppercase tracking-wider mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={editDob}
                    onChange={(e) => setEditDob(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant dark:border-[#3a2d58] bg-white/80 dark:bg-[#1c1230] text-sm font-semibold text-[#18003d] dark:text-[#eee6ff] outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Goals Toggle */}
              <div>
                <label className="block text-xs font-bold text-[#3d3050] dark:text-[#c8bedd] uppercase tracking-wider mb-2">Focus & Goals</label>
                <div className="flex flex-wrap gap-2">
                  {availableGoals.map((g) => {
                    const selected = editGoals.includes(g);
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => handleGoalToggle(g)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                          selected
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : 'bg-white/40 dark:bg-[#1c1230] text-on-surface dark:text-[#c8bedd] border-outline-variant/30 dark:border-[#3a2d58]'
                        }`}
                      >
                        {selected ? '✓ ' : ''}{g}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-outline-variant dark:border-[#3a2d58] text-xs font-bold text-on-surface dark:text-[#c8bedd]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-md hover:bg-primary/90 flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
