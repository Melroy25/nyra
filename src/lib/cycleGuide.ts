export interface CycleDayDetails {
  day: number;
  phase: 'Menstrual' | 'Follicular' | 'Ovulation' | 'Luteal';
  phaseEmoji: string;
  summary: string;
  whatIsIt: string;        // Biological breakdown (What is happening inside your body?)
  howYouFeel: string;      // Physical & emotional breakdown (What might you feel today?)
  whatToDo: string[];      // Actionable recommendations (What to do today?)
  partnerTips: string[];   // What partner can do to support her today
}

export function getCycleDayDetails(day: number, cycleLength: number = 28): CycleDayDetails {
  const safeDay = Math.max(1, Math.min(day, cycleLength));
  const periodDuration = 5;
  const follicEnd = Math.floor(cycleLength * 0.46); // ~12
  const ovulEnd = Math.floor(cycleLength * 0.58);   // ~16

  if (safeDay <= periodDuration) {
    return {
      day: safeDay,
      phase: 'Menstrual',
      phaseEmoji: '🩸',
      summary: `Day ${safeDay} of ${cycleLength} — Menstrual Phase. Your body is resetting and shedding the uterine lining.`,
      whatIsIt: `Progesterone and estrogen levels drop to their lowest monthly point, causing the uterine lining to shed. Uterine muscles contract (cramps) triggered by prostaglandins.`,
      howYouFeel: `Lower physical energy, abdominal/lower back cramping, heavy or light flow, desire to rest, mild fatigue, and emotional sensitivity.`,
      whatToDo: [
        'Rest well & apply warm heat therapy pack on lower abdomen',
        'Eat iron-rich foods (spinach, lentils, beets) & warm soothing soups',
        'Do light restorative stretches or gentle walking; avoid heavy HIIT',
      ],
      partnerTips: [
        'Bring her a warm water bottle or hot heating pad',
        'Offer to handle heavy chores & prepare warm soothing meals/tea',
        'Be extra patient, comforting, and supportive without pressure',
      ],
    };
  } else if (safeDay <= follicEnd) {
    return {
      day: safeDay,
      phase: 'Follicular',
      phaseEmoji: '🌸',
      summary: `Day ${safeDay} of ${cycleLength} — Follicular Phase. Estrogen is rising as a new follicle matures.`,
      whatIsIt: `The pituitary gland releases Follicle-Stimulating Hormone (FSH) to mature new egg follicles. Rising estrogen rebuilds uterine lining & boosts serotonin in the brain.`,
      howYouFeel: `Surging stamina, mental clarity, upbeat mood, clear glowing skin, and renewed curiosity for new goals and projects.`,
      whatToDo: [
        'Tackle challenging work tasks, cardio, or strength training workouts',
        'Eat fresh energizing foods, light proteins, fermented foods & greens',
        'Plan social gatherings, outdoor activities, or creative brainstorming',
      ],
      partnerTips: [
        'Plan fun outdoor dates, workout sessions, or active outings together',
        'Encourage her new projects and share in her rising enthusiasm',
        'Enjoy her high social energy and positive mood vibes',
      ],
    };
  } else if (safeDay <= ovulEnd) {
    return {
      day: safeDay,
      phase: 'Ovulation',
      phaseEmoji: '🥚',
      summary: `Day ${safeDay} of ${cycleLength} — Ovulation Phase. Peak fertility window as an egg is released.`,
      whatIsIt: `Luteinizing Hormone (LH) surges rapidly, causing the ovary to release a mature egg. Estrogen and testosterone reach peak monthly levels.`,
      howYouFeel: `Peak physical confidence, high energy, heightened romantic attraction, radiant skin, and mild pelvic twinges (Mittelschmerz).`,
      whatToDo: [
        'Do high-energy strength training or active group sports',
        'Eat anti-inflammatory foods (berries, avocado, salmon, chia seeds)',
        'Stay well hydrated to balance core body temperature rise',
      ],
      partnerTips: [
        'Plan a romantic date night or quality intimate time',
        'Compliment her — her confidence and mood are at peak monthly levels',
        'Help keep her hydrated and join in high-energy activities',
      ],
    };
  } else {
    return {
      day: safeDay,
      phase: 'Luteal',
      phaseEmoji: '🌙',
      summary: `Day ${safeDay} of ${cycleLength} — Luteal Phase. Progesterone rises as body prepares for winding down.`,
      whatIsIt: `The empty follicle becomes the corpus luteum, secreting progesterone. Progesterone thickens uterine lining and gently slows digestion.`,
      howYouFeel: `Winding down energy, craving comfort foods (sweets/carbs), mild bloating, breast tenderness, PMS symptoms, or need for quiet time.`,
      whatToDo: [
        'Eat complex carbs (sweet potatoes, oats), dark chocolate & magnesium',
        'Switch to low-impact exercise like Pilates, swimming, or walking',
        'Prioritize 8+ hours of sleep and reduce caffeine to calm nervous system',
      ],
      partnerTips: [
        'Keep her favorite comforting snacks, dark chocolate, or tea stocked',
        'Give gentle back or foot massages to relieve PMS tension',
        'Create a cozy, calm environment and avoid sparking arguments',
      ],
    };
  }
}
