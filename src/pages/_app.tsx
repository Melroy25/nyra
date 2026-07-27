import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Layout from "../components/Layout";
import PwaInstallPrompt from "../components/PwaInstallPrompt";
import { useEffect } from "react";
import { useStore } from "../store/useStore";
import { apiGetProfile, apiGetNotificationSettings, apiGetCycleMetrics } from "../lib/api";
import { sendNativeNotification } from "../lib/pushNotifications";

export default function App({ Component, pageProps }: AppProps) {
  const recalculateCycleMetrics = useStore((state) => state.recalculateCycleMetrics);
  const darkMode = useStore((state) => state.darkMode);
  const setUser = useStore((state) => state.setUser);
  const seedCycleLogs = useStore((state) => state.seedCycleLogs);
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
              name: user.name || '',
              age: user.age || 0,
              dob: user.dateOfBirth || '',
              lastPeriodDate: user.lastPeriodDate || '',
              averageCycleLength: user.cycleLength || 28,
              periodDuration: user.periodDuration || 5,
              goals: user.goals || [],
            });
            // Seed calendar with period/predicted/ovulation days from signup data
            if (user.lastPeriodDate) {
              seedCycleLogs(
                user.lastPeriodDate,
                user.periodDuration || 5,
                user.cycleLength || 28
              );
            }
            // ── Schedule native push notifications based on user settings ──
            scheduleNativeNotifications();
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
  }, [recalculateCycleMetrics, setUser, seedCycleLogs, updateOnboardingData]);

  return (
    <Layout>
      <Component {...pageProps} />
      <PwaInstallPrompt />
    </Layout>
  );
}

// ── Native push notification scheduler ──
async function scheduleNativeNotifications() {
  if (typeof window === 'undefined' || Notification.permission !== 'granted') return;

  try {
    const [{ settings }, metricsData] = await Promise.all([
      apiGetNotificationSettings(),
      apiGetCycleMetrics().catch(() => null),
    ]);

    if (!settings || !metricsData) return;

    const daysLeft = metricsData.nextPeriodDaysLeft;
    const phase = metricsData.currentPhase;

    // Period reminder — fire when 2 days away
    if (settings.period_reminders && daysLeft <= 2 && daysLeft >= 0) {
      sendNativeNotification('Period Starting Soon 🩸', {
        body: `Your period is expected in about ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Prepare your self-care essentials!`,
        tag: 'nyra-period-reminder',
      });
    }

    // Fertile window alert — fire during ovulation phase
    if (settings.fertile_window_alerts && phase === 'Ovulation') {
      sendNativeNotification('Fertile Window 🌸', {
        body: 'You are in your fertile window today. Your energy and confidence are at their peak!',
        tag: 'nyra-ovulation',
      });
    }

    // Daily check-in reminder
    if (settings.daily_checkins) {
      const lastCheckinKey = 'nyra_last_checkin';
      const lastCheckin = localStorage.getItem(lastCheckinKey);
      const todayStr = new Date().toISOString().split('T')[0];
      if (lastCheckin !== todayStr) {
        const hour = new Date().getHours();
        // Only send if morning/midday (8am - 1pm)
        if (hour >= 8 && hour <= 13) {
          sendNativeNotification('Daily Check-In 💜', {
            body: 'How are you feeling today? Log your mood and symptoms in Nyra.',
            tag: 'nyra-checkin',
          });
          localStorage.setItem(lastCheckinKey, todayStr);
        }
      }
    }

    // Water reminder — every hour during waking hours
    if (settings.water_reminders) {
      const hour = new Date().getHours();
      if (hour >= 8 && hour <= 21) {
        sendNativeNotification('Hydration Reminder 💧', {
          body: 'Time to drink some water! Staying hydrated supports your cycle health.',
          tag: 'nyra-water',
        });
      }
    }
  } catch (err) {
    console.log('Notification scheduling error:', err);
  }
}
