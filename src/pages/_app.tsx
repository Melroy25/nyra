import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Layout from "../components/Layout";
import PwaInstallPrompt from "../components/PwaInstallPrompt";
import { useEffect } from "react";
import { useStore } from "../store/useStore";

export default function App({ Component, pageProps }: AppProps) {
  const recalculateCycleMetrics = useStore((state) => state.recalculateCycleMetrics);
  const darkMode = useStore((state) => state.darkMode);

  // ── Sync dark mode class on the <html> element on every change ──
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // ── Bootstrap cycle metrics & Service Worker registration on load ──
  useEffect(() => {
    recalculateCycleMetrics();

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('Nyra PWA Service Worker Registered:', reg.scope))
        .catch((err) => console.log('Service Worker Registration Failed:', err));
    }
  }, [recalculateCycleMetrics]);

  return (
    <Layout>
      <Component {...pageProps} />
      <PwaInstallPrompt />
    </Layout>
  );
}
