"use client";
import { useEffect, useRef, useState } from "react";
import { Tex } from "../../../components/Tex";
import { atomTable, isMinimalBalanced, isBalanced, toMhchem, type Equation } from "./chem";

export interface BalancerLabProps {
  eq: Equation;
  onInteract?: () => void;
  onSolved?: () => void;
}

/** Interactive equation balancer with a live atom-count table. Verified by code. */
export function BalancerLab({ eq, onInteract, onSolved }: BalancerLabProps) {
  const species = [...eq.reactants, ...eq.products];
  const [coefs, setCoefs] = useState<number[]>(() => species.map(() => 1));
  const solved = isMinimalBalanced(eq, coefs);
  const balancedNotMinimal = isBalanced(eq, coefs) && !solved;
  const fired = useRef(false);

  useEffect(() => {
    if (solved && !fired.current) {
      fired.current = true;
      onSolved?.();
    }
  }, [solved, onSolved]);

  const change = (i: number, d: number) => {
    setCoefs((c) => c.map((v, k) => (k === i ? Math.min(12, Math.max(1, v + d)) : v)));
    onInteract?.();
  };

  const cell = (i: number) => (
    <div key={i} className="flex flex-col items-center gap-1">
      <button type="button" aria-label="زيادة المعامل" onClick={() => change(i, 1)}
        className="h-9 w-9 rounded-full bg-navy-700 text-lg text-white hover:bg-brand">+</button>
      <div className="flex items-center gap-1 text-xl text-white" dir="ltr">
        <span className="min-w-[1.5ch] text-center font-bold text-cyan-300">{coefs[i]}</span>
        <Tex latex={toMhchem(species[i])} />
      </div>
      <button type="button" aria-label="تقليل المعامل" onClick={() => change(i, -1)}
        className="h-9 w-9 rounded-full bg-navy-700 text-lg text-white hover:bg-brand">−</button>
    </div>
  );

  const rows = atomTable(eq, coefs);
  const nR = eq.reactants.length;
  return (
    <div className="rounded-2xl border border-line bg-navy-800 p-4 text-white">
      <p className="mb-3 text-sm text-slate-300">{eq.nameAr}</p>
      <div className="flex flex-wrap items-center justify-center gap-3" dir="ltr">
        {species.slice(0, nR).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            {cell(i)}
            {i < nR - 1 && <span className="text-xl">+</span>}
          </div>
        ))}
        <span className="text-2xl text-cyan-300">→</span>
        {species.slice(nR).map((_, j) => (
          <div key={j} className="flex items-center gap-3">
            {cell(nR + j)}
            {j < species.length - nR - 1 && <span className="text-xl">+</span>}
          </div>
        ))}
      </div>
      <table className="mt-4 w-full text-center text-sm">
        <thead className="text-slate-400">
          <tr><th>العنصر</th><th>المتفاعلات</th><th>النواتج</th><th></th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.element} className={r.ok ? "text-emerald-300" : "text-rose-300"}>
              <td className="font-bold">{r.element}</td><td>{r.left}</td><td>{r.right}</td><td>{r.ok ? "✓" : "✗"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 min-h-[1.5rem] text-center font-bold" role="status">
        {solved && <span className="text-emerald-300">المعادلة موزونة بأبسط معاملات. أحسنت!</span>}
        {balancedNotMinimal && <span className="text-amber-300">موزونة، لكن يمكن تبسيط المعاملات أكثر.</span>}
      </p>
    </div>
  );
}
