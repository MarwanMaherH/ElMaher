import { test } from "node:test";
import assert from "node:assert/strict";

import { LESSONS, lessonById } from "../src/features/academy/content/lessons";
import { equationById } from "../src/features/science-lab/chemistry/chem";
import { ALL_TOPICS, generateQuestion, mulberry32 } from "../src/features/practice/questions";
import {
  initialProgress, addXp, recordQuestion, recordLab, completeLesson, isUnlocked, masteryOfLesson, localDate,
} from "../src/features/gamification/progress";

test("lesson content is internally consistent", () => {
  const ids = new Set<string>();
  for (const l of LESSONS) {
    assert.ok(!ids.has(l.id), `duplicate id ${l.id}`);
    ids.add(l.id);
    assert.ok(l.steps.length >= 4, l.id);
    assert.ok(l.steps.some((s) => s.type === "numeric" || s.type === "choice"), l.id);
    for (const s of l.steps) {
      if (s.type === "choice") {
        assert.ok(s.answer >= 0 && s.answer < s.options.length, `${l.id} choice answer`);
        assert.ok(s.options.length >= 2 && s.explain && s.hint);
      }
      if (s.type === "lab" && s.lab === "balance") assert.ok(equationById(s.eqId!), `${l.id} eq ${s.eqId}`);
      if (s.type === "numeric") {
        assert.ok(ALL_TOPICS.includes(s.topic));
        const q = generateQuestion(s.topic, s.level, mulberry32(1));
        assert.ok(Number.isFinite(q.answer));
      }
      if (s.type === "formula") assert.ok(s.symbols.length >= 2);
    }
  }
  assert.ok(LESSONS.some((l) => l.free) && LESSONS.some((l) => !l.free));
});

test("every lesson formula renders in KaTeX with mhchem", () => {
  let katex: any;
  try {
    katex = require("katex");
    require("katex/contrib/mhchem");
  } catch {
    console.log("katex not resolvable here; skipped");
    return;
  }
  for (const l of LESSONS) {
    for (const s of l.steps) {
      if (s.type === "formula") {
        const html = katex.renderToString(s.latex, { throwOnError: true, displayMode: true });
        assert.ok(html.includes("katex"), l.id);
      }
    }
  }
  assert.ok(katex.renderToString("\\ce{Ca(OH)2 + 2HCl -> CaCl2 + 2H2O}", { throwOnError: true }).includes("katex"));
});

test("progress: XP, daily counter, streak and badges move together", () => {
  let s = initialProgress();
  let r = addXp(s, 20, "2026-11-16");
  assert.equal(r.state.xp, 20);
  assert.equal(r.state.today.xp, 20);
  assert.equal(r.state.streak.count, 1);
  r = addXp(r.state, 10, "2026-11-16");
  assert.equal(r.state.today.xp, 30);
  assert.equal(r.state.streak.count, 1);
  r = addXp(r.state, 5, "2026-11-17");
  assert.equal(r.state.today.xp, 5, "daily counter resets on a new day");
  assert.equal(r.state.xp, 35);
  assert.equal(r.state.streak.count, 2);
});

test("completeLesson: first completion pays more, stars, perfect badge, best score only goes up", () => {
  let s = initialProgress();
  const a = completeLesson(s, { id: "x", firstTry: 4, total: 4 }, "2026-11-16");
  assert.equal(a.stars, 3);
  assert.equal(a.xpGained, 35);
  assert.ok(a.firstCompletion);
  assert.ok(a.badges.includes("first-lesson") && a.badges.includes("perfect"));
  const b = completeLesson(a.state, { id: "x", firstTry: 1, total: 4 }, "2026-11-16");
  assert.ok(!b.firstCompletion);
  assert.equal(b.xpGained, 5);
  assert.equal(b.state.lessons.x.best, 1, "a worse replay does not lower the best score");
  assert.equal(b.state.lessons.x.stars, 3);
  assert.equal(b.state.lessons.x.attempts, 2);
  assert.equal(completeLesson(s, { id: "y", firstTry: 0, total: 5 }, "2026-11-16").stars, 1);
  assert.equal(completeLesson(s, { id: "z", firstTry: 0, total: 0 }, "2026-11-16").score, 1);
});

test("path unlock needs a 'good' or better previous lesson", () => {
  const ids = ["a", "b", "c"];
  let s = initialProgress();
  assert.ok(isUnlocked(s, ids, 0));
  assert.ok(!isUnlocked(s, ids, 1));
  s = completeLesson(s, { id: "a", firstTry: 1, total: 4 }, "2026-11-16").state; // 0.25
  assert.ok(!isUnlocked(s, ids, 1));
  assert.equal(masteryOfLesson(s, "a"), "needs-practice");
  s = completeLesson(s, { id: "a", firstTry: 3, total: 4 }, "2026-11-16").state; // 0.75
  assert.ok(isUnlocked(s, ids, 1));
  assert.equal(masteryOfLesson(s, "a"), "good");
  assert.ok(!isUnlocked(s, ids, 2));
});

test("recordQuestion / recordLab", () => {
  let s = initialProgress();
  s = recordQuestion(s, { topic: "newton", firstTry: true, combo: 3 });
  s = recordQuestion(s, { topic: "newton", firstTry: false, combo: 0 });
  assert.equal(s.questionsAnswered, 2);
  assert.equal(s.bestCombo, 3);
  assert.deepEqual(s.adaptive.topics.newton, { seen: 2, correct: 1 });
  s = recordLab(recordLab(s, "projectile"), "projectile");
  assert.deepEqual(s.labsTried, ["projectile"]);
});

test("localDate formats as YYYY-MM-DD", () => {
  assert.equal(localDate(new Date(2026, 10, 5)), "2026-11-05");
});

test("lessonById", () => {
  assert.equal(lessonById("chem-ph")?.free, false);
  assert.equal(lessonById("nope"), undefined);
});
