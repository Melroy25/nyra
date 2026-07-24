import { CycleLog } from '../types';
import { mockCycleLogs } from '../data/cycles';

export const cycleService = {
  async getCycleLogs(userId: string): Promise<CycleLog[]> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return [...mockCycleLogs];
  },

  async saveCycleLog(userId: string, log: CycleLog): Promise<CycleLog> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    // In a real database, we would upsert the log by date.
    return log;
  },

  async getAIInsights(userId: string, logs: CycleLog[]): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 600));
    // Return sample dynamic suggestions based on recent inputs
    const lastLog = logs[logs.length - 1];
    if (lastLog?.symptoms.includes('Cramps')) {
      return "Cramps are common right now. Try a warm chamomile tea and a light pelvic stretch.";
    }
    return "Based on your cycle rhythm, your energy will peak tomorrow. A great time for creative projects or high-intensity workouts!";
  },
};
