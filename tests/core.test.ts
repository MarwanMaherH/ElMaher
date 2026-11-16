import { test } from "node:test";
import assert from "node:assert/strict";

import {
  EQUATIONS, parseFormula, isBalanced, isMinimalBalanced, solveBalance, atomTable, toMhchem,
} from "../src/features/science-lab/chemistry/chem";
import { projectile, slideBlock, GRAVITY } from "../src/features/science-lab/physics/physics";
import {
  ALL_TOPICS, generateQuestion, gradeAnswer, parseAnswer, mulberry32, newAdaptiveState,
  updateAdaptive, pickTopic, nextQuestion, type Level,
} from "../src/features/practice/questions";
import {
  scoreCorrect, levelFromXp, xpForLevel, levelProgress, touchStreak, newStreak, streakStatus,
  starsFor, masteryFor, unlocksNext, newBadges, dailyGoalRatio,
} from "../src/features/gamification/engine";

// ------------------------------------------------------------ chemistry

test("parseFormula handles groups and multi-letter elements", () => {
  assert.deepEqual(parseFormula("H2O"), { H: 2, O: 1 });
  assert.deepEqual(parseFormula("Ca(OH)2"), { Ca: 1, O: 2, H: 2 });
  assert.deepEqual(parseFormula("Al2(SO4)3"), { Al: 2, S: 3, O: 12 });
  assert.deepEqual(parseFormula("NaCl"), { Na: 1, Cl: 1 });
});

test("parseFormula rejects malformed input", () => {
  assert.throws(() => parseFormula("Ca(OH"));
  assert.throws(() => parseFormula("H2O)"));
  assert.throws(() => parseFormula("h2o"));
});

test("solver reproduces the known coefficients for every equation", () => {
  for (const eq of EQUATIONS) {
    const solved = solveBalance(eq);
    assert.deepEqual(solved, eq.expected, eq.id);
    assert.ok(isMinimalBalanced(eq, eq.expected), eq.id);
  }
});

test("balanced-but-not-minimal is detected", () => {
  const eq = EQUATIONS[0]; // H2 + O2 -> H2O
  assert.ok(isBalanced(eq, [4, 2, 4]));
  assert.ok(!isMinimalBalanced(eq, [4, 2, 4]));
  assert.ok(!isBalanced(eq, [1, 1, 1]));
  assert.ok(!isBalanced(eq, [0, 1, 0]));
});

test("atomTable shows per-element counts", () => {
  const eq = EQUATIONS[0];
  const rows = atomTable(eq, [1, 1, 1]);
  assert.deepEqual(rows.find((r) => r.element === "H"), { element: "H", left: 2, right: 2, ok: true });
  assert.deepEqual(rows.find((r) => r.element === "O"), { element: "O", left: 2, right: 1, ok: false });
  assert.equal(toMhchem("Ca(OH)2"), "\\ce{Ca(OH)2}");
});

// ------------------------------------------------------------ physics

test("projectile: classic 45 degree range and flight time", () => {
  const p = projectile({ v: 20, angle: 45, h: 0, g: GRAVITY.earth });
  assert.ok(Math.abs(p.range - 400 / 9.8) < 1e-9);
  assert.ok(Math.abs(p.flightTime - (2 * 20 * Math.sin(Math.PI / 4)) / 9.8) < 1e-9);
  assert.ok(Math.abs(p.at(p.flightTime).y) < 1e-9);
  assert.ok(Math.abs(p.at(p.timeToPeak).y - p.maxHeight) < 1e-9);
});

test("projectile: 45 degrees maximises range from the ground, and moon > earth", () => {
  const ranges = [15, 30, 45, 60, 75].map((a) => projectile({ v: 20, angle: a, h: 0, g: 9.8 }).range);
  assert.equal(ranges.indexOf(Math.max(...ranges)), 2);
  assert.ok(projectile({ v: 20, angle: 45, h: 0, g: GRAVITY.moon }).range > ranges[2]);
});

test("projectile: launch height increases flight time and conserves energy", () => {
  const a = projectile({ v: 10, angle: 30, h: 0, g: 9.8 });
  const b = projectile({ v: 10, angle: 30, h: 20, g: 9.8 });
  assert.ok(b.flightTime > a.flightTime);
  const eStart = 0.5 * 100 + 9.8 * 20;
  const eEnd = 0.5 * b.impactSpeed ** 2;
  assert.ok(Math.abs(eStart - eEnd) < 1e-9);
});

test("slideBlock: friction threshold and acceleration", () => {
  const still = slideBlock({ force: 10, mass: 5, mu: 0.5 }); // max friction 24.5
  assert.equal(still.moving, false);
  assert.equal(still.acceleration, 0);
  assert.equal(still.friction, 10);
  const go = slideBlock({ force: 50, mass: 5, mu: 0.2 }); // f = 9.8
  assert.ok(go.moving);
  assert.ok(Math.abs(go.acceleration - (50 - 9.8) / 5) < 1e-12);
  assert.ok(Math.abs(go.distanceAt(2) - 0.5 * go.acceleration * 4) < 1e-12);
});

// ------------------------------------------------------------ practice

test("parseAnswer accepts Arabic digits, decimal commas and unicode minus", () => {
  assert.equal(parseAnswer("٣٫٥"), 3.5);
  assert.equal(parseAnswer("2,5"), 2.5);
  assert.equal(parseAnswer("−3"), -3);
  assert.ok(Number.isNaN(parseAnswer("abc")));
  assert.ok(Number.isNaN(parseAnswer("")));
});

test("every generated question: right answer is accepted, every known error is classified", () => {
  for (let seed = 1; seed <= 200; seed++) {
    const rng = mulberry32(seed);
    for (const topic of ALL_TOPICS) {
      for (const level of [1, 2, 3] as Level[]) {
        const q = generateQuestion(topic, level, rng);
        assert.ok(Number.isFinite(q.answer), `${topic} L${level} seed ${seed}`);
        assert.equal(gradeAnswer(q, String(q.answer)).status, "correct", `${topic} L${level} seed ${seed}`);
        for (const e of q.errors) {
          const g = gradeAnswer(q, String(e.value));
          assert.equal(g.status, "wrong", `${topic} L${level} seed ${seed} err ${e.value}`);
          if (g.status === "wrong") assert.ok(g.message.length > 0);
        }
        assert.equal(gradeAnswer(q, String(q.answer + 12345.6)).status, "wrong");
        assert.ok(q.hints.length >= 2 && q.solution.length > 0);
      }
    }
  }
});

test("newton level 2 flags the classic unit mistake", () => {
  const q = generateQuestion("newton", 2, mulberry32(7));
  const unitErr = q.errors.find((e) => e.type === "unit")!;
  const g = gradeAnswer(q, String(unitErr.value));
  assert.equal(g.status === "wrong" && g.type, "unit");
});

test("adaptive: levels up after 3 first-try wins, down after 2 misses, never below 1 or above 3", () => {
  let s = newAdaptiveState();
  for (let i = 0; i < 3; i++) s = updateAdaptive(s, "newton", true);
  assert.equal(s.level, 2);
  for (let i = 0; i < 6; i++) s = updateAdaptive(s, "moles", true);
  assert.equal(s.level, 3);
  s = updateAdaptive(s, "ph", false);
  s = updateAdaptive(s, "ph", false);
  assert.equal(s.level, 2);
  for (let i = 0; i < 10; i++) s = updateAdaptive(s, "ph", false);
  assert.equal(s.level, 1);
});

test("pickTopic never repeats the last topic and favours weak topics", () => {
  const rng = mulberry32(42);
  let s = newAdaptiveState();
  s = updateAdaptive(s, "ph", false);
  s = updateAdaptive(s, "newton", true);
  s = updateAdaptive(s, "newton", true);
  let last = s.lastTopic;
  const counts: Record<string, number> = {};
  for (let i = 0; i < 2000; i++) {
    const t = pickTopic({ ...s, lastTopic: last }, rng);
    assert.notEqual(t, last);
    counts[t] = (counts[t] ?? 0) + 1;
    last = t;
  }
  assert.ok((counts.ph ?? 0) > (counts.newton ?? 0));
});

test("nextQuestion returns a valid question", () => {
  const q = nextQuestion(newAdaptiveState(), mulberry32(3));
  assert.ok(ALL_TOPICS.includes(q.topic));
});

// ------------------------------------------------------------ gamification

test("scoreCorrect rewards first try, speed and combo; hints and retries reduce it", () => {
  const fast = scoreCorrect({ attempt: 1, hintsUsed: 0, seconds: 0, combo: 0 });
  assert.equal(fast.base, 10);
  assert.equal(fast.speedBonus, 5);
  assert.equal(fast.combo, 1);
  const slow = scoreCorrect({ attempt: 1, hintsUsed: 0, seconds: 60, combo: 0 });
  assert.equal(slow.speedBonus, 0);
  assert.ok(fast.points > slow.points);
  const combo = scoreCorrect({ attempt: 1, hintsUsed: 0, seconds: 60, combo: 9 });
  assert.equal(combo.multiplier, 2);
  assert.equal(combo.combo, 10);
  const maxed = scoreCorrect({ attempt: 1, hintsUsed: 0, seconds: 60, combo: 50 });
  assert.equal(maxed.multiplier, 2); // capped
  const retry = scoreCorrect({ attempt: 2, hintsUsed: 1, seconds: 5, combo: 5 });
  assert.equal(retry.combo, 0);
  assert.equal(retry.speedBonus, 0);
  assert.ok(retry.points >= 1);
  const worst = scoreCorrect({ attempt: 5, hintsUsed: 9, seconds: 999, combo: 0 });
  assert.ok(worst.points >= 1);
});

test("level curve", () => {
  assert.equal(xpForLevel(1), 0);
  assert.equal(xpForLevel(2), 100);
  assert.equal(xpForLevel(3), 300);
  assert.equal(levelFromXp(0), 1);
  assert.equal(levelFromXp(99), 1);
  assert.equal(levelFromXp(100), 2);
  assert.equal(levelFromXp(299), 2);
  assert.equal(levelFromXp(300), 3);
  for (let xp = 0; xp < 5000; xp += 7) {
    const lp = levelProgress(xp);
    assert.ok(lp.ratio >= 0 && lp.ratio < 1, `xp ${xp}`);
    assert.equal(xpForLevel(lp.level) + lp.intoLevel, xp);
  }
});

test("streak: consecutive days, same-day no-op, freeze rescue, break, weekly freeze", () => {
  let s = newStreak();
  s = touchStreak(s, "2026-11-01");
  assert.equal(s.count, 1);
  assert.equal(touchStreak(s, "2026-11-01"), s);
  s = touchStreak(s, "2026-11-02");
  assert.equal(s.count, 2);
  // missed a day, no freeze -> reset
  const broken = touchStreak(s, "2026-11-04");
  assert.equal(broken.count, 1);
  assert.equal(broken.longest, 2);
  // missed a day with a freeze -> continues
  const rescued = touchStreak({ ...s, freezes: 1 }, "2026-11-04");
  assert.equal(rescued.count, 3);
  assert.equal(rescued.freezes, 0);
  // 7th consecutive day earns a freeze
  let w = newStreak();
  for (let d = 1; d <= 7; d++) w = touchStreak(w, `2026-11-${String(d).padStart(2, "0")}`);
  assert.equal(w.count, 7);
  assert.equal(w.freezes, 1);
  // month boundary
  const m = touchStreak({ count: 5, longest: 5, last: "2026-11-30", freezes: 0 }, "2026-12-01");
  assert.equal(m.count, 6);
});

test("streakStatus", () => {
  const s = { count: 4, longest: 4, last: "2026-11-10", freezes: 0 };
  assert.equal(streakStatus(s, "2026-11-10"), "active");
  assert.equal(streakStatus(s, "2026-11-11"), "at-risk");
  assert.equal(streakStatus(s, "2026-11-13"), "broken");
  assert.equal(streakStatus({ ...s, freezes: 2 }, "2026-11-13"), "at-risk");
  assert.equal(streakStatus(newStreak(), "2026-11-13"), "none");
});

test("stars never drop below one; mastery and unlock thresholds", () => {
  assert.equal(starsFor(0, 5), 1);
  assert.equal(starsFor(4, 5), 2);
  assert.equal(starsFor(5, 5), 3);
  assert.equal(starsFor(0, 0), 1);
  assert.equal(masteryFor(null), "not-started");
  assert.equal(masteryFor(0.5), "needs-practice");
  assert.equal(masteryFor(0.6), "good");
  assert.equal(masteryFor(0.85), "mastered");
  assert.equal(unlocksNext(0.59), false);
  assert.equal(unlocksNext(0.6), true);
  assert.equal(dailyGoalRatio(25), 0.5);
  assert.equal(dailyGoalRatio(500), 1);
});

test("badges are awarded once", () => {
  const stats = { lessonsCompleted: 1, perfectLessons: 0, bestCombo: 5, streak: 3, labsTried: ["a", "b", "a"], questionsAnswered: 4, level: 1 };
  const first = newBadges(stats, []);
  assert.deepEqual(first.sort(), ["combo-5", "first-lesson", "streak-3"].sort());
  assert.deepEqual(newBadges(stats, first), []);
  assert.ok(newBadges({ ...stats, labsTried: ["a", "b", "c"] }, first).includes("lab-explorer"));
});
