import { CycleLog } from '../types';

// Empty by default — logs are generated from onboarding data in useStore.ts
export const mockCycleLogs: CycleLog[] = [];

/**
 * Generates cycle logs from onboarding data:
 * - Period days from lastPeriodDate for periodDuration days (flow = 'medium', no symptoms)
 * - 3 predicted days centered on (lastPeriodDate + averageCycleLength)
 * - Ovulation window 14 days before next period start
 */
export function generateInitialCycleLogs(
  lastPeriodDate: string,
  periodDuration: number,
  averageCycleLength: number
): CycleLog[] {
  if (!lastPeriodDate) return [];

  const logs: CycleLog[] = [];
  const start = new Date(lastPeriodDate);
  if (isNaN(start.getTime())) return [];

  // ── Actual logged period days ──
  for (let i = 0; i < periodDuration; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    logs.push({
      date: dateStr,
      isPeriod: true,
      isPredicted: false,
      isOvulation: false,
      flow: null,      // user didn't set flow at registration time
      symptoms: [],
      mood: null,
      isUserLogged: false, // auto-seeded, not manually tapped by user
    });
  }

  // ── Predicted next period: 3 days centred on (start + cycleLength) ──
  const predictedStart = new Date(start);
  predictedStart.setDate(predictedStart.getDate() + averageCycleLength - 1); // 1 day before expected
  for (let i = 0; i < 3; i++) {
    const d = new Date(predictedStart);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    // Don't overwrite an actual period log
    if (!logs.find((l) => l.date === dateStr)) {
      logs.push({
        date: dateStr,
        isPeriod: false,
        isPredicted: true,
        isOvulation: false,
        flow: null,
        symptoms: [],
        mood: null,
        isUserLogged: false,
      });
    }
  }

  // ── Ovulation window: ~14 days before predicted period start ──
  const ovulationCenter = new Date(start);
  ovulationCenter.setDate(ovulationCenter.getDate() + averageCycleLength - 14);
  for (let i = -1; i <= 1; i++) {
    const d = new Date(ovulationCenter);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    if (!logs.find((l) => l.date === dateStr)) {
      logs.push({
        date: dateStr,
        isPeriod: false,
        isPredicted: false,
        isOvulation: true,
        flow: null,
        symptoms: [],
        mood: null,
        isUserLogged: false,
      });
    }
  }

  return logs;
}
