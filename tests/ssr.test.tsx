/**
 * Server-render smoke tests: every component renders without throwing and
 * contains the expected Arabic text. (Browser interactions need Playwright
 * or Testing Library in the real project.)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToString as rts } from "react-dom/server";

/** React inserts <!-- --> between adjacent text nodes; strip it for text assertions. */
const renderToString = (el: Parameters<typeof rts>[0]) => rts(el).replace(/<!-- -->/g, "");

import { Tex } from "../src/components/Tex";
import { ScoreHud } from "../src/components/ScoreHud";
import { BalancerLab } from "../src/features/science-lab/chemistry/BalancerLab";
import { ProjectileLab } from "../src/features/science-lab/physics/ProjectileLab";
import { LessonPlayer } from "../src/features/academy/LessonPlayer";
import { PathView } from "../src/features/academy/PathView";
import { PracticeSession } from "../src/features/practice/PracticeSession";
import { LESSONS } from "../src/features/academy/content/lessons";
import { equationById } from "../src/features/science-lab/chemistry/chem";

test("Tex renders formulas and chemistry", () => {
  assert.ok(renderToString(<Tex latex="F = m \times a" />).includes("katex"));
  assert.ok(renderToString(<Tex latex={"\\ce{H2SO4}"} />).includes("katex"));
});

test("ScoreHud shows level, streak and combo", () => {
  const html = renderToString(<ScoreHud xp={120} xpToday={30} streak={4} combo={5} sessionPoints={12} />);
  assert.ok(html.includes("المستوى 2"));
  assert.ok(html.includes("🔥"));
  assert.ok(html.includes("كومبو"));
  assert.ok(html.includes("+12"));
});

test("BalancerLab renders the equation and atom table", () => {
  const html = renderToString(<BalancerLab eq={equationById("ch4-o2")!} />);
  assert.ok(html.includes("احتراق الميثان"));
  assert.ok(html.includes("العنصر"));
});

test("ProjectileLab renders controls and readouts", () => {
  const html = renderToString(<ProjectileLab />);
  assert.ok(html.includes("إطلاق"));
  assert.ok(html.includes("المدى"));
  assert.ok(html.includes("<canvas"));
});

test("LessonPlayer renders the first step of every free lesson and a lock for premium", () => {
  for (const l of LESSONS) {
    const html = renderToString(<LessonPlayer lesson={l} />);
    if (l.free) {
      assert.ok(html.includes("متابعة"), l.id);
      assert.ok(html.includes("1/" + l.steps.length), l.id);
    } else {
      assert.ok(html.includes("Premium"), l.id);
    }
  }
});

test("PathView shows onboarding for a new student; PracticeSession renders", () => {
  assert.ok(renderToString(<PathView />).includes("ابدأ"));
  assert.ok(typeof renderToString(<PracticeSession />) === "string");
});
