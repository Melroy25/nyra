import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Layout from "../components/Layout";
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

  // ── Bootstrap cycle metrics on first load ──
  useEffect(() => {
    recalculateCycleMetrics();
  }, [recalculateCycleMetrics]);

  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}
