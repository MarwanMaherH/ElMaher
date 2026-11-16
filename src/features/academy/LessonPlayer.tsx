"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Tex } from "../../components/Tex";
import { ScoreHud } from "../../components/ScoreHud";
import { BalancerLab } from "../science-lab/chemistry/BalancerLab";
import { equationById } from "../science-lab/chemistry/chem";
import { ProjectileLab } from "../science-lab/physics/ProjectileLab";
import { gradeAnswer, generateQuestion, ERROR_LABEL_AR, type Question } from "../practice/questions";
import { BADGES, encourageRetry, praise, scoreCorrect } from "../gamification/engine";
import { addXp, completeLesson, localDate, noteCombo, recordLab, recordQuestion, type LessonResult } from "../gamification/progress";
import { useProgress } from "../gamification/useProgress";
import { LESSONS } from "./content/lessons";
import type { Lesson, Step } from "../../types/content";

interface Correct { attempt: number; hints: number; seconds: number }

const card = "rounded-2xl border border-line bg-navy-800 p-5 text-white";
const primary = "rounded-xl bg-brand px-5 py-2 font-bold text-white hover:opacity-90 disabled:opacity-40";

// ------------------------------------------------------------------ steps

function ChoiceStep({ step, onCorrect, onMiss }: {
  step: Extract<Step, { type: "choice" }>; onCorrect: (c: Correct) => void; onMiss: () => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [hints, setHints] = useState(0);
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState("");
  const started = useRef(Date.now());

  const check = () => {
    if (picked === null || done) return;
    const n = attempts + 1;
    setAttempts(n);
    if (picked === step.answer) {
      setDone(true);
      setMsg("");
      onCorrect({ attempt: n, hints, seconds: (Date.now() - started.current) / 1000 });
    } else {
      setMsg(encourageRetry());
      setPicked(null);
      onMiss();
    }
  };

  return (
    <div className={card}>
      <p className="mb-4 text-lg font-bold">{step.question}</p>
      <div className="grid gap-2">
        {step.options.map((o, i) => {
          const state = done && i === step.answer ? "border-emerald-400 bg-emerald-400/10" : picked === i ? "border-brand bg-brand/20" : "border-line bg-navy-700";
          return (
            <button key={i} type="button" disabled={done} onClick={() => setPicked(i)}
              className={`rounded-xl border px-4 py-3 text-start ${state}`}>{o}</button>
          );
        })}
      </div>
      {!done && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" className={primary} disabled={picked === null} onClick={check}>تحقق</button>
          <button type="button" className="text-sm text-cyan-300 underline" onClick={() => setHints(1)}>تلميح</button>
        </div>
      )}
      {hints > 0 && !done && <p className="mt-3 text-amber-300">💡 {step.hint}</p>}
      {msg && <p className="mt-3 text-amber-300" role="status">{msg}</p>}
      {done && <p className="mt-3 text-emerald-300" role="status">{step.explain}</p>}
    </div>
  );
}

function NumericStep({ step, onCorrect, onMiss, onGiveUp }: {
  step: Extract<Step, { type: "numeric" }>; onCorrect: (c: Correct & { topic: Question["topic"] }) => void;
  onMiss: () => void; onGiveUp: (topic: Question["topic"]) => void;
}) {
  // generated after mount so the server and client markup match
  const [q, setQ] = useState<Question | null>(null);
  const [value, setValue] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [hints, setHints] = useState(0);
  const [done, setDone] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const started = useRef(0);

  useEffect(() => {
    setQ(generateQuestion(step.topic, step.level));
    started.current = Date.now();
  }, [step.topic, step.level]);

  if (!q) return <div className={card}>…</div>;

  const check = () => {
    if (done) return;
    const g = gradeAnswer(q, value);
    if (g.status === "invalid") {
      setFeedback({ ok: false, text: "اكتب رقمًا فقط." });
      return;
    }
    const n = attempts + 1;
    setAttempts(n);
    if (g.status === "correct") {
      setDone(true);
      setFeedback({ ok: true, text: q.solution });
      onCorrect({ attempt: n, hints, seconds: (Date.now() - started.current) / 1000, topic: q.topic });
    } else {
      onMiss();
      if (n >= 3) {
        setDone(true);
        setFeedback({ ok: false, text: `الحل: ${q.solution}` });
        onGiveUp(q.topic);
      } else {
        setFeedback({ ok: false, text: `${ERROR_LABEL_AR[g.type]}: ${g.message}` });
      }
    }
  };

  return (
    <div className={card}>
      <p className="mb-4 text-lg font-bold">{q.text}</p>
      <div className="flex flex-wrap items-center gap-2">
        <input inputMode="decimal" value={value} disabled={done} onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && check()} placeholder="اكتب إجابتك" dir="ltr"
          className="w-40 rounded-xl border border-line bg-navy-900 px-3 py-2 text-white" aria-label="الإجابة" />
        <span className="text-slate-300">{q.unit}</span>
        {!done && <button type="button" className={primary} onClick={check} disabled={!value.trim()}>تحقق</button>}
        {!done && hints < q.hints.length && (
          <button type="button" className="text-sm text-cyan-300 underline" onClick={() => setHints((h) => h + 1)}>تلميح</button>
        )}
      </div>
      {hints > 0 && <ul className="mt-3 space-y-1 text-amber-300">{q.hints.slice(0, hints).map((h, i) => <li key={i}>💡 {h}</li>)}</ul>}
      {feedback && <p className={`mt-3 ${feedback.ok ? "text-emerald-300" : "text-rose-300"}`} role="status">{feedback.text}</p>}
    </div>
  );
}

function LabStep({ step, ready }: { step: Extract<Step, { type: "lab" }>; ready: () => void }) {
  const [, update] = useProgress();
  const touched = useRef(false);
  const interact = () => {
    if (touched.current) return;
    touched.current = true;
    update((s) => recordLab(s, step.lab === "balance" ? `balance:${step.eqId}` : step.lab));
    if (step.lab === "projectile") ready();
  };
  const eq = step.eqId ? equationById(step.eqId) : undefined;
  return (
    <div className="space-y-3">
      <p className={card}>{step.prompt}</p>
      {step.lab === "projectile" && <ProjectileLab onInteract={interact} />}
      {step.lab === "balance" && eq && <BalancerLab eq={eq} onInteract={interact} onSolved={ready} />}
    </div>
  );
}

function FormulaStep({ step }: { step: Extract<Step, { type: "formula" }> }) {
  return (
    <div className={card}>
      <h2 className="mb-3 text-lg font-bold">{step.title}</h2>
      <div className="my-4 text-center text-3xl text-cyan-300"><Tex latex={step.latex} display /></div>
      <table className="w-full text-sm">
        <tbody>
          {step.symbols.map((s) => (
            <tr key={s.sym} className="border-t border-line">
              <td className="py-2 font-bold text-cyan-300" dir="ltr">{s.sym}</td>
              <td className="py-2">{s.meaning}</td>
              <td className="py-2 text-slate-300">{s.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ------------------------------------------------------------------ player

function PlayerInner({ lesson }: { lesson: Lesson }) {
  const [progress, update] = useProgress();
  const [idx, setIdx] = useState(0);
  const [ready, setReady] = useState(false);
  const [sessionPoints, setSessionPoints] = useState(0);
  const [combo, setCombo] = useState(0);
  const [popup, setPopup] = useState<string | null>(null);
  const [result, setResult] = useState<LessonResult | null>(null);
  const tally = useRef({ graded: 0, firstTry: 0 });
  const comboRef = useRef(0);
  const finished = idx >= lesson.steps.length;
  const completed = useRef(false);

  const step = lesson.steps[idx];
  // read / formula steps need no interaction
  useEffect(() => {
    setReady(!!step && (step.type === "read" || step.type === "formula"));
  }, [idx, step]);

  useEffect(() => {
    if (!popup) return;
    const id = setTimeout(() => setPopup(null), 1600);
    return () => clearTimeout(id);
  }, [popup]);

  const miss = () => {
    comboRef.current = 0;
    setCombo(0);
  };

  const correct = (c: Correct & { topic?: Question["topic"] }) => {
    const sc = scoreCorrect({ attempt: c.attempt, hintsUsed: c.hints, seconds: c.seconds, combo: comboRef.current });
    comboRef.current = sc.combo;
    setCombo(sc.combo);
    tally.current.graded += 1;
    if (c.attempt === 1) tally.current.firstTry += 1;
    setSessionPoints((p) => p + sc.points);
    setPopup(`+${sc.points}  ${c.attempt === 1 ? praise(sc.combo) : "أحسنت، وصلت للحل"}`);
    update((s) => {
      let next = addXp(s, sc.points, localDate()).state;
      next = c.topic ? recordQuestion(next, { topic: c.topic, firstTry: c.attempt === 1, combo: sc.combo }) : noteCombo(next, sc.combo);
      return next;
    });
    setReady(true);
  };

  const giveUp = (topic: Question["topic"]) => {
    tally.current.graded += 1;
    update((s) => recordQuestion(s, { topic, firstTry: false, combo: 0 }));
    setReady(true);
  };

  // finish once
  useEffect(() => {
    if (!finished || completed.current) return;
    completed.current = true;
    update((s) => {
      const r = completeLesson(s, { id: lesson.id, firstTry: tally.current.firstTry, total: tally.current.graded }, localDate());
      setResult(r);
      return r.state;
    });
  }, [finished, lesson.id, update]);

  const hud = (
    <ScoreHud xp={progress.xp} xpToday={progress.today.date === localDate() ? progress.today.xp : 0}
      streak={progress.streak.count} combo={combo} sessionPoints={sessionPoints} />
  );

  if (finished) {
    const next = LESSONS.filter((l) => l.subject === lesson.subject)[LESSONS.filter((l) => l.subject === lesson.subject).findIndex((l) => l.id === lesson.id) + 1];
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        {hud}
        <div className={`${card} text-center`}>
          <p className="text-5xl" aria-label={`${result?.stars ?? 1} نجوم`}>{"⭐".repeat(result?.stars ?? 1)}{"☆".repeat(3 - (result?.stars ?? 1))}</p>
          <h1 className="mt-3 text-2xl font-bold">أنهيت درس {lesson.titleAr}</h1>
          <p className="mt-2 text-emerald-300">+{result?.xpGained ?? 0} XP</p>
          <p className="text-slate-300">من أول محاولة: {tally.current.firstTry} من {tally.current.graded}</p>
          {result && result.badges.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {result.badges.map((id) => <span key={id} className="rounded-full bg-amber-400/20 px-3 py-1 text-amber-300">🏅 {BADGES.find((b) => b.id === id)?.nameAr}</span>)}
            </div>
          )}
          {result && result.score < 0.6 && <p className="mt-3 text-amber-300">راجع الدرس مرة تانية لفتح الدرس التالي.</p>}
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/" className="rounded-xl bg-navy-700 px-5 py-2">المسار</Link>
            <Link href="/practice" className="rounded-xl bg-navy-700 px-5 py-2">تدريب إضافي</Link>
            {next && <Link href={`/lesson/${next.id}`} className={primary}>الدرس التالي</Link>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-4 p-4">
      {hud}
      <div className="flex items-center gap-3">
        <Link href="/" aria-label="خروج" className="text-slate-300">✕</Link>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-navy-700" role="progressbar"
          aria-valuenow={idx} aria-valuemin={0} aria-valuemax={lesson.steps.length}>
          <div className="h-full rounded-full bg-emerald-400 transition-all duration-500" style={{ width: `${(idx / lesson.steps.length) * 100}%` }} />
        </div>
        <span className="text-sm text-slate-300">{idx + 1}/{lesson.steps.length}</span>
      </div>

      <div key={`${lesson.id}-${idx}`} className="flex-1">
        {step.type === "read" && <div className={card}><h2 className="mb-2 text-xl font-bold">{step.title}</h2><p className="leading-8">{step.body}</p></div>}
        {step.type === "formula" && <FormulaStep step={step} />}
        {step.type === "lab" && <LabStep step={step} ready={() => setReady(true)} />}
        {step.type === "choice" && <ChoiceStep step={step} onCorrect={correct} onMiss={miss} />}
        {step.type === "numeric" && <NumericStep step={step} onCorrect={correct} onMiss={miss} onGiveUp={giveUp} />}
      </div>

      {popup && <div className="pointer-events-none fixed inset-x-0 top-24 text-center text-2xl font-bold text-emerald-300 animate-bounce" role="status">{popup}</div>}

      <button type="button" className={`${primary} w-full py-3 text-lg`} disabled={!ready} onClick={() => setIdx((i) => i + 1)}>
        {idx === lesson.steps.length - 1 ? "إنهاء الدرس" : "متابعة"}
      </button>
    </div>
  );
}

/** Premium lessons show a lock card instead of the player. */
export function LessonPlayer({ lesson }: { lesson: Lesson }) {
  const [progress] = useProgress();
  if (!lesson.free && !progress.premium) {
    return (
      <div className="mx-auto max-w-md p-6">
        <div className={`${card} text-center`}>
          <p className="text-4xl">🔒</p>
          <h1 className="mt-2 text-xl font-bold">{lesson.titleAr}</h1>
          <p className="mt-2 text-slate-300">هذا الدرس ضمن ElMaher Premium.</p>
          <Link href="/" className={`${primary} mt-4 inline-block`}>رجوع للمسار</Link>
        </div>
      </div>
    );
  }
  return <PlayerInner lesson={lesson} />;
}
