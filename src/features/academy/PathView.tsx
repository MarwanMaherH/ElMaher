"use client";
import Link from "next/link";
import { useState } from "react";
import { ScoreHud } from "../../components/ScoreHud";
import { MASTERY_LABEL_AR } from "../gamification/engine";
import { isUnlocked, localDate, masteryOfLesson } from "../gamification/progress";
import { useProgress } from "../gamification/useProgress";
import { lessonsOf } from "./content/lessons";
import type { Subject } from "../practice/questions";

const SUBJECTS: { id: Subject; nameAr: string; icon: string }[] = [
  { id: "physics", nameAr: "الفيزياء", icon: "⚛️" },
  { id: "chemistry", nameAr: "الكيمياء", icon: "🧪" },
];

function Onboarding() {
  const [, update] = useProgress();
  const [name, setName] = useState("");
  const [grade, setGrade] = useState<1 | 2 | 3>(3);
  return (
    <div className="mx-auto max-w-md space-y-4 p-6 text-white">
      <h1 className="text-3xl font-bold">ElMaher</h1>
      <p className="text-slate-300">افهم العلم. جرّبه بنفسك. مع مستر ماهر حمود</p>
      <div className="space-y-3 rounded-2xl border border-line bg-navy-800 p-5">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسمك" aria-label="الاسم"
          className="w-full rounded-xl border border-line bg-navy-900 px-3 py-2" />
        <div className="flex gap-2">
          {([1, 2, 3] as const).map((g) => (
            <button key={g} type="button" onClick={() => setGrade(g)}
              className={`flex-1 rounded-xl py-2 ${grade === g ? "bg-brand" : "bg-navy-700"}`}>{["الأول", "الثاني", "الثالث"][g - 1]} الثانوي</button>
          ))}
        </div>
        <button type="button" disabled={!name.trim()} onClick={() => update((s) => ({ ...s, user: { name: name.trim(), grade } }))}
          className="w-full rounded-xl bg-brand py-3 font-bold disabled:opacity-40">ابدأ</button>
      </div>
    </div>
  );
}

export function PathView() {
  const [progress, update] = useProgress();
  const [subject, setSubject] = useState<Subject>("physics");
  if (!progress.user) return <Onboarding />;

  const lessons = lessonsOf(subject);
  const ids = lessons.map((l) => l.id);
  const today = localDate();

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 text-white">
      <ScoreHud xp={progress.xp} xpToday={progress.today.date === today ? progress.today.xp : 0} streak={progress.streak.count} />
      <h1 className="text-xl font-bold">أهلًا {progress.user.name} 👋</h1>

      <div className="flex gap-2" role="tablist">
        {SUBJECTS.map((s) => (
          <button key={s.id} type="button" role="tab" aria-selected={subject === s.id} onClick={() => setSubject(s.id)}
            className={`flex-1 rounded-xl py-2 font-bold ${subject === s.id ? "bg-brand" : "bg-navy-700"}`}>{s.icon} {s.nameAr}</button>
        ))}
      </div>

      <ol className="space-y-3">
        {lessons.map((l, i) => {
          const rec = progress.lessons[l.id];
          const premiumLocked = !l.free && !progress.premium;
          const open = isUnlocked(progress, ids, i) && !premiumLocked;
          const mastery = masteryOfLesson(progress, l.id);
          const body = (
            <div className={`flex items-center gap-4 rounded-2xl border p-4 ${open ? "border-brand bg-navy-800" : "border-line bg-navy-800/50 opacity-70"}`}
              style={{ marginInlineStart: `${(i % 2) * 2}rem` }}>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-700 text-xl">
                {premiumLocked ? "🔒" : !open ? "⏳" : rec?.done ? "✓" : i + 1}
              </div>
              <div className="flex-1">
                <div className="font-bold">{l.titleAr}</div>
                <div className="text-sm text-slate-300">
                  {l.minutes} دقائق · {premiumLocked ? "Premium" : MASTERY_LABEL_AR[mastery]}
                </div>
              </div>
              {rec?.done && <div aria-label={`${rec.stars} نجوم`}>{"⭐".repeat(rec.stars)}</div>}
            </div>
          );
          return <li key={l.id}>{open ? <Link href={`/lesson/${l.id}`}>{body}</Link> : body}</li>;
        })}
      </ol>

      <Link href="/practice" className="block rounded-2xl bg-brand py-3 text-center text-lg font-bold">تدريب سريع ⚡</Link>
      {process.env.NODE_ENV === "development" && (
        <button type="button" className="text-xs text-slate-400 underline" onClick={() => update((s) => ({ ...s, premium: !s.premium }))}>
          [dev] Premium: {progress.premium ? "on" : "off"}
        </button>
      )}
    </div>
  );
}
