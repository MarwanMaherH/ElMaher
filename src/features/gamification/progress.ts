/**
 * Student progress: a plain serialisable state plus pure reducers.
 * The UI keeps this in localStorage today; the same shape maps to the
 * Prisma tables (lesson_progress, xp_transactions, streaks, achievements).
 */
import {
  type StreakState, type Stats, newStreak, touchStreak, levelFromXp, starsFor, newBadges, masteryFor, unlocksNext,
  type Mastery,
} from "./engine";
import { type AdaptiveState, type Topic, newAdaptiveState, updateAdaptive } from "../practice/questions";

export interface LessonRecord {
  done: boolean;
  /** best first-try ratio, 0..1 */
  best: number;
  stars: 1 | 2 | 3;
  attempts: number;
}

export interface ProgressState {
  user: { name: string; grade: 1 | 2 | 3 } | null;
  xp: number;
  /** XP earned on `today.date`, for the daily goal ring */
  today: { date: string; xp: number };
  streak: StreakState;
  lessons: Record<string, LessonRecord>;
  badges: string[];
  perfectLessons: number;
  bestCombo: number;
  labsTried: string[];
  questionsAnswered: number;
  adaptive: AdaptiveState;
  premium: boolean;
}

export const initialProgress = (): ProgressState => ({
  user: null,
  xp: 0,
  today: { date: "", xp: 0 },
  streak: newStreak(),
  lessons: {},
  badges: [],
  perfectLessons: 0,
  bestCombo: 0,
  labsTried: [],
  questionsAnswered: 0,
  adaptive: newAdaptiveState(),
  premium: false,
});

export const localDate = (d: Date = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const statsOf = (s: ProgressState): Stats => ({
  lessonsCompleted: Object.values(s.lessons).filter((l) => l.done).length,
  perfectLessons: s.perfectLessons,
  bestCombo: s.bestCombo,
  streak: s.streak.count,
  labsTried: s.labsTried,
  questionsAnswered: s.questionsAnswered,
  level: levelFromXp(s.xp),
});

/** Adds XP, rolls the daily counter, touches the streak, awards badges. */
export function addXp(s: ProgressState, points: number, today: string): { state: ProgressState; badges: string[] } {
  const todayXp = s.today.date === today ? s.today.xp : 0;
  let next: ProgressState = {
    ...s,
    xp: s.xp + points,
    today: { date: today, xp: todayXp + points },
    streak: touchStreak(s.streak, today),
  };
  const earned = newBadges(statsOf(next), next.badges);
  if (earned.length) next = { ...next, badges: [...next.badges, ...earned] };
  return { state: next, badges: earned };
}

export function recordQuestion(
  s: ProgressState,
  a: { topic: Topic; firstTry: boolean; combo: number },
): ProgressState {
  return {
    ...s,
    questionsAnswered: s.questionsAnswered + 1,
    bestCombo: Math.max(s.bestCombo, a.combo),
    adaptive: updateAdaptive(s.adaptive, a.topic, a.firstTry),
  };
}

export const noteCombo = (s: ProgressState, combo: number): ProgressState =>
  combo > s.bestCombo ? { ...s, bestCombo: combo } : s;

export function recordLab(s: ProgressState, labId: string): ProgressState {
  return s.labsTried.includes(labId) ? s : { ...s, labsTried: [...s.labsTried, labId] };
}

export interface LessonResult {
  state: ProgressState;
  stars: 1 | 2 | 3;
  score: number;
  xpGained: number;
  badges: string[];
  firstCompletion: boolean;
}

export function completeLesson(
  s: ProgressState,
  a: { id: string; firstTry: number; total: number },
  today: string,
): LessonResult {
  const score = a.total === 0 ? 1 : a.firstTry / a.total;
  const stars = starsFor(a.firstTry, a.total);
  const prev = s.lessons[a.id];
  const firstCompletion = !prev?.done;
  const xpGained = firstCompletion ? 20 + stars * 5 : 5;

  const record: LessonRecord = {
    done: true,
    best: Math.max(prev?.best ?? 0, score),
    stars: Math.max(prev?.stars ?? 1, stars) as 1 | 2 | 3,
    attempts: (prev?.attempts ?? 0) + 1,
  };
  const base: ProgressState = {
    ...s,
    lessons: { ...s.lessons, [a.id]: record },
    perfectLessons: s.perfectLessons + (score === 1 ? 1 : 0),
  };
  const { state, badges } = addXp(base, xpGained, today);
  return { state, stars, score, xpGained, badges, firstCompletion };
}

export const masteryOfLesson = (s: ProgressState, id: string): Mastery => {
  const r = s.lessons[id];
  return masteryFor(r?.done ? r.best : null);
};

/** A path node is open when it is the first, or the previous one is "good" or better. */
export function isUnlocked(s: ProgressState, orderedIds: string[], index: number): boolean {
  if (index === 0) return true;
  const prev = s.lessons[orderedIds[index - 1]];
  return !!prev?.done && unlocksNext(prev.best);
}
