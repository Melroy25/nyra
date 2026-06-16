import React, { useState } from 'react';
import { useNyraStore } from '../store/useNyraStore';
import { getCyclePhaseInfo } from '../utils/cycleHelpers';
import { formatDate } from '../data/mockData';
import { Apple, GlassWater, Sparkles, Check, X, Minus, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const NutritionScreen: React.FC = () => {
  const { profile, logs, cycles, addWaterCup, removeWaterCup, setView, addChatMessage, updateProfile } = useNyraStore();
  const [activeCravingTab, setActiveCravingTab] = useState<'chocolate' | 'sugar' | 'salty' | 'spicy' | 'carbs' | 'cold' | 'hot' | 'sour' | 'savory' | 'bitter'>('chocolate');
  const [editingGoal, setEditingGoal] = useState(false);

  const todayStr = formatDate(new Date());
  const todayLog = logs.find(l => l.date === todayStr);
  const hydration = todayLog?.hydration || 0;
  const hydrationGoal = profile.hydrationGoal || 8;

  const handleAskAI = () => {
    const cravingText = activeCravingTab === 'chocolate' 
      ? 'chocolate' 
      : activeCravingTab === 'sugar' 
      ? 'sugar' 
      : activeCravingTab === 'salty' 
      ? 'salty foods' 
      : activeCravingTab === 'spicy' 
      ? 'spicy foods' 
      : activeCravingTab === 'carbs'
      ? 'carbs'
      : activeCravingTab === 'cold'
      ? 'cold foods'
      : activeCravingTab === 'hot'
      ? 'hot foods'
      : activeCravingTab === 'sour'
      ? 'sour foods'
      : activeCravingTab === 'savory'
      ? 'savory foods'
      : 'bitter foods';
      
    addChatMessage('user', `I'm feeling like to eat ${cravingText} today. Can you explain this craving and suggest alternatives?`);
    setView('chat');
  };

  const cycleInfo = getCyclePhaseInfo(
    todayStr,
    cycles,
    profile.avgCycleLength,
    profile.avgPeriodLength
  );

  // Cycle phase-based food advice
  const getNutritionAdvice = () => {
    switch (cycleInfo.phaseName) {
      case 'Menstrual':
        return {
          focus: ['Iron-rich foods (beef, spinach, lentils)', 'Warm foods (stews, soups)', 'Vitamin C (oranges) to aid iron absorption', 'Ginger tea for cramps'],
          avoid: ['Excessive caffeine (constricts blood vessels)', 'Ice cold drinks', 'Salty processed food (increases bloat)', 'Alcohol'],
          why: 'Your hormones are at their lowest. Focus on warm, mineral-dense foods that replenish blood loss and relax the uterus.'
        };
      case 'Follicular':
        return {
          focus: ['Sprouted foods (mung beans, alfalfa)', 'Fermented foods (kimchi, sauerkraut)', 'Light proteins (chicken, white fish)', 'Fresh veggies (broccoli, zucchini)'],
          avoid: ['Heavy red meats', 'Rich sauces', 'Refined sugars', 'Processed carbohydrates'],
          why: 'Estrogen is rising, which accelerates metabolism and energy. Support your body with light, fresh, estrogen-metabolizing cruciferous foods.'
        };
      case 'Ovulatory':
        return {
          focus: ['Raw foods & salads', 'Berries (high in antioxidants)', 'Fiber-rich foods (quinoa, chia seeds)', 'Hydrating fruits (watermelon, cucumber)'],
          avoid: ['Heavy, slow-digesting foods', 'Deep-fried dishes', 'Excess dairy', 'Refined flour'],
          why: 'Estrogen peaks, making liver function critical for clearing hormone excess. Eat antioxidants and raw fiber to assist your liver.'
        };
      case 'Luteal':
        return {
          focus: ['Magnesium foods (dark chocolate, pumpkin seeds)', 'Slow carbs (sweet potato, brown rice)', 'Root vegetables (carrots, beets)', 'B-vitamin foods (eggs, bananas)'],
          avoid: ['High-glycemic snacks (spikes insulin/PMS mood swings)', 'Salty snacks', 'Excess coffee (worsens breast pain)', 'Sugar-free sweeteners'],
          why: 'Progesterone is peaking, slowing digestion and causing cravings. Eat complex, slow-burning carbs to stabilize blood sugar and prevent mood swings.'
        };
    }
  };

  const nutrition = getNutritionAdvice();

  // Craving Assistant details
  const cravingDetails = {
    chocolate: {
      title: 'Craving Chocolate 🍫',
      hormone: 'Progesterone Peaks, Estrogen Drops',
      deficiency: 'Magnesium & Healthy Fats',
      why: 'Progesterone drops right before your period, lowering dopamine and serotonin. Chocolate triggers endorphin release, and cocoa is rich in magnesium which relaxes spasming muscles (cramps).',
      alternatives: '75%+ Dark Chocolate, Almonds, Pumpkin Seeds, Cocoa-Dusted Bananas.'
    },
    sugar: {
      title: 'Craving Sugar 🍭',
      hormone: 'Blood Sugar Fluctuations / Insulin Sensitivity',
      deficiency: 'Chromium, Carbon & Phosphorus',
      why: 'Progesterone shifts can make your body less sensitive to insulin, leading to rapid blood sugar crashes. Your brain triggers sugar cravings for fast energy.',
      alternatives: 'Berries with Greek Yogurt, Apples with Cinnamon, Dates stuffed with Peanut Butter, Herbal Peach Tea.'
    },
    salty: {
      title: 'Craving Salty 🥨',
      hormone: 'Adrenal Stress / Aldosterone Fluctuations',
      deficiency: 'Chloride, Sodium & Minerals',
      why: 'Water retention changes and high stress (cortisol) can deplete sodium levels. Your body seeks salt to maintain blood volume and mineral balances.',
      alternatives: 'Salted Pumpkin Seeds, Celery with Hummus, Baked Sweet Potato Fries, Seaweed Snacks.'
    },
    spicy: {
      title: 'Craving Spicy 🌶',
      hormone: 'Body Temperature Shifts / Serotonin Needs',
      deficiency: 'Capsaicin stimulation',
      why: 'Spicy food triggers a minor sweat response which helps regulate luteal phase hot flashes, and stimulates endorphins/dopamine release to counter PMS fatigue.',
      alternatives: 'Spicy Avocado Toast, Salsa with baked chips, Roasted Chickpeas with cayenne, Ginger-Chili tea.'
    },
    carbs: {
      title: 'Craving Carbs 🥖',
      hormone: 'Serotonin Drop / High Caloric Needs',
      deficiency: 'Nitrogen & Essential Amino Acids',
      why: 'Your basal metabolic rate increases by 100-300 calories during the Luteal phase. Your body is physically burning more energy, prompting carb-heavy triggers to raise serotonin.',
      alternatives: 'Quinoa bowl, Oatmeal with walnuts, Baked Sweet Potatoes, Whole-wheat crackers with hummus.'
    },
    cold: {
      title: 'Craving Cold 🍧',
      hormone: 'Body Heat Regulation / Hydration Signals',
      deficiency: 'Iron & Hydration Deficit',
      why: 'Estrogen fluctuations in Luteal or Menstrual phase raise core body temperature and prompt cravings for cold foods. Seeking ice or extremely cold food can also be linked to mild iron levels depletion.',
      alternatives: 'Frozen Berries, Iced Chamomile Tea, Fruit Sorbets, Cold Cucumber Mint Water.'
    },
    hot: {
      title: 'Craving Hot 🍵',
      hormone: 'Low Core Temperature / Digestion Support',
      deficiency: 'Comfort & Warmth Regulation',
      why: 'Low hormonal levels during the Menstrual phase slow metabolism and decrease core body heat, leading your body to seek warm liquids and comfort food to relax the GI tract.',
      alternatives: 'Ginger Tea, Warm Bone Broth, Miso Soup, Roasted Vegetable Broths.'
    },
    sour: {
      title: 'Craving Sour 🍋',
      hormone: 'Liver Support / Low Estrogen Shifts',
      deficiency: 'Vitamin C & Gastric Acid Needs',
      why: 'Sour cravings are linked to your liver working to metabolize and filter hormones. Your stomach also seeks sour tastes to stimulate gastric acid production for better digestion.',
      alternatives: 'Lemon Water, Grapefruit slices, Pickled Cucumbers, Green Apple wedges.'
    },
    savory: {
      title: 'Craving Savory 🍳',
      hormone: 'Amino Acid Need / High Muscle Activity',
      deficiency: 'Protein & Essential Amino Acids',
      why: 'Your muscles need repairing blocks during hormonal rebuilds, prompting cravings for savory, high-protein umami profiles.',
      alternatives: 'Hard-boiled Eggs, Roasted Chickpeas, Edamame, Air-popped Popcorn with Nutritional Yeast.'
    },
    bitter: {
      title: 'Craving Bitter 🥬',
      hormone: 'Bile Regulation / Digestion sluggishness',
      deficiency: 'Bitters Compounds & Mineral Needs',
      why: 'Sluggish digestion during progesterone peaks causes you to seek bitter compounds to stimulate bile secretion, aiding in bloating relief.',
      alternatives: 'Arugula Salad, Baked Kale Chips, 85%+ Dark Chocolate, Dandelion Tea.'
    }
  };

  const selectedCraving = cravingDetails[activeCravingTab];

  return (
    <div className="flex-1 p-5 pt-[68px] space-y-5 pb-24">
      
      {/* Page Title */}
      <div>
        <h2 className="text-xl font-bold font-serif text-textpurple">Nutrition & Cravings</h2>
        <p className="text-xs text-slate-400 mt-0.5">Cycle-based dietary guidance & craving decoder</p>
      </div>

      {/* Hydration Tracker Card */}
      <div className="p-5 rounded-3xl bg-white border border-purple-100/50 shadow-sm flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Hydration Target</span>
            <button
              onClick={() => setEditingGoal(!editingGoal)}
              className="w-5 h-5 rounded-md bg-purple-50 hover:bg-purple-100 dark:bg-white/10 dark:hover:bg-white/20 text-slate-400 flex items-center justify-center transition-colors cursor-pointer"
              title="Edit Goal"
            >
              <Pencil className="w-2.5 h-2.5" />
            </button>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-textpurple">{hydration}</span>
            <span className="text-xs text-slate-400">/ {hydrationGoal} cups today</span>
          </div>

          {/* Editable Goal Row */}
          <AnimatePresence>
            {editingGoal && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 overflow-hidden"
              >
                <span className="text-[10px] text-slate-400 font-semibold">Goal:</span>
                <button
                  onClick={() => updateProfile({ hydrationGoal: Math.max(1, hydrationGoal - 1) })}
                  className="w-6 h-6 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-white/10 dark:hover:bg-white/20 text-slate-500 flex items-center justify-center cursor-pointer text-xs font-bold"
                >
                  −
                </button>
                <span className="text-sm font-bold text-textpurple w-6 text-center">{hydrationGoal}</span>
                <button
                  onClick={() => updateProfile({ hydrationGoal: Math.min(20, hydrationGoal + 1) })}
                  className="w-6 h-6 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-white/10 dark:hover:bg-white/20 text-slate-500 flex items-center justify-center cursor-pointer text-xs font-bold"
                >
                  +
                </button>
                <span className="text-[10px] text-slate-400">cups/day</span>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="flex gap-2">
            <button 
              onClick={() => removeWaterCup(todayStr)}
              className="flex items-center justify-center w-8 h-8 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-white/10 dark:hover:bg-white/20 text-slate-500 dark:text-slate-300 transition-colors cursor-pointer"
              title="Remove Cup"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button 
              onClick={() => addWaterCup(todayStr)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary/95 transition-colors shadow-sm cursor-pointer"
            >
              <GlassWater className="w-3.5 h-3.5" /> Log Cup
            </button>
          </div>
        </div>

        {/* Visual Water Cup representation */}
        <div className="relative w-20 h-24 bg-purple-50/50 border-x-[3px] border-b-[3px] border-primary/20 rounded-b-xl flex items-end overflow-hidden shadow-inner shrink-0">
          {/* Water Fill animation */}
          <motion.div 
            initial={{ height: 0 }}
            animate={{ height: `${Math.min(100, (hydration / hydrationGoal) * 100)}%` }}
            transition={{ type: 'spring', stiffness: 100, damping: 15 }}
            className="w-full bg-gradient-to-t from-primary/80 to-secondary/50 flex items-center justify-center text-[10px] text-white font-bold"
            style={{ minHeight: hydration > 0 ? '8px' : '0' }}
          >
            {hydration > 0 && `${Math.round((hydration / hydrationGoal) * 100)}%`}
          </motion.div>
        </div>
      </div>

      {/* Recommended Meals Panel */}
      <div className="p-5 rounded-3xl bg-white border border-purple-100/50 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-purple-50">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center">
            <Apple className="w-4.5 h-4.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-textpurple">Hormonal Diet Guidance</h4>
            <p className="text-[9px] text-slate-400">Phase: {cycleInfo.phaseName} (Day {cycleInfo.cycleDay})</p>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 italic leading-relaxed bg-purple-50/50 p-3 rounded-2xl border border-purple-100/20">
          "{nutrition.why}"
        </p>

        <div className="grid grid-cols-2 gap-4 pt-1">
          {/* Focus foods */}
          <div className="space-y-2">
            <h5 className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
              <Check className="w-3.5 h-3.5 stroke-[3]" /> Focus Foods
            </h5>
            <ul className="space-y-1.5">
              {nutrition.focus.map((item, idx) => (
                <li key={idx} className="text-[10px] text-slate-500 flex items-start gap-1">
                  <span className="text-emerald-500 font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Avoid foods */}
          <div className="space-y-2">
            <h5 className="text-[11px] font-bold text-rose-500 flex items-center gap-1">
              <X className="w-3.5 h-3.5 stroke-[3]" /> Minimize
            </h5>
            <ul className="space-y-1.5">
              {nutrition.avoid.map((item, idx) => (
                <li key={idx} className="text-[10px] text-slate-500 flex items-start gap-1">
                  <span className="text-rose-400 font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Craving Assistant decoder */}
      <div className="p-5 rounded-3xl bg-white border border-purple-100/50 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-purple-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-pink-50 text-pink-500 flex items-center justify-center">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-textpurple">Craving Assistant Decoder</h4>
              <p className="text-[9px] text-slate-400">Decode hormonal signals & find alternatives</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleAskAI}
              className="px-2.5 py-1.5 bg-gradient-to-r from-primary to-accent hover:from-primary/95 hover:to-accent/95 text-white rounded-xl text-[10px] font-bold shadow-xs flex items-center gap-1 transition-all cursor-pointer"
            >
              <Sparkles className="w-3 h-3 fill-white/10" />
              Ask AI
            </button>
          </div>
        </div>

        {/* Craving Tabs selection - Scrollable Container */}
        <div className="flex gap-4 border-b border-purple-50 dark:border-white/5 pb-2 overflow-x-auto scrollbar-none snap-x">
          {(['chocolate', 'sugar', 'salty', 'spicy', 'carbs', 'cold', 'hot', 'sour', 'savory', 'bitter'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveCravingTab(tab)}
              className={`text-[10px] font-bold pb-1.5 px-1 capitalize transition-all cursor-pointer shrink-0 snap-start ${
                activeCravingTab === tab 
                  ? 'text-accent border-b-2 border-accent font-extrabold' 
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              {tab === 'chocolate' ? '🍫 Choc' 
               : tab === 'sugar' ? '🍭 Sug' 
               : tab === 'salty' ? '🥨 Salt' 
               : tab === 'spicy' ? '🌶 Spice' 
               : tab === 'carbs' ? '🥖 Carb'
               : tab === 'cold' ? '🍧 Cold'
               : tab === 'hot' ? '🍵 Hot'
               : tab === 'sour' ? '🍋 Sour'
               : tab === 'savory' ? '🍳 Savory'
               : '🥬 Bitter'}
            </button>
          ))}
        </div>

        {/* Decode Description display */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCravingTab}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.15 }}
            className="space-y-3 pt-1 text-xs"
          >
            <h4 className="font-bold text-textpurple flex justify-between items-center">
              <span>{selectedCraving.title}</span>
              <span className="text-[9px] bg-purple-50 text-primary font-bold px-2 py-0.5 rounded-full border border-purple-100">
                {selectedCraving.hormone}
              </span>
            </h4>

            <div>
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 block">Biological Deficit</span>
              <p className="font-semibold text-textpurple text-[11px] mt-0.5">{selectedCraving.deficiency}</p>
            </div>

            <div>
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 block">Why it happens</span>
              <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed">{selectedCraving.why}</p>
            </div>

            <div className="p-3 bg-pink-50/30 rounded-2xl border border-pink-100/30">
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-accent block">Healthy Alternatives</span>
              <p className="font-bold text-textpurple text-[11px] mt-1">{selectedCraving.alternatives}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  );
};
