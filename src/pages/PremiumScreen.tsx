import React, { useState } from 'react';
import { useNyraStore } from '../store/useNyraStore';
import { Crown, Check, ShieldCheck, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const PremiumScreen: React.FC = () => {
  const { updateProfile, setView } = useNyraStore();
  const [success, setSuccess] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');

  const handleSubscribe = () => {
    updateProfile({ isPremium: true });
    setSuccess(true);
  };

  const premiumFeatures = [
    { title: 'Generative AI Wellness Coach', desc: 'Ask complex wellness questions and get deep hormonal predictions.' },
    { title: 'Doctor PDF Report Export', desc: 'Compile your 6-month cycle logs, symptoms, and trends into an exportable medical report.' },
    { title: 'Advanced Predictions', desc: 'Predict symptoms, mood changes, and cycle dates up to 6 cycles in advance.' },
    { title: 'Unlimited History', desc: 'Never lose your historical logs. Compare year-over-year statistics.' },
    { title: 'Personalized Nutrition Coach', desc: 'Receive custom recipes and meal planning matched to your progesterone status.' }
  ];

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-gradient-to-b from-slate-900 to-indigo-950 text-white h-full overflow-y-auto">
      
      {/* Success Animation Modal */}
      <AnimatePresence>
        {success && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center text-white"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
              className="w-20 h-20 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 flex items-center justify-center mb-5 shadow-lg shadow-amber-400/20"
            >
              <Crown className="w-10 h-10 fill-current" />
            </motion.div>
            
            <motion.h3 
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="font-serif text-2xl font-extrabold"
            >
              Welcome to Nyra Pro!
            </motion.h3>
            
            <motion.p 
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.45 }}
              className="text-xs text-slate-400 mt-2 max-w-xs"
            >
              Your subscription is active. You now have unlimited access to symptom intelligence, custom meal logs, and doctor reports.
            </motion.p>

            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              onClick={() => {
                setSuccess(false);
                setView('dashboard');
              }}
              className="mt-8 px-8 py-3 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold rounded-2xl text-xs shadow-md shadow-amber-400/25 cursor-pointer"
            >
              Go to Dashboard
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
        <button 
          onClick={() => setView('dashboard')}
          className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="font-serif text-sm font-bold tracking-tight">Nyra Premium</span>
        <div className="w-8 h-8 opacity-0"></div> {/* spacer */}
      </div>

      {/* Headline */}
      <div className="text-center py-2 space-y-2">
        <div className="inline-flex w-12 h-12 rounded-2xl bg-amber-400 text-slate-900 items-center justify-center shadow-lg shadow-amber-400/10 mb-1">
          <Crown className="w-6 h-6 fill-current" />
        </div>
        <h2 className="text-2xl font-extrabold font-serif bg-gradient-to-r from-amber-200 via-amber-400 to-amber-300 bg-clip-text text-transparent leading-tight">
          Elevate Your Wellness
        </h2>
        <p className="text-xs text-slate-400 max-w-xs mx-auto">
          Unlock personalized AI insights, diagnostic reports, and bio-individual nutrition planning.
        </p>
      </div>

      {/* Plan select tabs */}
      <div className="grid grid-cols-2 gap-3 p-1 bg-white/5 border border-white/10 rounded-2xl my-4">
        <button
          onClick={() => setSelectedPlan('monthly')}
          className={`py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            selectedPlan === 'monthly'
              ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          Monthly ($9.99/mo)
        </button>
        <button
          onClick={() => setSelectedPlan('yearly')}
          className={`py-3 rounded-xl text-xs font-bold transition-all relative cursor-pointer ${
            selectedPlan === 'yearly'
              ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          Yearly ($59.99/yr)
          <span className="absolute -top-2 -right-1 bg-accent text-[8px] font-extrabold text-white px-2 py-0.5 rounded-full border border-slate-900 shadow-sm">
            Save 50%
          </span>
        </button>
      </div>

      {/* Benefits List */}
      <div className="space-y-3 my-4">
        {premiumFeatures.map((feat, idx) => (
          <div key={idx} className="flex gap-3 items-start bg-white/5 border border-white/10 p-3 rounded-2xl">
            <div className="w-5 h-5 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-3 h-3 stroke-[3]" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-200">{feat.title}</h4>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{feat.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Purchase CTA */}
      <div className="space-y-3 mt-auto pt-4 border-t border-white/10">
        <button
          onClick={handleSubscribe}
          className="w-full py-4 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-extrabold rounded-2xl text-xs hover:brightness-105 transition-all shadow-lg shadow-amber-400/20 cursor-pointer"
        >
          {selectedPlan === 'yearly' ? 'Start 7-Day Free Trial' : 'Subscribe Now'}
        </button>
        <div className="flex justify-center items-center gap-1.5 text-[9px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Secure checkout. Cancel anytime in App Store.</span>
        </div>
      </div>

    </div>
  );
};
