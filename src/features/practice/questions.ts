/**
 * Practice engine: randomized numeric questions, error classification,
 * and an adaptive difficulty "flow" so the student is neither bored nor lost.
 * Answers are computed by code and verified by code.
 */
import { EQUATIONS, solveBalance } from "../science-lab/chemistry/chem";

export type Topic = "newton" | "kinematics" | "projectile" | "moles" | "ph" | "ohm" | "balance";
export type Subject = "physics" | "chemistry";
export type ErrorType = "unit" | "law" | "substitution" | "sign" | "calc";
export type Level = 1 | 2 | 3;

export const TOPIC_SUBJECT: Record<Topic, Subject> = {
  newton: "physics",
  kinematics: "physics",
  projectile: "physics",
  ohm: "physics",
  moles: "chemistry",
  ph: "chemistry",
  balance: "chemistry",
};

export const TOPIC_NAME_AR: Record<Topic, string> = {
  newton: "قانون نيوتن الثاني",
  kinematics: "الحركة بعجلة منتظمة",
  projectile: "المقذوفات",
  ohm: "قانون أوم",
  moles: "المول",
  ph: "الرقم الهيدروجيني",
  balance: "موازنة المعادلات",
};

export const ERROR_LABEL_AR: Record<ErrorType, string> = {
  unit: "نسيان تحويل الوحدات",
  law: "اختيار قانون غير مناسب",
  substitution: "خطأ في التعويض",
  sign: "خطأ في الإشارة",
  calc: "خطأ حسابي",
};

export interface KnownError {
  value: number;
  type: ErrorType;
  /** shown to the student when this exact wrong value is entered */
  message: string;
}

export interface Question {
  topic: Topic;
  level: Level;
  /** Arabic statement */
  text: string;
  answer: number;
  unit: string;
  errors: KnownError[];
  /** progressive hints, from gentle to explicit */
  hints: string[];
  solution: string;
}

export type Rng = () => number;

/** Deterministic RNG (for tests and reproducible sessions). */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const int = (rng: Rng, lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));
const pick = <T>(rng: Rng, arr: T[]): T => arr[Math.floor(rng() * arr.length)];
const round = (x: number, d = 2) => Math.round(x * 10 ** d) / 10 ** d;

type Gen = (rng: Rng, level: Level) => Question;

const GENERATORS: Record<Topic, Gen> = {
  newton: (rng, level) => {
    const a = int(rng, 2, 9);
    if (level === 1) {
      const m = int(rng, 2, 12);
      return {
        topic: "newton", level,
        text: `جسم كتلته ${m} كجم يتحرك بعجلة ${a} م/ث². احسب القوة المحصلة المؤثرة عليه.`,
        answer: m * a, unit: "نيوتن",
        errors: [{ value: m / a, type: "law", message: "قسمت الكتلة على العجلة. القانون هو القوة = الكتلة × العجلة." }],
        hints: ["ما العلاقة بين القوة والكتلة والعجلة؟", "F = m × a"],
        solution: `F = m × a = ${m} × ${a} = ${m * a} نيوتن`,
      };
    }
    const g = int(rng, 2, 9) * 100;
    const kg = g / 1000;
    return {
      topic: "newton", level,
      text: `جسم كتلته ${g} جم يتحرك بعجلة ${a} م/ث². احسب القوة المحصلة بوحدة النيوتن.`,
      answer: round(kg * a, 3), unit: "نيوتن",
      errors: [
        { value: g * a, type: "unit", message: "نسيت تحويل الكتلة من جرام إلى كيلوجرام. القسمة على 1000 أولًا." },
        { value: round(kg / a, 3), type: "law", message: "قسمت الكتلة على العجلة. القانون هو F = m × a." },
      ],
      hints: ["الوحدة المطلوبة نيوتن، فالكتلة لازم تكون بالكيلوجرام.", `حوّل ${g} جم إلى كجم ثم طبّق F = m × a.`],
      solution: `m = ${g} ÷ 1000 = ${kg} كجم، F = m × a = ${kg} × ${a} = ${round(kg * a, 3)} نيوتن`,
    };
  },

  kinematics: (rng, level) => {
    const u = level === 1 ? 0 : int(rng, 2, 15);
    const a = int(rng, 2, 6);
    const t = int(rng, 2, 8);
    const answer = u + a * t;
    const errors: KnownError[] = [];
    if (u !== 0) errors.push({ value: a * t, type: "substitution", message: "نسيت إضافة السرعة الابتدائية u." });
    errors.push({ value: u - a * t, type: "sign", message: "الجسم يتسارع، فإشارة العجلة موجبة وتضاف للسرعة." });
    return {
      topic: "kinematics", level,
      text: u === 0
        ? `جسم يبدأ الحركة من السكون بعجلة ${a} م/ث². ما سرعته بعد ${t} ثوانٍ؟`
        : `جسم سرعته الابتدائية ${u} م/ث يتحرك بعجلة منتظمة ${a} م/ث². ما سرعته بعد ${t} ثوانٍ؟`,
      answer, unit: "م/ث", errors,
      hints: ["استخدم معادلة السرعة بعجلة منتظمة.", "v = u + a × t"],
      solution: `v = u + a × t = ${u} + ${a} × ${t} = ${answer} م/ث`,
    };
  },

  projectile: (rng, level) => {
    const v = int(rng, 10, 30);
    const angle = pick(rng, level === 1 ? [30, 45] : [15, 30, 45, 60, 75]);
    const g = 9.8;
    const sin2 = Math.sin((2 * angle * Math.PI) / 180);
    const answer = round((v * v * sin2) / g, 2);
    const sinOnce = Math.sin((angle * Math.PI) / 180);
    return {
      topic: "projectile", level,
      text: `قُذف جسم من سطح الأرض بسرعة ${v} م/ث بزاوية ${angle}° مع الأفقي. احسب المدى الأفقي (g = 9.8 م/ث²).`,
      answer, unit: "م",
      errors: [
        { value: round((v * v * sinOnce) / g, 2), type: "law", message: "استخدمت sinθ بدل sin2θ. مدى المقذوف يحتوي على sin2θ." },
        { value: round((v * sin2) / g, 2), type: "substitution", message: "نسيت تربيع السرعة v²." },
      ],
      hints: ["مدى المقذوف من الأرض له قانون واحد يربط v والزاوية وg.", "R = v² × sin(2θ) ÷ g"],
      solution: `R = v² sin2θ ÷ g = ${v}² × sin${2 * angle}° ÷ 9.8 = ${answer} م`,
    };
  },

  ohm: (rng, level) => {
    const R = int(rng, 2, 20) * 5;
    const mA = int(rng, 2, 9) * 50;
    const I = level === 1 ? mA / 1000 : mA / 1000;
    const answer = round(I * R, 3);
    if (level === 1) {
      const amps = int(rng, 1, 5);
      return {
        topic: "ohm", level,
        text: `مقاومة ${R} أوم يمر بها تيار ${amps} أمبير. احسب فرق الجهد بين طرفيها.`,
        answer: amps * R, unit: "فولت",
        errors: [{ value: round(R / amps, 3), type: "law", message: "قسمت المقاومة على التيار. القانون V = I × R." }],
        hints: ["قانون أوم يربط الجهد والتيار والمقاومة.", "V = I × R"],
        solution: `V = I × R = ${amps} × ${R} = ${amps * R} فولت`,
      };
    }
    return {
      topic: "ohm", level,
      text: `مقاومة ${R} أوم يمر بها تيار ${mA} مللي أمبير. احسب فرق الجهد بين طرفيها بالفولت.`,
      answer, unit: "فولت",
      errors: [
        { value: mA * R, type: "unit", message: "نسيت تحويل المللي أمبير إلى أمبير (القسمة على 1000)." },
        { value: round(R / I, 3), type: "law", message: "القانون V = I × R وليس بالقسمة." },
      ],
      hints: ["الجهد بالفولت يحتاج تيارًا بالأمبير.", `${mA} مللي أمبير = ${I} أمبير، ثم V = I × R.`],
      solution: `I = ${mA} ÷ 1000 = ${I} أمبير، V = I × R = ${I} × ${R} = ${answer} فولت`,
    };
  },

  moles: (rng, level) => {
    const cmpds = [
      { f: "H₂O", M: 18 },
      { f: "CO₂", M: 44 },
      { f: "CH₄", M: 16 },
      { f: "O₂", M: 32 },
      { f: "NaOH", M: 40 },
    ];
    const c = pick(rng, cmpds);
    const n = level === 1 ? int(rng, 1, 4) : int(rng, 1, 8) / 2;
    const mass = c.M * n;
    return {
      topic: "moles", level,
      text: `كم عدد مولات ${mass} جم من ${c.f}؟ (الكتلة المولية = ${c.M} جم/مول)`,
      answer: n, unit: "مول",
      errors: [
        { value: mass * c.M, type: "law", message: "ضربت الكتلة في الكتلة المولية. عدد المولات = الكتلة ÷ الكتلة المولية." },
        { value: round(c.M / mass, 3), type: "law", message: "قلبت النسبة. الكتلة في البسط والكتلة المولية في المقام." },
      ],
      hints: ["عدد المولات يربط الكتلة بالكتلة المولية.", "n = m ÷ M"],
      solution: `n = m ÷ M = ${mass} ÷ ${c.M} = ${n} مول`,
    };
  },

  ph: (rng, level) => {
    const k = int(rng, 1, level === 1 ? 6 : 12);
    return {
      topic: "ph", level,
      text: `محلول تركيز أيون الهيدروجين فيه [H⁺] = 10^-${k} مول/لتر. ما قيمة pH؟`,
      answer: k, unit: "",
      errors: [
        { value: -k, type: "sign", message: "pH = −log[H⁺]، والسالب يلغي سالب الأس فتكون النتيجة موجبة." },
        { value: 14 - k, type: "law", message: "هذه قيمة pOH. المطلوب pH." },
      ],
      hints: ["pH يُحسب من لوغاريتم تركيز H⁺.", "pH = −log₁₀[H⁺]"],
      solution: `pH = −log(10^-${k}) = ${k}`,
    };
  },

  balance: (rng, level) => {
    const pool = EQUATIONS.filter((e) => e.difficulty <= level);
    const eq = pick(rng, pool);
    const coefs = solveBalance(eq)!;
    const species = [...eq.reactants, ...eq.products];
    const idx = int(rng, 0, species.length - 1);
    const lhs = eq.reactants.join(" + ");
    const rhs = eq.products.join(" + ");
    return {
      topic: "balance", level,
      text: `وازن المعادلة: ${lhs} → ${rhs}. ما معامل ${species[idx]} في الصورة الصغرى؟`,
      answer: coefs[idx], unit: "",
      errors: [{ value: 1, type: "substitution", message: "تركت المعامل 1 بدون موازنة. اعدّ ذرات كل عنصر على الطرفين." }],
      hints: ["ابدأ بالعنصر الذي يظهر في مركب واحد على كل طرف.", "اترك الأكسجين أو الهيدروجين للنهاية إن أمكن."],
      solution: `المعاملات بالترتيب: ${coefs.join(" , ")}، إذن معامل ${species[idx]} = ${coefs[idx]}`,
    };
  },
};

export const ALL_TOPICS = Object.keys(GENERATORS) as Topic[];

const close = (a: number, b: number, tol = 0.015) => Math.abs(a - b) <= Math.max(Math.abs(b) * tol, 0.006);

export const generateQuestion = (topic: Topic, level: Level, rng: Rng = Math.random): Question => {
  const q = GENERATORS[topic](rng, level);
  // a "known wrong answer" that equals the right one (e.g. coefficient 1) is not an error
  return { ...q, errors: q.errors.filter((e) => !close(e.value, q.answer)) };
};

// ---------------------------------------------------------------- grading

export type Grade =
  | { status: "invalid" }
  | { status: "correct" }
  | { status: "wrong"; type: ErrorType; message: string };

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Accepts Latin or Arabic-Indic digits, "," or "٫" as decimal separator. */
export function parseAnswer(raw: string): number {
  const s = raw
    .trim()
    .replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)))
    .replace(/[,٫]/g, ".")
    .replace(/[−–]/g, "-");
  if (!/^-?\d+(\.\d+)?$/.test(s)) return NaN;
  return parseFloat(s);
}

export function gradeAnswer(q: Question, raw: string): Grade {
  const v = parseAnswer(raw);
  if (!Number.isFinite(v)) return { status: "invalid" };
  if (close(v, q.answer)) return { status: "correct" };
  for (const e of q.errors) {
    if (close(v, e.value)) return { status: "wrong", type: e.type, message: e.message };
  }
  return {
    status: "wrong",
    type: "calc",
    message: "الناتج غير صحيح. راجع خطوات الحساب وتأكد من الوحدات.",
  };
}

// ---------------------------------------------------------------- adaptive flow

export interface TopicStat {
  seen: number;
  correct: number;
}

export interface AdaptiveState {
  level: Level;
  streakCorrect: number;
  streakWrong: number;
  topics: Partial<Record<Topic, TopicStat>>;
  lastTopic?: Topic;
}

export const newAdaptiveState = (): AdaptiveState => ({
  level: 1,
  streakCorrect: 0,
  streakWrong: 0,
  topics: {},
});

/** 3 first-try wins in a row -> harder; 2 misses in a row -> easier. */
export function updateAdaptive(s: AdaptiveState, topic: Topic, firstTryCorrect: boolean): AdaptiveState {
  const prev = s.topics[topic] ?? { seen: 0, correct: 0 };
  const next: AdaptiveState = {
    ...s,
    lastTopic: topic,
    topics: { ...s.topics, [topic]: { seen: prev.seen + 1, correct: prev.correct + (firstTryCorrect ? 1 : 0) } },
    streakCorrect: firstTryCorrect ? s.streakCorrect + 1 : 0,
    streakWrong: firstTryCorrect ? 0 : s.streakWrong + 1,
  };
  if (next.streakCorrect >= 3 && next.level < 3) {
    next.level = (next.level + 1) as Level;
    next.streakCorrect = 0;
  }
  if (next.streakWrong >= 2 && next.level > 1) {
    next.level = (next.level - 1) as Level;
    next.streakWrong = 0;
  }
  return next;
}

/**
 * Next topic: weak topics are chosen more often, unseen topics get a boost,
 * and the same topic is never repeated twice in a row (variety).
 */
export function pickTopic(s: AdaptiveState, rng: Rng = Math.random, allowed: Topic[] = ALL_TOPICS): Topic {
  const pool = allowed.length > 1 ? allowed.filter((t) => t !== s.lastTopic) : allowed;
  const weights = pool.map((t) => {
    const st = s.topics[t];
    if (!st || st.seen === 0) return 2;
    return 1 + (1 - st.correct / st.seen) * 3;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

export function nextQuestion(s: AdaptiveState, rng: Rng = Math.random, allowed?: Topic[]): Question {
  const topic = pickTopic(s, rng, allowed);
  return generateQuestion(topic, s.level, rng);
}
