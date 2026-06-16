import React, { useState, useEffect, useRef } from 'react';
import { useNyraStore } from '../store/useNyraStore';
import { Home, BarChart2, Sparkles, Salad, User, Bell, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDate } from '../data/mockData';
import logoImg from '../assets/logo.png';

interface MobileContainerProps {
  children: React.ReactNode;
}

export const MobileContainer: React.FC<MobileContainerProps> = ({ children }) => {
  const { view, setView, notifications, logs, darkMode, toggleDarkMode, medications, profile } = useNyraStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const [activeNotifications, setActiveNotifications] = useState<{ id: any; title: string; desc: string }[]>([]);
  const [dismissedIds, setDismissedIds] = useState<any[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
  };

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  const navItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'analytics', label: 'Insights', icon: BarChart2 },
    { id: 'chat', label: 'AI', icon: Sparkles },
    { id: 'nutrition', label: 'Nutrition', icon: Salad },
    { id: 'profile', label: 'Profile', icon: User },
  ] as const;

  const handleNavClick = (tabId: typeof navItems[number]['id']) => {
    setView(tabId);
  };

  const isLandingOrOnboarding = view === 'landing' || view === 'onboarding';

  const formatTime12h = (time24h: string): string => {
    if (!time24h) return '8:00 PM';
    const [hoursStr, minutesStr] = time24h.split(':');
    const hours = parseInt(hoursStr, 10);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;
    return `${displayHours}:${minutesStr} ${ampm}`;
  };

  const todayStr = formatDate(new Date());
  const todayLog = logs.find(l => l.date === todayStr);
  const hasLoggedToday = todayLog && (
    todayLog.flow !== 'None' || 
    todayLog.symptoms.length > 0 || 
    (todayLog.notes !== '' && todayLog.notes !== 'Logged water intake.')
  );

  useEffect(() => {
    const initialList = [];
    if (notifications.periodReminders && !dismissedIds.includes(1)) {
      initialList.push({ id: 1, title: 'Period starts in 3 days', desc: 'Flow is predicted to start soon.' });
    }
    if (notifications.ovulationReminders && !dismissedIds.includes(2)) {
      initialList.push({ id: 2, title: 'Peak Fertility Window', desc: 'Ovulation is predicted tomorrow.' });
    }
    if (notifications.dailyCheckIn && !dismissedIds.includes(3)) {
      initialList.push({ 
        id: 3, 
        title: hasLoggedToday ? 'Daily Log completed ✅' : 'Daily Log reminder', 
        desc: hasLoggedToday 
          ? 'Thank you for logging your health details today!' 
          : `Don't forget to track your symptoms today. Scheduled for ${formatTime12h(notifications.dailyCheckInTime)}.`
      });
    }
    if (notifications.waterReminders && !dismissedIds.includes(4)) {
      initialList.push({ id: 4, title: 'Hydration Target', desc: `You have logged ${todayLog?.hydration || 0}/${profile.hydrationGoal || 8} cups today.` });
    }

    if (notifications.medicationReminders) {
      medications.forEach((med) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const start = new Date(med.startDate);
        start.setHours(0, 0, 0, 0);
        const elapsedDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const remaining = med.durationDays - elapsedDays;
        
        if (remaining > 0 && !dismissedIds.includes(`med-rem-${med.id}`)) {
          initialList.push({
            id: `med-rem-${med.id}`,
            title: `Take ${med.name} 💊`,
            desc: `${remaining}d left course • Schedule: ${med.times.map(t => formatTime12h(t)).join(', ')}`
          });
        }
      });
    }
    
    setActiveNotifications(initialList);
  }, [logs, notifications, dismissedIds, medications]);

  const handleDismiss = (id: any) => {
    setDismissedIds(prev => [...prev, id]);
    showToast("Notification cleared!");
  };

  const handleClearAll = () => {
    setDismissedIds(prev => [...prev, ...activeNotifications.map(n => n.id)]);
    showToast("All notifications cleared!");
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-0 md:p-6 font-sans">
      {/* Background Decorative Blobs for Desktop */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none hidden md:block"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl pointer-events-none hidden md:block"></div>

      {/* Main Mobile Frame Container */}
      <div className={`relative w-full md:w-[420px] h-screen md:h-[860px] bg-bgsoft md:rounded-[40px] md:shadow-[0_25px_60px_-15px_rgba(46,16,101,0.35)] border-0 md:border-[10px] border-slate-950 overflow-hidden flex flex-col ${darkMode ? 'dark' : ''}`}>
        {/* Device Notch / Speaker (Desktop Only) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-6 bg-slate-950 rounded-b-2xl z-50 hidden md:flex items-center justify-center">
          <div className="w-12 h-1 bg-slate-800 rounded-full mb-1"></div>
          <div className="w-2.5 h-2.5 bg-slate-900 rounded-full ml-3 mb-1 border border-slate-800"></div>
        </div>

        {/* Top Header Bar (Hidden for Landing/Onboarding) */}
        {!isLandingOrOnboarding && (
          <header className="absolute top-0 left-0 right-0 z-40 px-5 pb-2.5 flex items-center justify-between" style={{ backgroundColor: 'transparent', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', paddingTop: 'max(env(safe-area-inset-top, 20px), 20px)' }}>
            <div className="flex items-center cursor-pointer" onClick={() => setView('dashboard')}>
              <div className="w-8 h-8 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-white flex items-center justify-center border border-purple-200/40 dark:border-purple-300/30">
                <img src={logoImg} alt="Nyra Logo" className="w-full h-full object-cover" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Theme Toggle Button */}
              <button 
                onClick={toggleDarkMode}
                className="w-7 h-7 rounded-full bg-purple-50/50 dark:bg-white/5 flex items-center justify-center text-textpurple dark:text-purple-200 hover:bg-purple-100/80 dark:hover:bg-white/10 transition-colors cursor-pointer"
                title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> : <Moon className="w-3.5 h-3.5" />}
              </button>
              
              {/* Notification Button */}
              <div className="relative" ref={notificationRef}>
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="w-7 h-7 rounded-full bg-purple-50/50 dark:bg-white/5 flex items-center justify-center text-textpurple dark:text-purple-200 hover:bg-purple-100/80 dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <Bell className="w-3.5 h-3.5" />
                  {activeNotifications.length > 0 && (
                    <span className="absolute top-0 right-0 w-2 h-2 bg-accent rounded-full border border-white glow-pink"></span>
                  )}
                </button>

                {/* Notifications Dropdown Panel */}
                <AnimatePresence>
                  {showNotifications && (
                    <>
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-72 bg-white/95 backdrop-blur-lg rounded-2xl shadow-xl border border-purple-100 p-4 z-50 text-textpurple"
                      >
                        <div className="flex justify-between items-center border-b border-purple-50 pb-2 mb-3">
                          <h4 className="font-semibold text-sm flex items-center gap-1.5">
                            <Bell className="w-4 h-4 text-primary" /> Daily Notifications
                          </h4>
                          {activeNotifications.length > 0 && (
                            <button 
                              onClick={handleClearAll}
                              className="text-[10px] font-bold text-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
                            >
                              Clear All
                            </button>
                          )}
                        </div>
                        <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                          {activeNotifications.length > 0 ? (
                            activeNotifications.map(rem => (
                              <div key={rem.id} className="p-2.5 rounded-xl bg-purple-50/50 hover:bg-purple-50 border border-purple-100/50 transition-colors flex justify-between items-start gap-2">
                                <div className="flex-1">
                                  <p className="font-semibold text-xs text-textpurple">{rem.title}</p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">{rem.desc}</p>
                                </div>
                                <button
                                  onClick={() => handleDismiss(rem.id)}
                                  className="w-5 h-5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0 cursor-pointer mt-0.5"
                                  title="Dismiss"
                                >
                                  ✓
                                </button>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-slate-400 text-center py-4">No active reminders.</p>
                          )}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </header>
        )}

        {/* Success Toast */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: -20, x: '-50%' }}
              style={{ left: '50%' }}
              className="absolute top-12 w-[85%] p-3 bg-emerald-500 text-white rounded-xl shadow-lg flex items-center justify-between z-50 text-[11px] font-semibold"
            >
              <span>{toastMessage}</span>
              <button onClick={() => setToastMessage(null)} className="text-white hover:opacity-85 font-bold px-1.5 cursor-pointer">✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content Area */}
        <main className={`flex-1 relative flex flex-col bg-bgsoft ${view === 'chat' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          {children}
        </main>

        {/* Bottom Navigation Bar (Hidden for Landing/Onboarding) */}
        {!isLandingOrOnboarding && (
          <nav className="sticky bottom-0 z-40 bg-transparent backdrop-blur-2xl border-t border-white/10 dark:border-white/5 px-4 py-2 pb-6 md:pb-3 flex justify-around items-center" style={{ backgroundColor: 'transparent', backdropFilter: 'blur(28px) saturate(180%)', WebkitBackdropFilter: 'blur(28px) saturate(180%)' }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = view === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className="flex flex-col items-center py-1.5 px-3 relative cursor-pointer"
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNavIndicator"
                      className="absolute inset-0 bg-primary/10 rounded-xl"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-primary' : 'text-slate-400'}`} />
                  <span className={`text-[10px] mt-1 font-medium transition-colors ${isActive ? 'text-primary font-bold' : 'text-slate-500'}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        )}

      </div>
    </div>
  );
};
