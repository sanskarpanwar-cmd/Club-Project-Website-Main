export type Subject = { id: string; name: string; confidence: number };
export type Exam = { id: string; subjectId: string; title: string; date: string };
export type StudySession = { id: string; subjectId: string; activity: string; duration: number; scheduledDate: string; completed: boolean; completedAt?: string; category: string };
export type Reflection = { id: string; week: string; wentWell: string; difficult: string; focus: string; realism: string };
export type PlannerData = {
  user: { id: string; name: string; email: string; createdAt: string } | null;
  grade?: string;
  board?: string;
  effectiveTechniques?: string[];
  ineffectiveTechniques?: string[];
  subjects: Subject[];
  exams: Exam[];
  weekdayMinutes: number;
  weekendMinutes: number;
  todayMinutes: number;
  unavailableDays: string[];
  preferredModes: string[];
  sessions: StudySession[];
  reflections: Reflection[];
  recoveryMode: boolean;
};

export const empty: PlannerData = {
  user: null, grade: 'Grade 10th', board: 'CBSE',
  effectiveTechniques: ['Practice testing', 'Feynman technique'],
  ineffectiveTechniques: ['Passive re-reading'],
  subjects: [], exams: [], weekdayMinutes: 60, weekendMinutes: 90,
  todayMinutes: 60, unavailableDays: [], preferredModes: ['Solving questions', 'Mixture'],
  sessions: [], reflections: [], recoveryMode: false,
};
const KEY = 'study-smarter-planner-v1';
export function loadPlanner(): PlannerData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<PlannerData>;
    return { ...empty, ...parsed, user: parsed.user ?? null, subjects: parsed.subjects ?? [], exams: parsed.exams ?? [], sessions: parsed.sessions ?? [], reflections: parsed.reflections ?? [] };
  } catch { return empty; }
}
export function savePlanner(data: PlannerData) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); return true; } catch { return false; }
}
export function uid() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
export function todayKey(date = new Date()) {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 10);
}
export function weekStartKey(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  return todayKey(start);
}
export function reflectionWeekKey(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return value;
  return weekStartKey(new Date(year, month - 1, day));
}
export type PlanOptions = {
  focusSubjectId?: string;
  missedSubjectIds?: string[];
  coverage?: Record<string, number>;
  rotation?: number;
  targetCount?: number;
  realism?: string;
};

export function createPlan(
  subjects: Subject[],
  exams: Exam[],
  minutes: number,
  modes: string[],
  day = todayKey(),
  options: PlanOptions = {},
): StudySession[] {
  if (!subjects.length) return [];
  const score = (subject: Subject) => {
      const exam = exams.filter(e => e.subjectId === subject.id && e.date >= day).sort((x, y) => x.date.localeCompare(y.date))[0];
      const days = exam ? Math.max(1, (new Date(`${exam.date}T12:00:00`).getTime() - new Date(`${day}T12:00:00`).getTime()) / 86400000) : 45;
      return (11 - subject.confidence) * .65
        + 12 / days
        + (options.focusSubjectId === subject.id ? 3 : 0)
        + (options.missedSubjectIds?.includes(subject.id) ? 1.6 : 0)
        - (options.coverage?.[subject.id] ?? 0) * 1.2;
  };
  const ranked = [...subjects].sort((a, b) => score(b) - score(a));
  const mins = Math.max(0, Math.floor(minutes));
  if (mins < 10) return [];
  const count = Math.min(ranked.length, options.targetCount ?? Math.max(1, Math.ceil(mins / 20)));
  const active = Array.from({ length: count }, (_, i) => ranked[(i + (options.rotation ?? 0)) % ranked.length]);
  const each = Math.max(10, Math.floor(mins / count / 5) * 5);
  const mode = modes[0] || 'Solving questions';
  return active.map((s, i) => {
    const kind = ['Practice testing', 'Closed-book recall', 'Spaced review', 'Mistake correction'][(i + (options.rotation ?? 0)) % 4];
    const activity = mode === 'Reviewing notes'
      ? `Recall ${s.name} key ideas, then check your notes`
      : mode === 'Flashcards' ? `Review ${s.name} flashcards; explain missed answers`
      : mode === 'Watching explanations' ? `Watch one ${s.name} explanation, then solve from memory`
      : `${kind}: ${s.name} ${i === 0 ? 'priority topic' : 'core concepts'}`;
    const instruction = mode === 'Reviewing notes'
      ? 'Close your notes first. Write what you remember, then correct gaps in a different colour.'
      : mode === 'Flashcards' ? 'Answer each card before flipping. Put missed cards aside and retry them at the end.'
      : mode === 'Watching explanations' ? 'Pause every few minutes to predict the next step, then solve one example without help.'
      : `Try 8–10 questions without notes. Mark uncertain answers, check the worked solutions, and write down one mistake to revisit.`;
    return { id: uid(), subjectId: s.id, activity: `${activity} — ${instruction}`, duration: i === count - 1 ? Math.max(10, mins - each * (count - 1)) : each, scheduledDate: day, completed: false, category: kind };
  });
}

export function createWeekPlan(
  subjects: Subject[],
  exams: Exam[],
  settings: {
    todayMinutes: number;
    weekdayMinutes: number;
    weekendMinutes: number;
    unavailableDays: string[];
    preferredModes: string[];
    reflections: Reflection[];
    previousSessions: StudySession[];
    startDay?: string;
  },
): StudySession[] {
  const startDay = settings.startDay ?? todayKey();
  const latestReflection = [...settings.reflections].sort((a, b) => b.week.localeCompare(a.week))[0];
  const missedSubjectIds = settings.previousSessions
    .filter(session => !session.completed && session.scheduledDate < startDay)
    .map(session => session.subjectId);
  const coverage: Record<string, number> = {};
  const sessions: StudySession[] = [];

  for (let offset = 0; offset < 7; offset++) {
    const date = new Date(`${startDay}T12:00:00`);
    date.setDate(date.getDate() + offset);
    const day = todayKey(date);
    const mondayFirstDay = (date.getDay() + 6) % 7;
    if (settings.unavailableDays.includes(String(mondayFirstDay))) continue;

    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const availableMinutes = offset === 0
      ? settings.todayMinutes
      : isWeekend ? settings.weekendMinutes : settings.weekdayMinutes;
    const plannedMinutes = offset > 0 && latestReflection?.realism === 'too-much'
      ? Math.max(10, Math.floor(availableMinutes * 0.8 / 5) * 5)
      : availableMinutes;
    const dailySessions = createPlan(subjects, exams, plannedMinutes, settings.preferredModes, day, {
      focusSubjectId: latestReflection?.focus,
      missedSubjectIds,
      coverage,
      rotation: offset,
    });
    for (const session of dailySessions) {
      sessions.push(session);
      coverage[session.subjectId] = (coverage[session.subjectId] ?? 0) + 1;
    }
  }
  return sessions;
}

export function createRecoveryPlan(
  subjects: Subject[],
  exams: Exam[],
  modes: string[],
  day = todayKey(),
  options: Pick<PlanOptions, 'focusSubjectId' | 'missedSubjectIds'> = {},
): StudySession[] {
  return createPlan(subjects, exams, 30, modes, day, {
    ...options,
    targetCount: Math.min(3, subjects.length),
  });
}