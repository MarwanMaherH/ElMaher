import { dailyGoalRatio, levelProgress, DEFAULT_DAILY_GOAL } from "../features/gamification/engine";

function Ring({ ratio }: { ratio: number }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <svg width="38" height="38" viewBox="0 0 38 38" aria-hidden>
      <circle cx="19" cy="19" r={r} fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="4" />
      <circle
        cx="19" cy="19" r={r} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - ratio)} transform="rotate(-90 19 19)"
      />
    </svg>
  );
}

export interface ScoreHudProps {
  xp: number;
  xpToday: number;
  streak: number;
  combo?: number;
  sessionPoints?: number;
}

/** Always-visible score strip: level, XP, daily goal ring, streak, combo. */
export function ScoreHud({ xp, xpToday, streak, combo = 0, sessionPoints }: ScoreHudProps) {
  const lp = levelProgress(xp);
  const goal = dailyGoalRatio(xpToday);
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-navy-800 px-4 py-2 text-sm text-white">
      <div className="flex min-w-[9rem] flex-1 flex-col gap-1">
        <div className="flex justify-between">
          <span className="font-bold">المستوى {lp.level}</span>
          <span className="text-slate-300">{xp} XP</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-navy-700" role="progressbar" aria-valuenow={Math.round(lp.ratio * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${lp.ratio * 100}%` }} />
        </div>
      </div>
      <div className="flex items-center gap-1 text-cyan-300" title={`الهدف اليومي ${DEFAULT_DAILY_GOAL} XP`}>
        <Ring ratio={goal} />
        <span className="text-xs">{Math.min(xpToday, DEFAULT_DAILY_GOAL)}/{DEFAULT_DAILY_GOAL}</span>
      </div>
      <div className="rounded-xl bg-navy-700 px-3 py-1 font-bold text-amber-300" title="أيام التعلم المتتالية">🔥 {streak}</div>
      {combo >= 2 && (
        <div className="animate-pulse rounded-xl bg-brand/20 px-3 py-1 font-bold text-cyan-300">كومبو ×{combo}</div>
      )}
      {sessionPoints !== undefined && <div className="font-bold text-emerald-300">+{sessionPoints}</div>}
    </div>
  );
}
