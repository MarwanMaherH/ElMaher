/**
 * SAMPLE lesson content to prove the lesson engine end to end.
 * It is not the final Egyptian curriculum: Mr. Maher and the team review and
 * replace the text, and the unit/lesson split follows the official book.
 * Later this moves to the database (lessons, lesson_blocks).
 */
import type { Lesson } from "../../../types/content";

export const LESSONS: Lesson[] = [
  {
    id: "phys-projectile",
    subject: "physics",
    titleAr: "المقذوفات",
    titleEn: "Projectile Motion",
    minutes: 5,
    free: true,
    steps: [
      { type: "read", title: "كرة في الهواء", body: "لما تشوط كرة، مساراها بيكون منحنى. الحركة الأفقية بسرعة ثابتة، والحركة الرأسية بتتأثر بالجاذبية. هنجرب ونشوف." },
      { type: "lab", lab: "projectile", prompt: "غيّر الزاوية من 20° إلى 60° ولاحظ المدى وزمن التحليق، ثم اضغط إطلاق." },
      {
        type: "choice",
        question: "من سطح الأرض وبنفس السرعة، عند أي زاوية يكون المدى أكبر ما يمكن؟",
        options: ["30°", "45°", "60°", "90°"], answer: 1,
        explain: "المدى يتناسب مع sin 2θ، وأكبر قيمة له عند 2θ = 90°، أي θ = 45°.",
        hint: "جرّب في المعمل زوايا قريبة من 45° وقارن المدى.",
      },
      {
        type: "formula", title: "قانون المدى (من سطح الأرض)", latex: "R = \\dfrac{v^{2}\\,\\sin 2\\theta}{g}",
        symbols: [
          { sym: "R", meaning: "المدى الأفقي", unit: "م" },
          { sym: "v", meaning: "سرعة القذف", unit: "م/ث" },
          { sym: "θ", meaning: "زاوية القذف", unit: "درجة" },
          { sym: "g", meaning: "عجلة الجاذبية", unit: "م/ث²" },
        ],
      },
      { type: "numeric", topic: "projectile", level: 1 },
      { type: "numeric", topic: "projectile", level: 1 },
    ],
  },
  {
    id: "phys-newton",
    subject: "physics",
    titleAr: "قانون نيوتن الثاني",
    titleEn: "Newton's Second Law",
    minutes: 4,
    free: true,
    steps: [
      { type: "read", title: "القوة والعجلة", body: "كل ما القوة تزيد على نفس الجسم، العجلة بتزيد. وكل ما الكتلة تزيد، العجلة بتقل. القانون بيربطهم في معادلة واحدة." },
      {
        type: "choice",
        question: "ضاعفنا القوة المؤثرة على جسم مع ثبات كتلته. ماذا يحدث للعجلة؟",
        options: ["تقل للنصف", "لا تتغير", "تتضاعف", "تصبح أربعة أمثالها"], answer: 2,
        explain: "a = F ÷ m، فمع ثبات m تتناسب العجلة طرديًا مع القوة.",
        hint: "اكتب a بدلالة F وm وغيّر F فقط.",
      },
      {
        type: "formula", title: "القانون", latex: "F = m \\times a",
        symbols: [
          { sym: "F", meaning: "القوة المحصلة", unit: "نيوتن" },
          { sym: "m", meaning: "الكتلة", unit: "كجم" },
          { sym: "a", meaning: "العجلة", unit: "م/ث²" },
        ],
      },
      { type: "numeric", topic: "newton", level: 1 },
      { type: "numeric", topic: "newton", level: 2 },
    ],
  },
  {
    id: "phys-ohm",
    subject: "physics",
    titleAr: "قانون أوم",
    titleEn: "Ohm's Law",
    minutes: 4,
    free: false,
    steps: [
      { type: "read", title: "الجهد والتيار والمقاومة", body: "التيار الكهربي بيمر في السلك بسبب فرق الجهد، والمقاومة بتقاوم مروره. قانون أوم بيربط التلاتة." },
      {
        type: "formula", title: "قانون أوم", latex: "V = I \\times R",
        symbols: [
          { sym: "V", meaning: "فرق الجهد", unit: "فولت" },
          { sym: "I", meaning: "شدة التيار", unit: "أمبير" },
          { sym: "R", meaning: "المقاومة", unit: "أوم" },
        ],
      },
      {
        type: "choice",
        question: "إذا زادت المقاومة وثبت الجهد، فماذا يحدث للتيار؟",
        options: ["يزيد", "يقل", "لا يتغير", "ينعدم دائمًا"], answer: 1,
        explain: "I = V ÷ R، فمع ثبات V تتناسب شدة التيار عكسيًا مع R.",
        hint: "اكتب I بدلالة V وR.",
      },
      { type: "numeric", topic: "ohm", level: 1 },
      { type: "numeric", topic: "ohm", level: 2 },
    ],
  },
  {
    id: "chem-balance",
    subject: "chemistry",
    titleAr: "موازنة المعادلات الكيميائية",
    titleEn: "Balancing Equations",
    minutes: 5,
    free: true,
    steps: [
      { type: "read", title: "الذرات لا تختفي", body: "في أي تفاعل، عدد ذرات كل عنصر قبل التفاعل = عدده بعد التفاعل. بنوازن المعادلة بتغيير المعاملات (الأرقام قدام المركبات) وليس الأرقام السفلية." },
      { type: "lab", lab: "balance", eqId: "h2-o2", prompt: "وازن المعادلة: زوّد وقلّل المعاملات حتى يتساوى عدد ذرات كل عنصر." },
      {
        type: "choice",
        question: "عند موازنة معادلة، أي شيء يُسمح بتغييره؟",
        options: ["الأرقام السفلية في الصيغة", "المعاملات أمام المركبات", "رموز العناصر", "لا شيء"], answer: 1,
        explain: "تغيير الأرقام السفلية يغيّر المادة نفسها. نغيّر المعاملات فقط.",
        hint: "H₂O و H₂O₂ مادتان مختلفتان.",
      },
      { type: "lab", lab: "balance", eqId: "ch4-o2", prompt: "جرّب احتراق الميثان. ابدأ بالكربون ثم الهيدروجين ثم الأكسجين." },
      { type: "numeric", topic: "balance", level: 1 },
    ],
  },
  {
    id: "chem-moles",
    subject: "chemistry",
    titleAr: "المول والكتلة المولية",
    titleEn: "The Mole",
    minutes: 4,
    free: true,
    steps: [
      { type: "read", title: "كم مادة عندي؟", body: "المول وحدة لقياس كمية المادة. الكتلة المولية هي كتلة مول واحد بالجرام، وبنجمعها من الكتل الذرية: H = 1، C = 12، O = 16." },
      {
        type: "formula", title: "عدد المولات", latex: "n = \\dfrac{m}{M}",
        symbols: [
          { sym: "n", meaning: "عدد المولات", unit: "مول" },
          { sym: "m", meaning: "الكتلة", unit: "جم" },
          { sym: "M", meaning: "الكتلة المولية", unit: "جم/مول" },
        ],
      },
      {
        type: "choice",
        question: "ما الكتلة المولية لجزيء CO₂؟ (C = 12، O = 16)",
        options: ["28", "44", "32", "60"], answer: 1,
        explain: "12 + 2 × 16 = 44 جم/مول.",
        hint: "في الصيغة CO₂ ذرتا أكسجين.",
      },
      { type: "numeric", topic: "moles", level: 1 },
      { type: "numeric", topic: "moles", level: 2 },
    ],
  },
  {
    id: "chem-ph",
    subject: "chemistry",
    titleAr: "الأس الهيدروجيني pH",
    titleEn: "pH Scale",
    minutes: 4,
    free: false,
    steps: [
      { type: "read", title: "حمض أم قاعدة؟", body: "مقياس pH بيحدد درجة حموضة المحلول. أقل من 7 حمضي، 7 متعادل، أكبر من 7 قاعدي." },
      {
        type: "formula", title: "حساب pH", latex: "\\mathrm{pH} = -\\log_{10}\\left[\\ce{H+}\\right]",
        symbols: [
          { sym: "pH", meaning: "الأس الهيدروجيني", unit: "" },
          { sym: "[H⁺]", meaning: "تركيز أيون الهيدروجين", unit: "مول/لتر" },
        ],
      },
      {
        type: "choice",
        question: "محلول قيمة pH له تساوي 9. ما طبيعته؟",
        options: ["حمضي", "متعادل", "قاعدي", "لا يمكن تحديده"], answer: 2,
        explain: "أي قيمة pH أكبر من 7 تعني محلولًا قاعديًا.",
        hint: "قارن 9 بالقيمة 7.",
      },
      { type: "numeric", topic: "ph", level: 1 },
      { type: "numeric", topic: "ph", level: 2 },
    ],
  },
];

export const lessonById = (id: string): Lesson | undefined => LESSONS.find((l) => l.id === id);
export const lessonsOf = (subject: Lesson["subject"]): Lesson[] => LESSONS.filter((l) => l.subject === subject);

/** Which lesson to suggest when a practice topic is weak. */
export const LESSON_FOR_TOPIC: Partial<Record<string, string>> = {
  projectile: "phys-projectile",
  newton: "phys-newton",
  ohm: "phys-ohm",
  balance: "chem-balance",
  moles: "chem-moles",
  ph: "chem-ph",
};
