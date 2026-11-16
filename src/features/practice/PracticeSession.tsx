"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ScoreHud } from "../../components/ScoreHud";
import { encourageRetry, praise, scoreCorrect, starsFor } from "../gamification/engine";
import { addXp, localDate, recordQuestion } from "../gamification/progress";
import { useProgress } from "../gamification/useProgress";
import { LESSON_FOR_TOPIC, lessonById } from "../academy/content/lessons";
import {
  ERROR_LABEL_AR, TOPIC_NAME_AR, gradeAnswer, nextQuestion, type ErrorType, type Question, type Topic,
} from "./questions";

const SESSION_LEN = 8;
const box = "rounded-2xl border border-line bg-navy-800 p-5 text-white";
const primary = "rounded-xl bg-brand px-5 py-2 font-bold text-white hover:opacity-90 disabled:opacity-40";

/** Short adaptive rounds: 8 questions, instant score, then a summary with the weakest topic. */
export function PracticeSession() {
  const [progress, update] = useProgress();
  const progressRef = useRef(progress);
  progressRef.current = progress;

  const [round, setRound] = useState(0);
  const [n, setN] = useState(0);
  const [q, setQ] = useState<Question | null>(null);
  const [value, setValue] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [hints, setHints] = useState(0);
  const [done, setDone] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [combo, setCombo] = useState(0);
  const [points, setPoints] = useState(0);
  const [firstTry, setFirstTry] = useState(0);
  const [errors, setErrors] = useState<Partial<Record<ErrorType, number>>>({});
  const [misses, setMisses] = useState<Partial<Record<Topic, number>>>({});
  const started = useRef(0);

  useEffect(() => {
    if (n >= SESSION_LEN) return;
    setQ(nextQuestion(progressRef.current.adaptive));
    setValue(""); setAttempts(0); setHints(0); setDone(false); setFeedback(null);
    started.current = Date.now();
  }, [n, round]);

  const hud = (
    <ScoreHud xp={progress.xp} xpToday={progress.today.date === localDate() ? progress.today.xp : 0}
      streak={progress.streak.count} combo={combo} sessionPoints={points} />
  );

  if (n >= SESSION_LEN) {
    const weakest = (Object.entries(misses) as [Topic, number][]).sort((a, b) => b[1] - a[1])[0]?.[0];
    const lesson = weakest ? lessonById(LESSON_FOR_TOPIC[weakest] ?? "") : undefined;
    const stars = starsFor(firstTry, SESSION_LEN);
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        {hud}
        <div className={`${box} text-center`}>
          <p className="text-5xl">{"⭐".repeat(stars)}{"☆".repeat(3 - stars)}</p>
          <h1 className="mt-3 text-2xl font-bold">انتهت الجولة</h1>
          <p className="mt-1 text-emerald-300">+{points} نقطة · من أول محاولة {firstTry}/{SESSION_LEN}</p>
          {Object.keys(errors).length > 0 && (
            <ul className="mt-4 space-y-1 text-sm text-slate-200">
              {(Object.entries(errors) as [ErrorType, number][]).map(([t, c]) => <li key={t}>{ERROR_LABEL_AR[t]}: {c}</li>)}
            </ul>
          )}
          {weakest && lesson && (
            <p className="mt-4 text-amber-300">محتاج مراجعة في {TOPIC_NAME_AR[weakest]}. <Link className="underline" href={`/lesson/${lesson.id}`}>افتح الدرس</Link></p>
          )}
          <div className="mt-5 flex justify-center gap-3">
            <button type="button" className={primary} onClick={() => {
              setN(0); setRound((r) => r + 1); setCombo(0); setPoints(0); setFirstTry(0); setErrors({}); setMisses({});
            }}>جولة جديدة</button>
            <Link href="/" className="rounded-xl bg-navy-700 px-5 py-2">المسار</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!q) return <div className="p-6 text-center text-white">…</div>;

  const finish = (ok: boolean, attempt: number) => {
    setDone(true);
    if (ok) {
      const sc = scoreCorrect({ attempt, hintsUsed: hints, seconds: (Date.now() - started.current) / 1000, combo });
      setCombo(sc.combo);
      setPoints((p) => p + sc.points);
      if (attempt === 1) setFirstTry((f) => f + 1);
      setFeedback({ ok: true, text: `${attempt === 1 ? praise(sc.combo) : "أحسنت"} +${sc.points}\n${q.solution}` });
      update((s) => recordQuestion(addXp(s, sc.points, localDate()).state, { topic: q.topic, firstTry: attempt === 1, combo: sc.combo }));
    } else {
      setCombo(0);
      setMisses((m) => ({ ...m, [q.topic]: (m[q.topic] ?? 0) + 1 }));
      setFeedback({ ok: false, text: `الحل: ${q.solution}` });
      update((s) => recordQuestion(s, { topic: q.topic, firstTry: false, combo: 0 }));
    }
  };

  const check = () => {
    const g = gradeAnswer(q, value);
    if (g.status === "invalid") return setFeedback({ ok: false, text: "اكتب رقمًا فقط." });
    const a = attempts + 1;
    setAttempts(a);
    if (g.status === "correct") return finish(true, a);
    setErrors((e) => ({ ...e, [g.type]: (e[g.type] ?? 0) + 1 }));
    setCombo(0);
    if (a >= 3) return finish(false, a);
    setFeedback({ ok: false, text: `${ERROR_LABEL_AR[g.type]}: ${g.message}\n${encourageRetry()}` });
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-4 p-4">
      {hud}
      <div className="flex items-center gap-3">
        <Link href="/" aria-label="خروج" className="text-slate-300">✕</Link>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-navy-700">
          <div className="h-full rounded-full bg-emerald-400 transition-all duration-500" style={{ width: `${(n / SESSION_LEN) * 100}%` }} />
        </div>
        <span className="text-sm text-slate-300">{n + 1}/{SESSION_LEN}</span>
      </div>
      <div className={box}>
        <p className="mb-1 text-sm text-cyan-300">{TOPIC_NAME_AR[q.topic]}</p>
        <p className="mb-4 text-lg font-bold">{q.text}</p>
        <div className="flex flex-wrap items-center gap-2">
          <input inputMode="decimal" dir="ltr" value={value} disabled={done} onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (done ? setN((x) => x + 1) : check())} placeholder="اكتب إجابتك" aria-label="الإجابة"
            className="w-40 rounded-xl border border-line bg-navy-900 px-3 py-2 text-white" />
          <span className="text-slate-300">{q.unit}</span>
          {!done && <button type="button" className={primary} disabled={!value.trim()} onClick={check}>تحقق</button>}
          {!done && hints < q.hints.length && <button type="button" className="text-sm text-cyan-300 underline" onClick={() => setHints((h) => h + 1)}>تلميح</button>}
        </div>
        {hints > 0 && <ul className="mt-3 space-y-1 text-amber-300">{q.hints.slice(0, hints).map((h, i) => <li key={i}>💡 {h}</li>)}</ul>}
        {feedback && <p className={`mt-3 whitespace-pre-line ${feedback.ok ? "text-emerald-300" : "text-rose-300"}`} role="status">{feedback.text}</p>}
      </div>
      {done && <button type="button" className={`${primary} w-full py-3 text-lg`} onClick={() => setN((x) => x + 1)}>{n + 1 === SESSION_LEN ? "النتيجة" : "السؤال التالي"}</button>}
    </div>
  );
}
