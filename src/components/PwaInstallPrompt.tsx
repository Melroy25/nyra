import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // Check if already in standalone/installed mode
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setIsIos(true);
      // Show prompt once for iOS if not dismissed
      const dismissed = localStorage.getItem('nyra_pwa_dismissed');
      if (!dismissed) {
        setShowPrompt(true);
      }
    }

    // Listen for beforeinstallprompt on Chrome/Android/Desktop
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissed = localStorage.getItem('nyra_pwa_dismissed');
      if (!dismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('nyra_pwa_dismissed', 'true');
  };

  if (isInstalled || !showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:max-w-md z-50 glass-card bg-white/95 dark:bg-[#16102a]/95 border border-primary/30 dark:border-[#3a2d58]/80 shadow-2xl rounded-2xl p-4 flex items-center justify-between gap-4 backdrop-blur-2xl"
      >
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Nyra App Logo"
            className="w-12 h-12 rounded-2xl object-cover border-2 border-primary/20 shadow-sm shrink-0"
          />
          <div className="space-y-0.5">
            <h4 className="font-serif font-bold text-sm text-[#18003d] dark:text-[#eee6ff]">
              Install Nyra App 📱
            </h4>
            <p className="text-[11px] text-[#3d3050] dark:text-[#c8bedd] font-medium leading-tight">
              {isIos
                ? 'Tap Share ⎋ and choose "Add to Home Screen"'
                : 'Install for 1-tap offline access & smooth performance.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isIos && deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-xs shadow-md shadow-primary/20 hover:opacity-95 transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Install
            </button>
          )}

          <button
            onClick={handleDismiss}
            className="p-1.5 text-[#3d3050] dark:text-[#c8bedd] hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
