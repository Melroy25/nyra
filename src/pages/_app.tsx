import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Layout from "../components/Layout";
import PwaInstallPrompt from "../components/PwaInstallPrompt";
import { useEffect } from "react";
import { useStore } from "../store/useStore";
import { apiGetProfile } from "../lib/api";

export default function App({ Component, pageProps }: AppProps) {
  const recalculateCycleMetrics = useStore((state) => state.recalculateCycleMetrics);
  const darkMode = useStore((state) => state.darkMode);
  const setUser = useStore((state) => state.setUser);
  const updateOnboardingData = useStore((state) => state.updateOnboardingData);

  // ── Sync dark mode class on the <html> element on every change ──
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // ── Restore Logged-in Session from JWT Token on App Mount ──
  useEffect(() => {
    recalculateCycleMetrics();

    // Auto-restore session from token
    const token = typeof window !== 'undefined' ? localStorage.getItem('nyra_token') : null;
    if (token) {
      apiGetProfile()
        .then(({ user }) => {
          if (user) {
            setUser(user);
            updateOnboardingData({
              name: user.name,
              age: user.age || 28,
              dob: user.dateOfBirth || '1998-04-12',
              averageCycleLength: user.cycleLength || 28,
              periodDuration: user.periodDuration || 5,
              goals: user.goals || [],
            });
          }
        })
        .catch(() => {
          // Token expired or invalid
          localStorage.removeItem('nyra_token');
          setUser(null);
        });
    }

    // Register Service Worker for PWA
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('Nyra PWA Service Worker Registered:', reg.scope))
        .catch((err) => console.log('Service Worker Registration Failed:', err));
    }
  }, [recalculateCycleMetrics, setUser, updateOnboardingData]);

  return (
    <Layout>
      <Component {...pageProps} />
      <PwaInstallPrompt />
    </Layout>
  );
}
