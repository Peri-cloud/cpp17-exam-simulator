import examData from "@/data/exam-data.json";

// ---------------- types ----------------
export interface TestCase {
  input: string;
  expected: string;
  tag: string; // sample | hidden | extra
}

export interface Question {
  id: string;
  unit: number;
  kind: "Coding" | "Debugging";
  title: string;
  statement: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  easy: string;
  logic: string[];
  algorithm: string[];
  mistakes: string[];
  starterCode: string;
  referenceSolution: string;
  bugLabel: string;
  tests: TestCase[];
}

export interface Mcq {
  id: string;
  unit: number;
  n: number;
  topic: string;
  q: string;
  code: string;
  opts: string[];
  ans: string;
  ansText: string;
  expl: string;
  verifiedOutput: string;
  verifiedOption: string;
}

export interface CaseResult {
  index: number;
  tag: string;
  hidden: boolean;
  input?: string;
  expected?: string;
  actual?: string;
  passed: boolean;
  stderr?: string;
  timeMs: number;
  timedOut?: boolean;
}

export interface RunResponse {
  compile: "OK" | "ERROR";
  compileError?: string;
  results: CaseResult[];
  passed: number;
  total: number;
}

// ---------------- data ----------------
export const QUESTIONS = examData.questions as Question[];
export const MCQS = examData.mcqs as Mcq[];

export const MARKS_PER_CODE_Q = 10;
export const MARKS_PER_MCQ = 1;

export type ItemType = "code" | "mcq";

export interface TestItem {
  type: ItemType;
  id: string;
  unit: number;
  title: string;
  kind: "Coding" | "Debugging" | "MCQ";
  question?: Question;
  mcq?: Mcq;
  maxMarks: number;
}

export type TestMode = "mock" | "unit" | "full" | "mcq";

export interface TestConfig {
  mode: TestMode;
  unit: number | null; // for unit / mcq modes
  durationMin: number;
}

export const MODE_INFO: Record<
  TestMode,
  { name: string; desc: string; durationMin: number; icon: string }
> = {
  mock: {
    name: "IAMNEO Mock Replica",
    desc: "2 coding questions picked at random — exactly like the real PAT_Iamneo_Mock Test 2 (40 min, 20 marks, +10 / −0 per question).",
    durationMin: 40,
    icon: "target",
  },
  unit: {
    name: "Unit Practice",
    desc: "All 9 questions of one unit (5 debugging + 4 coding) with their real QB test cases.",
    durationMin: 60,
    icon: "book",
  },
  full: {
    name: "Full Practice — Units 1 to 5",
    desc: "All 45 coding & debugging questions from the merged question bank.",
    durationMin: 150,
    icon: "layers",
  },
  mcq: {
    name: "MCQ Sprint",
    desc: "20 multiple-choice questions of one unit (includes every verified find-the-output question).",
    durationMin: 25,
    icon: "list",
  },
};

// ---------------- item building ----------------
function toCodeItem(q: Question): TestItem {
  return {
    type: "code",
    id: q.id,
    unit: q.unit,
    title: q.title,
    kind: q.kind,
    question: q,
    maxMarks: MARKS_PER_CODE_Q,
  };
}

function toMcqItem(m: Mcq): TestItem {
  return { type: "mcq", id: m.id, unit: m.unit, title: m.q, kind: "MCQ", mcq: m, maxMarks: MARKS_PER_MCQ };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildItems(config: TestConfig): TestItem[] {
  if (config.mode === "mock") {
    const pool = shuffle(QUESTIONS);
    const picks: Question[] = [];
    // prefer one Coding + one Debugging, like the real mock mixes
    const coding = pool.find((q) => q.kind === "Coding");
    const debugging = pool.find((q) => q.kind === "Debugging");
    if (coding) picks.push(coding);
    if (debugging) picks.push(debugging);
    while (picks.length < 2 && pool.length) picks.push(pool.pop()!);
    return picks.map(toCodeItem);
  }
  if (config.mode === "unit") {
    return QUESTIONS.filter((q) => q.unit === config.unit).map(toCodeItem);
  }
  if (config.mode === "full") {
    return QUESTIONS.map(toCodeItem);
  }
  // mcq sprint
  const pool = MCQS.filter((m) => m.unit === config.unit);
  return shuffle(pool).slice(0, 20).map(toMcqItem);
}

export function totalMarks(items: TestItem[]): number {
  return items.reduce((s, it) => s + it.maxMarks, 0);
}

// ---------------- helpers ----------------
export function fmtClock(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export const UNIT_NAMES: Record<number, string> = {
  1: "Classes, Objects, Constructors & Destructors",
  2: "Function Overloading, Inheritance & Exception Handling",
  3: "Linked Lists, Stacks & Queues",
  4: "Trees, BST, AVL & Expression Trees",
  5: "Graphs: BFS, DFS, MST & Shortest Paths",
};

export interface ItemState {
  code?: string;
  choice?: number;
  visited: boolean;
  marked: boolean;
  submitted: boolean;
  passed?: number;
  totalTests?: number;
  score?: number;
  lastRun?: "run" | "submit" | "custom";
  results?: CaseResult[];
  compileError?: string;
  correct?: boolean; // mcq
}

export function defaultItemState(): ItemState {
  return { visited: false, marked: false, submitted: false };
}

export function isAnswered(item: TestItem, st: ItemState): boolean {
  if (item.type === "mcq") return st.choice !== undefined;
  const starter = item.question?.starterCode ?? "";
  return !!st.code && st.code !== starter;
}
