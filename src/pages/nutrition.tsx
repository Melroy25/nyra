import React, { useState } from 'react';
import { mockFoodCards } from '../data/nutrition';
import { Search, Apple, ArrowRight, Bookmark, BookmarkCheck, Sparkles, MessageCircle, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function NutritionPage() {
  const [searchVal, setSearchVal] = useState('');
  const [askVal, setAskVal] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [savedFoods, setSavedFoods] = useState<string[]>([]);
  const [selectedFood, setSelectedFood] = useState<typeof mockFoodCards[0] | null>(null);

  // Filter food recommendations based on search
  const filteredFoods = mockFoodCards.filter(
    (food) =>
      food.name.toLowerCase().includes(searchVal.toLowerCase()) ||
      food.benefits.toLowerCase().includes(searchVal.toLowerCase())
  );

  const toggleSaveFood = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (savedFoods.includes(id)) {
      setSavedFoods(savedFoods.filter((f) => f !== id));
    } else {
      setSavedFoods([...savedFoods, id]);
    }
  };

  const handleAskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!askVal.trim()) return;

    setIsAsking(true);
    setAiAnswer(null);

    setTimeout(() => {
      const query = askVal.toLowerCase();
      let answer = "I'm looking into your query. Standard nutrition advice is to prioritize warm, easily digestible foods.";

      if (query.includes('coffee') || query.includes('caffeine')) {
        answer = "☕ Coffee during periods: \nCaffeine constricts blood vessels (vasoconstriction), which can restrict flow in the uterus and lead to sharper cramps. Additionally, caffeine can increase cortisol levels, exacerbating premenstrual mood swings and anxiety. \n\nRecommendation: Limit to 1 cup a day or switch to warm red raspberry leaf tea or ginger tea, which naturally relax uterine muscles.";
      } else if (query.includes('sugar') || query.includes('chocolate') || query.includes('sweet')) {
        answer = "🍫 Sugar Cravings:\nHormonal fluctuations cause a slight dip in blood sugar and serotonin. Refined sugar triggers rapid insulin spikes, causing fatigue and mood crashes shortly after. \n\nRecommendation: Satisfy cravings with 70%+ dark chocolate, magnesium-rich seeds, or fruit paired with protein (like apples and almond butter).";
      } else if (query.includes('alcohol')) {
        answer = "🍷 Alcohol during periods:\nAlcohol dehydrates the body, which can thicken menstrual fluids and lead to heavier cramping. It also depletes magnesium reserves, which are essential for muscle relaxation. \n\nRecommendation: Avoid alcohol during heavy flow days. Opt for mineral-rich mocktails with coconut water and berries.";
      }

      setAiAnswer(answer);
      setIsAsking(false);
    }, 1200);
  };

  return (
    <div className="max-w-[1200px] mx-auto px-container-padding-mobile md:px-container-padding-desktop pt-stack-md pb-12 flex flex-col gap-stack-lg">
      
      {/* Title Header */}
      <section className="animate-entrance">
        <h1 className="font-serif font-bold text-3xl md:text-5xl text-on-background dark:text-[#eee6ff] mb-2">Today's Nutrition</h1>
        <p className="text-sm text-on-surface-variant">Phase-specific recipe recommendations to support hormonal balance.</p>
      </section>

      {/* Hero Recommendation Card */}
      <section className="glass-card rounded-xl overflow-hidden relative group cursor-pointer transition-transform duration-300 hover:scale-[1.005] border border-white/50 dark:border-[#3a2d58]/50 shadow-sm">
        <div className="h-64 md:h-80 w-full relative">
          <img 
            src="https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&q=80&w=1200" 
            alt="Fresh Greens" 
            className="w-full h-full object-cover absolute inset-0 transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent"></div>
          
          <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full text-white">
            <div className="flex gap-2 mb-3">
              <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold border border-white/30">Essential</span>
              <span className="px-3 py-1 bg-tertiary-container/85 backdrop-blur-md rounded-full text-[10px] font-bold text-on-tertiary-container border border-white/20">Iron Rich</span>
            </div>
            <h2 className="font-serif font-bold text-2xl md:text-3xl mb-2">Leafy Greens Focus</h2>
            <p className="text-sm text-white/95 max-w-lg leading-relaxed">
              Incorporate nutrient-dense spinach or kale to support iron intake during your current phase.
            </p>
          </div>
        </div>
      </section>

      {/* Main Grid: Food cards & AI search query widget */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
        
        {/* Left Side: Recipe & food list cards */}
        <div className="md:col-span-8 flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <h3 className="font-serif font-bold text-xl text-on-background dark:text-[#eee6ff]">Phase Recommendations</h3>
            
            {/* Search Input field */}
            <div className="relative w-48 sm:w-64">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-outline-variant" />
              <input 
                type="text" 
                placeholder="Search foods..." 
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs font-semibold rounded-full border border-outline-variant/60 focus:border-primary focus:ring-1 focus:ring-primary/20 bg-white/40 dark:bg-[#1c1230]/60 dark:text-[#eee6ff] dark:placeholder:text-[#c8bedd]/50 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredFoods.map((food) => {
              const isSaved = savedFoods.includes(food.id);
              return (
                <div 
                  key={food.id}
                  onClick={() => setSelectedFood(food)}
                  className="glass-card rounded-xl p-5 flex flex-col justify-between group cursor-pointer hover:shadow-md hover:scale-[1.01] border border-white/40 dark:border-[#3a2d58]/50 shadow-sm transition-all"
                >
                  <div className="mb-4 flex justify-between items-start">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-sm">
                      <img src={food.imageUrl} alt={food.name} className="w-full h-full object-cover" />
                    </div>
                    <button 
                      onClick={(e) => toggleSaveFood(food.id, e)}
                      className="text-on-surface-variant hover:text-primary p-1.5 hover:bg-white/50 rounded-full transition-colors"
                    >
                      {isSaved ? <BookmarkCheck className="w-4 h-4 text-primary" /> : <Bookmark className="w-4 h-4" />}
                    </button>
                  </div>
                  <div>
                    <h4 className="font-serif font-semibold text-lg text-on-background dark:text-[#eee6ff] mb-1">{food.name}</h4>
                    <p className="text-xs text-on-surface-variant mb-4 leading-normal line-clamp-2">{food.description}</p>
                    <div className="flex items-center text-primary font-bold text-xs">
                      <span>View Details</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: AI Food Queries Widget */}
        <div className="md:col-span-4 flex flex-col gap-6">
          <div className="glass-card rounded-xl p-6 border border-white/40 dark:border-[#3a2d58]/50 shadow-sm flex flex-col justify-between h-full min-h-[300px]">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <Sparkles className="w-4 h-4 animate-pulse" />
                <span>Nyra Diet Query</span>
              </div>
              <h3 className="font-serif font-bold text-lg leading-snug dark:text-[#eee6ff]">Is a specific food good right now?</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Enter any food or question (e.g. "Is coffee good during periods?") to query Nyra's hormone-matching database.
              </p>
            </div>

            <form onSubmit={handleAskSubmit} className="mt-6 space-y-3">
              <input 
                type="text" 
                placeholder="e.g. coffee, dark chocolate" 
                value={askVal}
                onChange={(e) => setAskVal(e.target.value)}
                className="w-full px-4 py-3 rounded-full border border-outline-variant/60 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-xs font-semibold bg-white/70 dark:bg-[#1c1230]/60 dark:text-[#eee6ff] dark:placeholder:text-[#c8bedd]/50"
              />
              <button 
                type="submit"
                disabled={isAsking}
                className="w-full py-3 bg-gradient-to-r from-primary to-secondary text-white font-bold text-xs rounded-full shadow-md hover:opacity-95 transition-opacity"
              >
                {isAsking ? 'Querying...' : 'Query Nyra AI'}
              </button>
            </form>
          </div>
        </div>

      </div>

      {/* Query Result Modal overlay */}
      <AnimatePresence>
        {aiAnswer && (
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
              className="bg-white rounded-2xl max-w-md w-full p-6 md:p-8 border border-white shadow-2xl space-y-4 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-primary to-tertiary"></div>
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <Sparkles className="w-4 h-4 animate-pulse" />
                <span>Nyra AI Response</span>
              </div>
              <p className="text-sm text-on-surface font-semibold leading-relaxed whitespace-pre-line">
                {aiAnswer}
              </p>
              <div className="pt-2 text-right">
                <button 
                  onClick={() => {
                    setAiAnswer(null);
                    setAskVal('');
                  }}
                  className="px-6 py-2 bg-primary text-white rounded-full font-bold text-xs hover:opacity-90 transition-opacity"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Details Card Modal overlay */}
      <AnimatePresence>
        {selectedFood && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/35 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl max-w-lg w-full overflow-hidden border border-white shadow-2xl relative"
            >
              <div className="h-48 relative">
                <img src={selectedFood.imageUrl} alt={selectedFood.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <button 
                  onClick={() => setSelectedFood(null)}
                  className="absolute top-4 left-4 p-2 bg-white/30 backdrop-blur-md rounded-full text-white hover:bg-white/50 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="absolute bottom-4 left-4 text-white">
                  <span className="text-[9px] uppercase tracking-wider font-bold bg-primary px-2.5 py-1 rounded-full">{selectedFood.category}</span>
                  <h3 className="font-serif font-bold text-xl md:text-2xl mt-1">{selectedFood.name}</h3>
                </div>
              </div>
              <div className="p-6 md:p-8 space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Key Benefits</h4>
                  <p className="text-sm font-semibold text-primary">{selectedFood.benefits}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Detailed Description</h4>
                  <p className="text-sm text-on-surface-variant leading-relaxed font-semibold">{selectedFood.description}</p>
                </div>
                <div className="pt-2 text-right">
                  <button 
                    onClick={() => setSelectedFood(null)}
                    className="px-6 py-2.5 bg-gradient-to-r from-primary to-secondary text-white rounded-full font-bold text-xs hover:opacity-90 transition-opacity"
                  >
                    Close Recipes
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
