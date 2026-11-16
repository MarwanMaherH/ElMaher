/**
 * Score and motivation engine.
 *
 * Design rules (so the student never gets bored, and is never punished):
 *  - Every correct answer scores immediately; combos and speed add a bonus.
 *  - A wrong answer only resets the combo. No hearts, no lockouts.
 *  - Streaks have "freezes" so one missed day does not erase weeks of effort.
 *  - Stars never drop below 1 for finishing a lesson.
 *  - XP rewards understanding (first-try, fewer hints), not button presses.
 */

// ---------------------------------------------------------------- scoring

export interface AnswerInput {
  /** which attempt got it right: 1 = first try */
  attempt: number;
  hintsUsed: number;
  seconds: number;
  /** consecutive first-try answers BEFORE this one */
  combo: number;
  /** time at which the speed bonus reaches zero */
  targetSeconds?: number;
}

export interface AnswerScore {
  points: number;
  base: number;
  speedBonus: number;
  multiplier: number;
  /** combo after this answer */
  combo: number;
}

export function scoreCorrect(i: AnswerInput): AnswerScore {
  const target = i.targetSeconds ?? 20;
  const rawBase = i.attempt <= 1 ? 10 : i.attempt === 2 ? 5 : 2;
  const base = Math.max(1, rawBase - i.hintsUsed * 2);
  const firstTry = i.attempt <= 1;
  const speedBonus = firstTry ? Math.round(5 * Math.max(0, 1 - i.seconds / target)) : 0;
  const combo = firstTry ? i.combo + 1 : 0;
  const multiplier = 1 + 0.1 * Math.min(combo, 10);
  return { points: Math.round((base + speedBonus) * multiplier), base, speedBonus, multiplier, combo };
}

/** Combo after a wrong attempt. */
export const comboAfterWrong = (): number => 0;

// ---------------------------------------------------------------- levels

/** Total XP needed to REACH level L: 50 * L * (L - 1). L1=0, L2=100, L3=300 ... */
export const xpForLevel = (level: number): number => 50 * level * (level - 1);

export function levelFromXp(xp: number): number {
  return Math.floor(0.5 + Math.sqrt(0.25 + Math.max(0, xp) / 50));
}

export interface LevelProgress {
  level: number;
  intoLevel: number;
  needed: number;
  ratio: number;
}

export function levelProgress(xp: number): LevelProgress {
  const level = levelFromXp(xp);
  const base = xpForLevel(level);
  const needed = xpForLevel(level + 1) - base;
  const intoLevel = xp - base;
  return { level, intoLevel, needed, ratio: needed === 0 ? 0 : intoLevel / needed };
}

// ---------------------------------------------------------------- daily streak

export interface StreakState {
  count: number;
  longest: number;
  /** local date, YYYY-MM-DD */
  last: string | null;
  freezes: number;
}

export const newStreak = (): StreakState => ({ count: 0, longest: 0, last: null, freezes: 0 });

const dayNumber = (d: string): number => {
  const [y, m, day] = d.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, day) / 86_400_000);
};

export const MAX_FREEZES = 2;

/**
 * Call when the student does any learning activity.
 * A missed day consumes one freeze if available. Every 7th day earns a freeze.
 */
export function touchStreak(s: StreakState, today: string): StreakState {
  if (s.last === today) return s;
  if (s.last === null) return { count: 1, longest: Math.max(1, s.longest), last: today, freezes: s.freezes };

  const gap = dayNumber(today) - dayNumber(s.last);
  if (gap <= 0) return s; // clock went backwards; ignore
  const missed = gap - 1;

  let count: number;
  let freezes = s.freezes;
  if (missed === 0) {
    count = s.count + 1;
  } else if (freezes >= missed) {
    freezes -= missed;
    count = s.count + 1;
  } else {
    count = 1;
  }
  if (count > s.count && count % 7 === 0) freezes = Math.min(MAX_FREEZES, freezes + 1);
  return { count, longest: Math.max(s.longest, count), last: today, freezes };
}

/** What the UI should show if the student opens the app today without practising yet. */
export function streakStatus(s: StreakState, today: string): "none" | "active" | "at-risk" | "broken" {
  if (s.last === null) return "none";
  const gap = dayNumber(today) - dayNumber(s.last);
  if (gap <= 0) return "active";
  if (gap === 1) return "at-risk";
  return s.freezes >= gap - 1 ? "at-risk" : "broken";
}

// ---------------------------------------------------------------- daily goal

export const DEFAULT_DAILY_GOAL = 50;

export const dailyGoalRatio = (xpToday: number, goal = DEFAULT_DAILY_GOAL): number =>
  Math.min(1, Math.max(0, xpToday / goal));

// ---------------------------------------------------------------- stars

/** 1 to 3 stars. Finishing always earns at least one. */
export function starsFor(correctFirstTry: number, total: number): 1 | 2 | 3 {
  if (total <= 0) return 1;
  const acc = correctFirstTry / total;
  if (acc >= 0.9) return 3;
  if (acc >= 0.7) return 2;
  return 1;
}

export type Mastery = "not-started" | "needs-practice" | "good" | "mastered";

export function masteryFor(score: number | null): Mastery {
  if (score === null) return "not-started";
  if (score >= 0.85) return "mastered";
  if (score >= 0.6) return "good";
  return "needs-practice";
}

export const MASTERY_LABEL_AR: Record<Mastery, string> = {
  "not-started": "لم يبدأ",
  "needs-practice": "يحتاج تدريبًا",
  good: "جيد",
  mastered: "متقن",
};

/** The next lesson on the path opens at "good" or better. */
export const unlocksNext = (score: number | null): boolean => masteryFor(score) === "good" || masteryFor(score) === "mastered";

// ---------------------------------------------------------------- badges

export interface Stats {
  lessonsCompleted: number;
  perfectLessons: number;
  bestCombo: number;
  streak: number;
  labsTried: string[];
  questionsAnswered: number;
  level: number;
}

export interface Badge {
  id: string;
  nameAr: string;
  descAr: string;
  earned: (s: Stats) => boolean;
}

export const BADGES: Badge[] = [
  { id: "first-lesson", nameAr: "البداية", descAr: "أكمل أول درس", earned: (s) => s.lessonsCompleted >= 1 },
  { id: "perfect", nameAr: "درس بلا أخطاء", descAr: "أنهِ درسًا كاملًا من المحاولة الأولى", earned: (s) => s.perfectLessons >= 1 },
  { id: "combo-5", nameAr: "كومبو 5", descAr: "5 إجابات صحيحة متتالية من أول مرة", earned: (s) => s.bestCombo >= 5 },
  { id: "combo-10", nameAr: "كومبو 10", descAr: "10 إجابات صحيحة متتالية", earned: (s) => s.bestCombo >= 10 },
  { id: "streak-3", nameAr: "ثلاثة أيام", descAr: "تعلّم 3 أيام متتالية", earned: (s) => s.streak >= 3 },
  { id: "streak-7", nameAr: "أسبوع كامل", descAr: "تعلّم 7 أيام متتالية", earned: (s) => s.streak >= 7 },
  { id: "lab-explorer", nameAr: "مستكشف المعمل", descAr: "جرّب 3 تجارب مختلفة", earned: (s) => new Set(s.labsTried).size >= 3 },
  { id: "q-50", nameAr: "50 سؤالًا", descAr: "أجب عن 50 سؤالًا", earned: (s) => s.questionsAnswered >= 50 },
  { id: "level-5", nameAr: "المستوى 5", descAr: "ابلغ المستوى 5", earned: (s) => s.level >= 5 },
];

/** Badge ids newly earned given what was already earned. */
export function newBadges(stats: Stats, alreadyEarned: string[]): string[] {
  const have = new Set(alreadyEarned);
  return BADGES.filter((b) => !have.has(b.id) && b.earned(stats)).map((b) => b.id);
}

// ---------------------------------------------------------------- feedback tone

const PRAISE = ["ممتاز!", "أحسنت!", "إجابة موفقة!", "تفكير سليم!", "رائع، كمّل!"];
const COMBO_PRAISE: Record<number, string> = { 3: "ثلاثة ورا بعض!", 5: "كومبو 5! أنت في أحسن حالاتك", 10: "كومبو 10! مستوى ماهر" };
const RETRY = ["قريب جدًا، حاول مرة تانية", "مفيش مشكلة، الخطأ جزء من التعلم", "راجع الخطوة وجرّب تاني"];

export function praise(combo: number, rng: () => number = Math.random): string {
  return COMBO_PRAISE[combo] ?? PRAISE[Math.floor(rng() * PRAISE.length)];
}

export function encourageRetry(rng: () => number = Math.random): string {
  return RETRY[Math.floor(rng() * RETRY.length)];
}
