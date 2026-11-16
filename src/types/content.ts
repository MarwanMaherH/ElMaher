import type { Subject, Topic, Level } from "../features/practice/questions";

export interface FormulaSymbol {
  sym: string;
  meaning: string;
  unit: string;
}

export type Step =
  | { type: "read"; title: string; body: string }
  | { type: "formula"; title: string; latex: string; symbols: FormulaSymbol[] }
  | { type: "lab"; lab: "projectile" | "balance"; prompt: string; eqId?: string }
  | { type: "choice"; question: string; options: string[]; answer: number; explain: string; hint: string }
  /** a fresh randomized question every time the lesson is opened */
  | { type: "numeric"; topic: Topic; level: Level };

export interface Lesson {
  id: string;
  subject: Subject;
  titleAr: string;
  titleEn: string;
  minutes: number;
  /** free lessons are open to everyone; the rest need Premium */
  free: boolean;
  steps: Step[];
}
