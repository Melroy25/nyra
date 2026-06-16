import type { Cycle } from '../types';

export interface CyclePhaseInfo {
  cycleDay: number;
  phaseName: 'Menstrual' | 'Follicular' | 'Ovulatory' | 'Luteal';
  phaseDescription: string;
  phaseEmoji: string;
  daysUntilNextPeriod: number;
  estrogenLevel: 'Low' | 'Rising' | 'Peak' | 'Falling';
  progesteroneLevel: 'Low' | 'Low' | 'Rising' | 'Peak';
  insight: string;
  isFertile: boolean;
  fertilityStatus: 'Low' | 'Medium' | 'High' | 'Peak';
}

export const getCyclePhaseInfo = (
  currentDateStr: string,
  cycles: Cycle[],
  avgCycleLength: number = 28,
  avgPeriodLength: number = 5
): CyclePhaseInfo => {
  // Sort cycles descending
  const sortedCycles = [...cycles].sort((a, b) => b.startDate.localeCompare(a.startDate));
  const currentDate = new Date(currentDateStr);
  
  // Find the cycle that matches or is closest before current date
  let activeCycle = sortedCycles.find(c => new Date(c.startDate) <= currentDate);
  
  let cycleDay = 12; // default fallback if no cycle found
  let daysSinceStart = 11;
  
  if (activeCycle) {
    const cycleStart = new Date(activeCycle.startDate);
    const diffTime = Math.abs(currentDate.getTime() - cycleStart.getTime());
    daysSinceStart = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    cycleDay = (daysSinceStart % avgCycleLength) + 1; // 1-based index
  } else if (sortedCycles.length > 0) {
    // If date is before all logged cycles, estimate from the earliest one
    const earliestCycle = sortedCycles[sortedCycles.length - 1];
    const cycleStart = new Date(earliestCycle.startDate);
    const diffTime = Math.abs(currentDate.getTime() - cycleStart.getTime());
    daysSinceStart = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    cycleDay = (daysSinceStart % avgCycleLength) + 1;
  }

  // Calculate phase borders based on average cycle parameters
  const menstrualEnd = avgPeriodLength; // e.g., Day 5
  const follicularEnd = Math.floor(avgCycleLength / 2) - 2; // e.g., Day 12
  const ovulatoryEnd = follicularEnd + 4; // e.g., Day 16
  
  let phaseName: CyclePhaseInfo['phaseName'] = 'Follicular';
  let phaseDescription = 'Estrogen is rising. Focus, energy and social stamina are increasing.';
  let phaseEmoji = '🌱';
  let estrogenLevel: CyclePhaseInfo['estrogenLevel'] = 'Rising';
  let progesteroneLevel: CyclePhaseInfo['progesteroneLevel'] = 'Low';
  let isFertile = false;
  let fertilityStatus: CyclePhaseInfo['fertilityStatus'] = 'Low';
  let insight = 'Your energy is on the rise. A perfect time for planning, brainstorming, and starting new workouts.';

  if (cycleDay <= menstrualEnd) {
    phaseName = 'Menstrual';
    phaseDescription = 'Hormones are at their lowest. Time to rest, restore, and replenish.';
    phaseEmoji = '🩸';
    estrogenLevel = 'Low';
    progesteroneLevel = 'Low';
    insight = 'Flow has started. Focus on gentle yoga, rest, iron-rich foods, and warm liquids like ginger tea.';
  } else if (cycleDay <= follicularEnd) {
    phaseName = 'Follicular';
    phaseDescription = 'Estrogen rises, boosting brain power, physical strength, and glowing skin.';
    phaseEmoji = '🌱';
    estrogenLevel = 'Rising';
    progesteroneLevel = 'Low';
    insight = 'High estrogen boosts focus. Great day for complex tasks, scheduling meetings, and high-intensity workouts.';
  } else if (cycleDay <= ovulatoryEnd) {
    phaseName = 'Ovulatory';
    phaseDescription = 'Estrogen peaks, triggering ovulation. High fertility, peak energy, and social confidence.';
    phaseEmoji = '✨';
    estrogenLevel = 'Peak';
    progesteroneLevel = 'Low';
    isFertile = true;
    
    // Day 14 (or middle of ovulatory) is peak fertility
    const midOv = follicularEnd + 2;
    if (cycleDay === midOv || cycleDay === midOv + 1) {
      fertilityStatus = 'Peak';
    } else {
      fertilityStatus = 'High';
    }
    
    insight = 'Ovulation phase. You are at peak confidence and verbal fluency. Excellent for presentations or socializing.';
  } else {
    phaseName = 'Luteal';
    phaseDescription = 'Progesterone rises, calming the nervous system. Cravings, bloating, and nesting instincts increase.';
    phaseEmoji = '🍂';
    estrogenLevel = 'Falling';
    progesteroneLevel = 'Rising';
    
    const lateLutealStart = avgCycleLength - 6; // e.g., day 22
    if (cycleDay >= lateLutealStart) {
      progesteroneLevel = 'Peak';
      insight = 'PMS phase. Progesterone peaks then drops, triggering cravings and bloating. Slow down, sleep more, and eat magnesium-rich dark chocolate.';
    } else {
      insight = 'Early luteal. Progesterone is calming. Great time for deep focused solo work, nesting, and gentle stretching.';
    }
  }

  // Calculate days remaining
  const daysUntilNextPeriod = avgCycleLength - (cycleDay - 1);

  return {
    cycleDay,
    phaseName,
    phaseDescription,
    phaseEmoji,
    daysUntilNextPeriod: daysUntilNextPeriod <= 0 ? avgCycleLength : daysUntilNextPeriod,
    estrogenLevel,
    progesteroneLevel,
    insight,
    isFertile,
    fertilityStatus
  };
};
