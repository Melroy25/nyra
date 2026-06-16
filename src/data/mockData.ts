import type { DailyLog, Cycle, MoodType, SymptomType, CravingType, FlowType } from '../types';

// Helper to format date as YYYY-MM-DD in local time
export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const generateCyclesList = (
  avgCycleLength: number = 28,
  avgPeriodLength: number = 5,
  lastPeriodStartStr?: string,
  lastPeriodEndStr?: string
): Cycle[] => {
  const cycles: Cycle[] = [];
  const today = new Date();
  
  let anchorDate: Date;
  if (lastPeriodStartStr) {
    anchorDate = new Date(lastPeriodStartStr);
  } else {
    const currentCycleDaysAgo = 12;
    anchorDate = new Date(today);
    anchorDate.setDate(anchorDate.getDate() - currentCycleDaysAgo);
  }
  
  let currentPeriodLength = avgPeriodLength;
  if (lastPeriodStartStr && lastPeriodEndStr) {
    const start = new Date(lastPeriodStartStr);
    const end = new Date(lastPeriodEndStr);
    const diff = Math.abs(end.getTime() - start.getTime());
    currentPeriodLength = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
  }
  
  const tempDate = new Date(anchorDate);
  let cycleIndex = 0;
  
  // Go back 8 cycles to populate history
  tempDate.setDate(tempDate.getDate() - avgCycleLength * 8);
  
  for (let i = 0; i < 9; i++) {
    const startStr = formatDate(tempDate);
    const endTemp = new Date(tempDate);
    
    const isCurrentCycle = formatDate(tempDate) === formatDate(anchorDate);
    const pLength = isCurrentCycle ? currentPeriodLength : avgPeriodLength;
    
    endTemp.setDate(endTemp.getDate() + pLength - 1);
    const endStr = formatDate(endTemp);
    
    cycles.push({
      id: `cycle-${cycleIndex}`,
      startDate: startStr,
      endDate: endStr,
      cycleLength: avgCycleLength,
      periodLength: pLength
    });
    
    tempDate.setDate(tempDate.getDate() + avgCycleLength);
    cycleIndex++;
  }
  
  return cycles;
};

export const generateMockData = (
  avgCycleLength: number = 28,
  avgPeriodLength: number = 5,
  daysCount: number = 180,
  lastPeriodStartStr?: string,
  lastPeriodEndStr?: string
): { logs: DailyLog[]; cycles: Cycle[] } => {
  const cycles = generateCyclesList(avgCycleLength, avgPeriodLength, lastPeriodStartStr, lastPeriodEndStr);
  const logs: DailyLog[] = [];
  
  const today = new Date();

  // Now generate daily logs for the last `daysCount` days (up to today)
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - daysCount + 1);
  
  for (let i = 0; i < daysCount; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    const dateStr = formatDate(currentDate);
    
    // Find where this day sits relative to the cycles
    let daysSinceCycleStart = -1;
    
    // Find if it belongs to any generated cycle or if it falls after the last cycle
    // We sort cycles by start date ascending
    const sortedCycles = [...cycles].sort((a, b) => a.startDate.localeCompare(b.startDate));
    
    for (let c = 0; c < sortedCycles.length; c++) {
      const cycleStart = new Date(sortedCycles[c].startDate);
      const nextCycleStart = c < sortedCycles.length - 1 
        ? new Date(sortedCycles[c + 1].startDate) 
        : new Date(9999, 11, 31);
        
      if (currentDate >= cycleStart && currentDate < nextCycleStart) {
        const diffTime = Math.abs(currentDate.getTime() - cycleStart.getTime());
        daysSinceCycleStart = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        break;
      }
    }
    
    // Default fallback if outside bounds
    if (daysSinceCycleStart === -1) {
      daysSinceCycleStart = 15; // default mid-cycle
    }
    
    // Determine details based on daysSinceCycleStart (0-indexed day of cycle)
    const cycleDay = daysSinceCycleStart % avgCycleLength;
    
    let flow: FlowType = 'None';
    const symptoms: SymptomType[] = [];
    const cravings: CravingType[] = [];
    let mood: MoodType = 'Calm';
    let energy = 4;
    let sleep = 7.5;
    let hydration = 5; // cups
    let notes = '';
    
    if (cycleDay < avgPeriodLength) {
      // Menstrual Phase (Days 0-4)
      if (cycleDay === 0) {
        flow = 'Heavy';
        symptoms.push('Cramps', 'Fatigue', 'Back Pain');
        mood = 'Emotional';
        energy = 2;
        sleep = 8.5;
        cravings.push('Chocolate');
        notes = 'First day of period. Cramps are quite intense. Feeling tired and emotional.';
      } else if (cycleDay === 1) {
        flow = 'Heavy';
        symptoms.push('Cramps', 'Fatigue');
        mood = 'Sad';
        energy = 2.5;
        sleep = 8.0;
        cravings.push('Chocolate', 'Carbs');
        notes = 'Heavy flow today. Craving warm comfort food and chocolate.';
      } else if (cycleDay === 2) {
        flow = 'Medium';
        symptoms.push('Bloating', 'Fatigue');
        mood = 'Emotional';
        energy = 3;
        sleep = 7.5;
        cravings.push('Carbs');
        notes = 'Cramps subsiding but feeling bloated. Energy is slightly better.';
      } else if (cycleDay === 3) {
        flow = 'Light';
        symptoms.push('Back Pain');
        mood = 'Calm';
        energy = 3.5;
        sleep = 7.0;
        notes = 'Period winding down. Energy returning, back pain is mild.';
      } else {
        flow = 'Light';
        mood = 'Calm';
        energy = 4;
        sleep = 7.0;
        notes = 'Last day of period. Feeling ready to get active again.';
      }
      hydration = 6 + Math.floor(Math.random() * 3); // 6-8 cups
    } else if (cycleDay >= avgPeriodLength && cycleDay < 11) {
      // Follicular Phase (Days 5-10)
      flow = 'None';
      mood = Math.random() > 0.4 ? 'Happy' : 'Calm';
      energy = 4 + (Math.random() > 0.6 ? 1 : 0); // 4-5
      sleep = 7 + Math.random() * 1.5; // 7 - 8.5
      hydration = 5 + Math.floor(Math.random() * 4); // 5-8 cups
      
      if (Math.random() > 0.8) {
        symptoms.push('Acne');
      }
      if (Math.random() > 0.85) {
        cravings.push('Sugar');
      }
      
      const feelings = ['Feeling energetic and focused.', 'Great workout today!', 'Skin is clearing up and mood is wonderful.'];
      notes = feelings[Math.floor(Math.random() * feelings.length)];
    } else if (cycleDay >= 11 && cycleDay < 16) {
      // Ovulatory Phase (Days 11-15) - Peak Fertility & Ovulation (typically day 13/14)
      flow = 'None';
      mood = 'Happy';
      energy = 5; // peak energy
      sleep = 7.0 + Math.random(); 
      hydration = 7 + Math.floor(Math.random() * 4); // 7-10 cups
      
      if (cycleDay === 13 || cycleDay === 14) {
        if (Math.random() > 0.5) {
          symptoms.push('Headache'); // minor ovulation headache
        }
        notes = 'Ovulation day! Feeling extremely energetic, positive, and confident. Glowing skin.';
      } else {
        notes = 'Highly energetic phase. Doing some heavy cardio training today.';
      }
    } else {
      // Luteal Phase (Days 16-27)
      flow = 'None';
      
      if (cycleDay < 22) {
        // Early Luteal
        mood = Math.random() > 0.3 ? 'Calm' : 'Happy';
        energy = 4;
        sleep = 7.5;
        hydration = 6;
        notes = 'Transitioning into luteal. Stable mood and decent energy.';
      } else {
        // Late Luteal (PMS Days 22-27)
        energy = 3 - (Math.random() > 0.7 ? 1 : 0); // 2-3
        sleep = 7.5 + Math.random() * 1.5; // 7.5 - 9
        hydration = 4 + Math.floor(Math.random() * 3); // 4-6 cups
        
        // Correlated symptoms
        if (cycleDay >= 24) {
          symptoms.push('Bloating');
          if (Math.random() > 0.4) symptoms.push('Breast Tenderness');
          if (Math.random() > 0.5) symptoms.push('Acne');
          if (Math.random() > 0.7) symptoms.push('Headache');
        } else {
          symptoms.push('Bloating');
        }
        
        // Correlated cravings
        if (Math.random() > 0.3) cravings.push('Chocolate');
        if (Math.random() > 0.4) cravings.push('Carbs');
        if (Math.random() > 0.5) cravings.push('Sugar');
        if (Math.random() > 0.6) cravings.push('Salty');
        
        // Mood swings
        const moods: MoodType[] = ['Irritated', 'Anxious', 'Sad', 'Emotional'];
        mood = moods[Math.floor(Math.random() * moods.length)];
        
        const pmsNotes = [
          'Feeling very bloated and sluggish today. Craving chocolate.',
          'Slightly irritable. Need some quiet time tonight.',
          'Skin is breaking out. Feeling anxious for no apparent reason.',
          'Breast tenderness is noticeable. Heavy cravings for salty snacks.'
        ];
        notes = pmsNotes[cycleDay % pmsNotes.length];
      }
    }
    
    // Ensure values are formatted nicely to 1 decimal place
    sleep = parseFloat(sleep.toFixed(1));
    energy = parseFloat(energy.toFixed(1));
    
    logs.push({
      date: dateStr,
      mood,
      symptoms,
      cravings,
      flow,
      energy,
      sleep,
      hydration,
      notes
    });
  }
  
  return { logs, cycles };
};
