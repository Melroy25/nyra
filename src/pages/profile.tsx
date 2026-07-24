import React from 'react';
import { useRouter } from 'next/router';
import { useStore } from '../store/useStore';
import { User, Calendar, Heart, Shield, Settings, CreditCard, Award, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ProfilePage() {
  const router = useRouter();
  const { onboardingData, user } = useStore();

  const name = onboardingData.name || 'Sarah';
  const age = onboardingData.age || 28;
  const dob = onboardingData.dob || '1998-04-12';
  const cycleLength = onboardingData.averageCycleLength || 28;
  const periodDuration = onboardingData.periodDuration || 5;
  const goals = onboardingData.goals || ['Track cycle'];

  // Shared text classes for strong contrast in both modes
  const headingCls = 'text-[#18003d] dark:text-[#eee6ff]';
  const labelCls   = 'text-[#3d3050] dark:text-[#c8bedd]';

  return (
    <div className="max-w-[800px] mx-auto px-container-padding-mobile pt-stack-md pb-12 flex flex-col gap-stack-lg">

      {/* ── Profile Header Card ── */}
      <section className="glass-card rounded-2xl p-6 border border-white/50 dark:border-[#3a2d58]/40 shadow-sm flex flex-col sm:flex-row items-center gap-6 animate-entrance">
        <div className="w-20 h-20 rounded-full bg-surface-container-high overflow-hidden border-2 border-primary/20 shadow-md shrink-0">
          <img
            src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
            alt="Sarah Avatar"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="text-center sm:text-left flex-1 space-y-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h1 className={`font-serif font-bold text-2xl md:text-3xl ${headingCls}`}>{name}</h1>
            <span className="inline-flex items-center gap-1 bg-gradient-to-r from-primary to-secondary text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm">
              <Award className="w-2.5 h-2.5" /> Premium member
            </span>
          </div>
          <p className={`text-xs font-semibold ${labelCls}`}>Age {age} &bull; Born {dob}</p>
        </div>
        <button
          onClick={() => router.push('/settings')}
          className={`p-2.5 bg-white/60 dark:bg-white/5 hover:bg-primary/10 rounded-xl border border-outline-variant/30 dark:border-[#3a2d58]/50 transition-colors ${labelCls} hover:text-primary`}
          title="Account Settings"
        >
          <Settings className="w-5 h-5" />
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
                <span className="font-bold text-tertiary">Connected</span>
              </div>
              <div className="flex justify-between items-center text-xs font-semibold border-b border-black/8 dark:border-[#3a2d58]/60 pb-2">
                <span className={labelCls}>Partner Connection Code</span>
                <span className={`font-bold ${headingCls}`}>NYRA-82941</span>
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

      {/* ── Nyra Pro Subscription ── */}
      <section className="glass-card rounded-2xl p-5 border border-white/40 dark:border-[#3a2d58]/50 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden">
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-gradient-to-tr from-primary/20 to-tertiary/25 rounded-full blur-3xl" />
        <div className="z-10 space-y-1">
          <h3 className={`font-serif font-bold text-lg ${headingCls} flex items-center gap-2`}>
            <CreditCard className="w-5 h-5 text-primary" />
            <span>Nyra Pro Subscription</span>
          </h3>
          <p className={`text-xs font-semibold ${labelCls}`}>Premium features fully unlocked. Next renewal: July 2027.</p>
        </div>
        <button className="z-10 px-5 py-2.5 bg-gradient-to-r from-primary to-secondary text-white rounded-2xl font-bold text-xs shadow-md hover:opacity-95 transition-opacity">
          Manage Billing
        </button>
      </section>

    </div>
  );
}
