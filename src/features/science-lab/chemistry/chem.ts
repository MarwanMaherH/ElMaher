/**
 * Chemistry core: formula parsing and equation balancing.
 * Pure TypeScript, no dependencies. The answer is always verified by code,
 * never by an AI model.
 */

export type Counts = Record<string, number>;

/** Parse a formula such as "Ca(OH)2" into { Ca: 1, O: 2, H: 2 }. */
export function parseFormula(formula: string): Counts {
  let i = 0;

  const readNum = (): number => {
    let s = "";
    while (i < formula.length && formula[i] >= "0" && formula[i] <= "9") s += formula[i++];
    return s ? parseInt(s, 10) : 1;
  };

  const readGroup = (closing: boolean): Counts => {
    const out: Counts = {};
    while (i < formula.length) {
      const c = formula[i];
      if (c === "(") {
        i++;
        const inner = readGroup(true);
        const n = readNum();
        for (const k in inner) out[k] = (out[k] ?? 0) + inner[k] * n;
      } else if (c === ")") {
        if (!closing) throw new Error(`Unbalanced parenthesis in ${formula}`);
        i++;
        return out;
      } else if (c >= "A" && c <= "Z") {
        let el = c;
        i++;
        while (i < formula.length && formula[i] >= "a" && formula[i] <= "z") el += formula[i++];
        const n = readNum();
        out[el] = (out[el] ?? 0) + n;
      } else {
        throw new Error(`Unexpected '${c}' in ${formula}`);
      }
    }
    if (closing) throw new Error(`Unclosed parenthesis in ${formula}`);
    return out;
  };

  return readGroup(false);
}

export interface Equation {
  id: string;
  nameAr: string;
  reactants: string[];
  products: string[];
  /** 1 = easy, 3 = hard */
  difficulty: 1 | 2 | 3;
  /** Known minimal coefficients, reactants then products (used by tests). */
  expected: number[];
}

export function sideCounts(formulas: string[], coefs: number[], offset = 0): Counts {
  const total: Counts = {};
  formulas.forEach((f, idx) => {
    const c = coefs[offset + idx] ?? 0;
    const counts = parseFormula(f);
    for (const el in counts) total[el] = (total[el] ?? 0) + counts[el] * c;
  });
  return total;
}

export interface ElementRow {
  element: string;
  left: number;
  right: number;
  ok: boolean;
}

/** Per-element atom counts on both sides, for the live table in the lab. */
export function atomTable(eq: Equation, coefs: number[]): ElementRow[] {
  const left = sideCounts(eq.reactants, coefs, 0);
  const right = sideCounts(eq.products, coefs, eq.reactants.length);
  const elements = Array.from(new Set([...Object.keys(left), ...Object.keys(right)]));
  return elements.map((element) => ({
    element,
    left: left[element] ?? 0,
    right: right[element] ?? 0,
    ok: (left[element] ?? 0) === (right[element] ?? 0),
  }));
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

export function isBalanced(eq: Equation, coefs: number[]): boolean {
  if (coefs.some((c) => !Number.isInteger(c) || c < 1)) return false;
  return atomTable(eq, coefs).every((r) => r.ok);
}

/** Balanced AND in lowest terms (what the student is asked for). */
export function isMinimalBalanced(eq: Equation, coefs: number[]): boolean {
  if (!isBalanced(eq, coefs)) return false;
  return coefs.reduce(gcd) === 1;
}

/**
 * Find the smallest balanced coefficient set (lowest sum, gcd 1).
 * Brute force over 1..max per species: fine for the 2-5 species equations
 * a secondary-school course uses.
 */
export function solveBalance(eq: Equation, max = 12): number[] | null {
  const species = [...eq.reactants, ...eq.products];
  const n = species.length;
  const elements = new Set<string>();
  const parsed = species.map((f) => {
    const c = parseFormula(f);
    Object.keys(c).forEach((e) => elements.add(e));
    return c;
  });
  const els = Array.from(elements);
  // signed matrix: reactants positive, products negative
  const m = els.map((e) => parsed.map((c, j) => (c[e] ?? 0) * (j < eq.reactants.length ? 1 : -1)));

  let best: number[] | null = null;
  let bestSum = Infinity;
  const cur: number[] = new Array(n).fill(1);

  const rec = (j: number, sum: number) => {
    if (sum >= bestSum) return;
    if (j === n) {
      for (const row of m) {
        let s = 0;
        for (let k = 0; k < n; k++) s += row[k] * cur[k];
        if (s !== 0) return;
      }
      if (cur.reduce(gcd) !== 1) return;
      best = cur.slice();
      bestSum = sum;
      return;
    }
    for (let v = 1; v <= max; v++) {
      cur[j] = v;
      rec(j + 1, sum + v);
    }
  };
  rec(0, 0);
  return best;
}

export const EQUATIONS: Equation[] = [
  { id: "h2-o2", nameAr: "تكوين الماء", reactants: ["H2", "O2"], products: ["H2O"], difficulty: 1, expected: [2, 1, 2] },
  { id: "n2-h2", nameAr: "تحضير الأمونيا", reactants: ["N2", "H2"], products: ["NH3"], difficulty: 1, expected: [1, 3, 2] },
  { id: "ch4-o2", nameAr: "احتراق الميثان", reactants: ["CH4", "O2"], products: ["CO2", "H2O"], difficulty: 1, expected: [1, 2, 1, 2] },
  { id: "fe-o2", nameAr: "صدأ الحديد", reactants: ["Fe", "O2"], products: ["Fe2O3"], difficulty: 2, expected: [4, 3, 2] },
  { id: "al-o2", nameAr: "أكسدة الألومنيوم", reactants: ["Al", "O2"], products: ["Al2O3"], difficulty: 2, expected: [4, 3, 2] },
  { id: "al-hcl", nameAr: "الألومنيوم مع حمض الهيدروكلوريك", reactants: ["Al", "HCl"], products: ["AlCl3", "H2"], difficulty: 2, expected: [2, 6, 2, 3] },
  { id: "caoh2-hcl", nameAr: "تعادل هيدروكسيد الكالسيوم", reactants: ["Ca(OH)2", "HCl"], products: ["CaCl2", "H2O"], difficulty: 2, expected: [1, 2, 1, 2] },
  { id: "c3h8-o2", nameAr: "احتراق البروبان", reactants: ["C3H8", "O2"], products: ["CO2", "H2O"], difficulty: 3, expected: [1, 5, 3, 4] },
  { id: "fe2o3-co", nameAr: "اختزال أكسيد الحديد", reactants: ["Fe2O3", "CO"], products: ["Fe", "CO2"], difficulty: 3, expected: [1, 3, 2, 3] },
  { id: "c2h6-o2", nameAr: "احتراق الإيثان", reactants: ["C2H6", "O2"], products: ["CO2", "H2O"], difficulty: 3, expected: [2, 7, 4, 6] },
];

export const equationById = (id: string): Equation | undefined => EQUATIONS.find((e) => e.id === id);

/** Formula -> LaTeX for KaTeX+mhchem, e.g. "Ca(OH)2" -> "\\ce{Ca(OH)2}". */
export const toMhchem = (formula: string): string => `\\ce{${formula}}`;
