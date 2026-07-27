import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Layout from "../components/Layout";
import PwaInstallPrompt from "../components/PwaInstallPrompt";
import { useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { useStore } from "../store/useStore";
import { apiGetProfile, apiGetNotificationSettings, apiGetCycleMetrics, apiGetMessages } from "../lib/api";
import { sendNativeNotification, registerWebPushSubscription } from "../lib/pushNotifications";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const recalculateCycleMetrics = useStore((state) => state.recalculateCycleMetrics);
  const darkMode = useStore((state) => state.darkMode);
  const user = useStore((state) => state.user);
  const setUser = useStore((state) => state.setUser);
  const seedCycleLogs = useStore((state) => state.seedCycleLogs);
  const updateOnboardingData = useStore((state) => state.updateOnboardingData);
  const setUnreadCount = useStore((state) => state.setUnreadCount);

  // ── Sync dark mode class on the <html> element on every change ──
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // ── Restore Logged-in Session & Cache on App Mount ──
  useEffect(() => {
    // Restore cycle logs from localStorage after client hydration
    try {
      const storedLogs = localStorage.getItem('nyra_cycle_logs');
      if (storedLogs) {
        const parsed = JSON.parse(storedLogs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          useStore.getState().setCycleLogs(parsed);
        }
      }
    } catch (e) {}

    recalculateCycleMetrics();

    const token = localStorage.getItem('nyra_token');

    // IMMEDIATELY restore user from cache so UI renders correctly without waiting for API
    if (token) {
      const cachedStr = localStorage.getItem('nyra_cached_user');
      if (cachedStr) {
        try {
          const cachedUser = JSON.parse(cachedStr);
          if (cachedUser) setUser(cachedUser);
        } catch (e) {}
      }
    }

    // Then verify + refresh from server in background
    if (token) {
      apiGetProfile()
        .then(({ user: freshUser }) => {
          if (freshUser) {
            setUser(freshUser);
            updateOnboardingData({
              name: freshUser.name || '',
              age: freshUser.age || 0,
              dob: freshUser.dateOfBirth || '',
              lastPeriodDate: freshUser.lastPeriodDate || '',
              averageCycleLength: freshUser.cycleLength || 28,
              periodDuration: freshUser.periodDuration || 5,
              goals: freshUser.goals || [],
            });
            if (freshUser.lastPeriodDate) {
              seedCycleLogs(
                freshUser.lastPeriodDate,
                freshUser.periodDuration || 5,
                freshUser.cycleLength || 28
              );
            }
            if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
              Notification.requestPermission().catch(() => {});
            }
            scheduleNativeNotifications();
          }
        })
        .catch((err: any) => {
          const status = err?.status || err?.response?.status;
          if (status === 401 || status === 403) {
            localStorage.removeItem('nyra_token');
            localStorage.removeItem('nyra_cached_user');
            setUser(null);
          }
        });
    }

    // Register Service Worker for PWA + hand token for background polling
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(() => {
          // Use .ready so we always get the truly-active SW (not null on first visit)
          return navigator.serviceWorker.ready;
        })
        .then((reg) => {
          const t = localStorage.getItem('nyra_token');
          const uid = (() => {
            try { return JSON.parse(localStorage.getItem('nyra_cached_user') || '{}')?.id; } catch (e) { return null; }
          })();
          // Restore known IDs so SW doesn't re-notify old messages
          const knownIdsArr = (() => {
            try { return JSON.parse(localStorage.getItem('nyra_known_msg_ids') || '[]'); } catch (e) { return []; }
          })();
          if (t && reg.active) {
            reg.active.postMessage({
              type: 'START_BG_POLL',
              token: t,
              userId: uid,
              knownIds: knownIdsArr,
            });
            registerWebPushSubscription().catch(() => {});
          }
        })
        .catch((err) => console.warn('SW registration failed:', err));
    }
  }, [recalculateCycleMetrics, setUser, seedCycleLogs, updateOnboardingData]);

  // ── Global Chat Notification Poller (foreground — when app IS open) ──
  const knownMsgIdsRef = useRef<Set<string>>(new Set());
  const knownMsgIdsSeededRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Seed known IDs from localStorage ONCE on mount so we don't re-notify old messages
    if (!knownMsgIdsSeededRef.current) {
      knownMsgIdsSeededRef.current = true;
      try {
        const stored = localStorage.getItem('nyra_known_msg_ids');
        if (stored) {
          const ids: string[] = JSON.parse(stored);
          ids.forEach((id) => knownMsgIdsRef.current.add(id));
        }
      } catch (e) {}
    }

    const checkIncomingPartnerMessages = async () => {
      const token = localStorage.getItem('nyra_token');
      if (!token) return;

      try {
        // Background poll — no markRead/heartbeat, just check for new messages
        const { messages, partnerInfo } = await apiGetMessages('auto');
        if (!messages || messages.length === 0) {
          useStore.getState().setUnreadCount(0);
          return;
        }

        const currentUserId = user?.id || (() => {
          try { return JSON.parse(localStorage.getItem('nyra_cached_user') || '{}')?.id; } catch (e) { return null; }
        })();

        // Compute unread count for badges across app
        const unreadCount = messages.filter(
          (m: any) => m.sender_id !== currentUserId && !m.is_read
        ).length;
        useStore.getState().setUnreadCount(unreadCount);

        // ONLY skip push notification if user is actively viewing the CHAT tab while window is visible
        const isActivelyChatting =
          router.pathname === '/partner' &&
          router.query.tab === 'chat' &&
          document.visibilityState === 'visible';

        if (isActivelyChatting) return;

        const partnerName = partnerInfo?.name || 'Partner';
        let newIdsAdded = false;

        messages.forEach((msg: any) => {
          const msgSig = `${msg.sender_id}_${msg.text || msg.sticker}_${msg.created_at?.slice(0, 16)}`;
          const isAlreadyNotified = knownMsgIdsRef.current.has(msg.id) || knownMsgIdsRef.current.has(msgSig);
          const isIncoming = msg.sender_id !== currentUserId;

          if (isIncoming && !isAlreadyNotified) {
            const bodyText = msg.text || (msg.sticker ? `Sent a sticker 😊` : 'Sent an attachment 📎');
            sendNativeNotification(`${partnerName} ❤️`, {
              body: bodyText,
              icon: partnerInfo?.avatar_url || '/logo.png',
              tag: `chat-${msg.id}`,
            });
          }
          if (!isAlreadyNotified) {
            knownMsgIdsRef.current.add(msg.id);
            knownMsgIdsRef.current.add(msgSig);
            newIdsAdded = true;
          }
        });

        // Persist known IDs to localStorage (keep last 300) to survive page reloads
        if (newIdsAdded) {
          try {
            const arr = Array.from(knownMsgIdsRef.current).slice(-200);
            localStorage.setItem('nyra_known_msg_ids', JSON.stringify(arr));
          } catch (e) {}
        }
      } catch (err) {}
    };

    checkIncomingPartnerMessages();
    const interval = setInterval(checkIncomingPartnerMessages, 5000);
    return () => clearInterval(interval);
  }, [user?.id, router.pathname, router.query.tab]);

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
