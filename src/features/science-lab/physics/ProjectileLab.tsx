"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { GRAVITY, projectile, type Planet, type ProjectileResult } from "./physics";

const W = 640;
const H = 300;
const PAD = 36;

const PLANETS: { id: Planet; label: string }[] = [
  { id: "earth", label: "الأرض" },
  { id: "moon", label: "القمر" },
  { id: "mars", label: "المريخ" },
];

function draw(ctx: CanvasRenderingContext2D, res: ProjectileResult, h: number, angle: number, t: number) {
  ctx.clearRect(0, 0, W, H);
  const worldW = Math.max(res.range * 1.1, 10);
  const worldH = Math.max(res.maxHeight * 1.25, 5);
  const s = Math.min((W - PAD * 2) / worldW, (H - PAD * 2) / worldH);
  const X = (x: number) => PAD + x * s;
  const Y = (y: number) => H - PAD - y * s;

  ctx.strokeStyle = "#64748b";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, Y(0));
  ctx.lineTo(W, Y(0));
  ctx.stroke();

  // full predicted path (dashed)
  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = "#60a5fa";
  ctx.beginPath();
  for (let i = 0; i <= 80; i++) {
    const p = res.at((res.flightTime * i) / 80);
    if (i === 0) ctx.moveTo(X(p.x), Y(p.y));
    else ctx.lineTo(X(p.x), Y(p.y));
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // apex and landing markers
  const apex = res.at(res.timeToPeak);
  ctx.fillStyle = "#22d3ee";
  ctx.beginPath();
  ctx.arc(X(apex.x), Y(apex.y), 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#34d399";
  ctx.beginPath();
  ctx.arc(X(res.range), Y(0), 5, 0, Math.PI * 2);
  ctx.fill();

  // launch vector
  const a = (angle * Math.PI) / 180;
  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(X(0), Y(h));
  ctx.lineTo(X(0) + Math.cos(a) * 40, Y(h) - Math.sin(a) * 40);
  ctx.stroke();

  // ball and trail
  ctx.fillStyle = "rgba(251,191,36,0.4)";
  for (let i = 0; i < 20; i++) {
    const p = res.at((t * i) / 20);
    ctx.beginPath();
    ctx.arc(X(p.x), Y(p.y), 2, 0, Math.PI * 2);
    ctx.fill();
  }
  const ball = res.at(t);
  ctx.fillStyle = "#fbbf24";
  ctx.beginPath();
  ctx.arc(X(ball.x), Y(ball.y), 8, 0, Math.PI * 2);
  ctx.fill();
}

function Slider({ label, value, min, max, step, unit, onChange }: {
  label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (v: number) => void;
}) {
  return (
    <label className="block text-sm text-slate-200">
      <span className="flex justify-between"><span>{label}</span><span dir="ltr" className="font-bold text-cyan-300">{value} {unit}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-brand" />
    </label>
  );
}

export function ProjectileLab({ onInteract }: { onInteract?: () => void }) {
  const [v, setV] = useState(20);
  const [angle, setAngle] = useState(30);
  const [h, setH] = useState(0);
  const [planet, setPlanet] = useState<Planet>("earth");
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);

  const res = useMemo(() => projectile({ v, angle, h, g: GRAVITY[planet] }), [v, angle, h, planet]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const start = performance.now();
    const speed = Math.max(1, res.flightTime / 4);
    const loop = (now: number) => {
      const tt = ((now - start) / 1000) * speed;
      if (tt >= res.flightTime) {
        setT(res.flightTime);
        setPlaying(false);
        return;
      }
      setT(tt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, res]);

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (ctx) draw(ctx, res, h, angle, t);
  }, [res, h, angle, t]);

  const set = <T,>(fn: (x: T) => void) => (x: T) => {
    setPlaying(false);
    setT(0);
    fn(x);
    onInteract?.();
  };

  return (
    <div className="rounded-2xl border border-line bg-navy-800 p-4 text-white">
      <canvas ref={canvas} width={W} height={H} className="w-full rounded-xl bg-navy-900" role="img"
        aria-label="مسار المقذوف" />
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Slider label="السرعة" value={v} min={5} max={50} step={1} unit="م/ث" onChange={set(setV)} />
        <Slider label="الزاوية" value={angle} min={5} max={85} step={1} unit="°" onChange={set(setAngle)} />
        <Slider label="الارتفاع الابتدائي" value={h} min={0} max={30} step={1} unit="م" onChange={set(setH)} />
        <div className="flex items-center gap-2 text-sm">
          {PLANETS.map((p) => (
            <button key={p.id} type="button" onClick={() => set(setPlanet)(p.id)}
              className={`rounded-full px-3 py-1 ${planet === p.id ? "bg-brand text-white" : "bg-navy-700 text-slate-200"}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-xl bg-navy-700 p-2"><div className="text-slate-400">المدى</div><div dir="ltr" className="font-bold text-emerald-300">{res.range.toFixed(1)} م</div></div>
        <div className="rounded-xl bg-navy-700 p-2"><div className="text-slate-400">زمن التحليق</div><div dir="ltr" className="font-bold text-cyan-300">{res.flightTime.toFixed(2)} ث</div></div>
        <div className="rounded-xl bg-navy-700 p-2"><div className="text-slate-400">أقصى ارتفاع</div><div dir="ltr" className="font-bold text-amber-300">{res.maxHeight.toFixed(1)} م</div></div>
      </div>
      <button type="button" onClick={() => { setT(0); setPlaying(true); onInteract?.(); }}
        className="mt-3 w-full rounded-xl bg-brand py-2 font-bold text-white hover:opacity-90">إطلاق 🚀</button>
    </div>
  );
}
