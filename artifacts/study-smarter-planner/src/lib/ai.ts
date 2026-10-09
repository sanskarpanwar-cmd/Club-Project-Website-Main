/**
 * Groq AI integration for Study Smarter Planner
 * Uses the Groq API (OpenAI-compatible)
 */

import type { Subject, Exam, StudySession, PlannerData } from "./study-data";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "openai/gpt-oss-120b"; // Updated to the correct model ID from documentation

function getApiKey(): string {
  const key = import.meta.env.VITE_GROQ_API_KEY;
  if (!key) throw new Error("VITE_GROQ_API_KEY is not set in .env");
  return key;
}

async function callGroq(systemPrompt: string, userMessage: string, jsonMode: boolean = false): Promise<string> {
  const body: any = {
    model: GROQ_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    temperature: 0.7,
    max_tokens: 4096,
  };

  if (jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const resp = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Groq API error ${resp.status}: ${text}`);
  }

  const json = await resp.json();
  return json.choices[0]?.message?.content ?? "";
}

// ---------------------------------------------------------------------------
// 1. Generate an AI-enriched initial study plan description
// ---------------------------------------------------------------------------

export interface AIPlanSession {
  subjectId: string;
  subjectName: string;
  duration: number;
  activity: string; // AI-generated rich description
  category: string;
}

/**
 * Takes the user's preferences from Firestore / local state and asks Mistral
 * to produce a richer, personalised activity description for each planned session.
 */
export async function generateAIPlanDescriptions(
  sessions: StudySession[],
  subjects: Subject[],
  exams: Exam[],
  userPrefs: Pick<PlannerData, "preferredModes" | "weekdayMinutes" | "weekendMinutes" | "reflections">
): Promise<AIPlanSession[]> {
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const sessionList = sessions.map((s) => {
    const sub = subjects.find((x) => x.id === s.subjectId);
    const exam = exams
      .filter((e) => e.subjectId === s.subjectId)
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    return {
      id: s.id,
      subjectId: s.subjectId,
      subjectName: sub?.name ?? "Study",
      confidence: sub?.confidence ?? 5,
      duration: s.duration,
      category: s.category,
      nextExam: exam ? `${exam.title} on ${exam.date}` : null,
    };
  });

  const latestReflection = [...(userPrefs.reflections ?? [])]
    .sort((a, b) => b.week.localeCompare(a.week))[0];

  const system = `You are a supportive study coach AI inside a student planner app.
Your job is to write clear, practical, encouraging study session activity descriptions.
Each description must:
- Be 1–2 sentences, max 40 words.
- Name a specific study technique.
- Give one concrete action the student should do right now, tailored SPECIFICALLY to the subject.
- Ensure the descriptions are HIGHLY VARIED and unique for each subject. Do NOT repeat the same advice or structure.
- Match their preferred learning style: ${userPrefs.preferredModes.join(", ")}.

EXAMPLE GOOD OUTPUT (Notice how completely different the activities are from each other):
[
  {"id": "1", "activity": "Practice testing: Solve 3 calculus integrals without notes. If you get stuck on the chain rule, review the textbook example."},
  {"id": "2", "activity": "Feynman technique: Explain the causes of the French Revolution out loud to an imaginary beginner. Write down any gaps in your knowledge."},
  {"id": "3", "activity": "Spaced review: Quickly review your Biology flashcards on cell division. Star the ones you miss and re-test them at the end."}
]

Respond ONLY with a JSON array of objects: [{"id":"...","activity":"..."}]`;

  const user = `Today is ${today}.
Student sessions to enrich:
${JSON.stringify(sessionList, null, 2)}
${latestReflection ? `\nLast week's reflection — what was hard: "${latestReflection.difficult}", what to focus on: "${latestReflection.focus}".` : ""}

Return a JSON array with one object per session: [{"id":"<sessionId>","activity":"<description>"}]`;

  let parsed: { id: string; activity: string }[] = [];
  try {
    const raw = await callGroq(system, user);
    // Extract JSON from markdown code fences if present
    const match = raw.match(/\[[\s\S]*\]/);
    parsed = JSON.parse(match ? match[0] : raw);
  } catch (e) {
    console.error("Mistral JSON parse error", e);
    // Graceful fallback: return original sessions unchanged
    return sessions.map((s) => ({
      subjectId: s.subjectId,
      subjectName: subjects.find((x) => x.id === s.subjectId)?.name ?? "Study",
      duration: s.duration,
      activity: s.activity,
      category: s.category,
    }));
  }

  const activityMap = new Map(parsed.map((p) => [p.id, p.activity]));
  return sessions.map((s) => ({
    subjectId: s.subjectId,
    subjectName: subjects.find((x) => x.id === s.subjectId)?.name ?? "Study",
    duration: s.duration,
    activity: activityMap.get(s.id) ?? s.activity,
    category: s.category,
  }));
}

// ---------------------------------------------------------------------------
// 1b. Generate full structured multi-day plan
// ---------------------------------------------------------------------------

export async function generateFullPlanWithAI(
  subjects: Subject[],
  exams: Exam[],
  settings: {
    todayMinutes: number;
    weekdayMinutes: number;
    weekendMinutes: number;
    unavailableDays: string[];
    preferredModes: string[];
    startDay: string;
    grade?: string;
    board?: string;
    effectiveTechniques?: string[];
    ineffectiveTechniques?: string[];
  }
): Promise<StudySession[]> {
  const { startDay } = settings;
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(`${startDay}T12:00:00`);
    d.setDate(d.getDate() + i);
    const dayStr = d.toISOString().slice(0, 10);
    const mondayFirstDay = (d.getDay() + 6) % 7;
    if (settings.unavailableDays.includes(String(mondayFirstDay))) continue;
    
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const availableMins = i === 0 ? settings.todayMinutes : (isWeekend ? settings.weekendMinutes : settings.weekdayMinutes);
    if (availableMins > 0) {
      days.push({ date: dayStr, availableMinutes: availableMins });
    }
  }

  const effectiveStr = settings.effectiveTechniques?.length
    ? `Proven effective techniques to FAVOR: ${settings.effectiveTechniques.join(", ")}.`
    : "";
  const ineffectiveStr = settings.ineffectiveTechniques?.length
    ? `Techniques that DO NOT work well (AVOID or minimize): ${settings.ineffectiveTechniques.join(", ")}.`
    : "";

  const system = `You are an expert study planner AI.
Your task is to generate a multi-day study schedule for a ${settings.grade || 'Grade 10th'} student studying the ${settings.board || 'CBSE'} curriculum.
- Output ONLY valid JSON matching this schema: 
{ "plan": [ { "date": "YYYY-MM-DD", "tasks": [ { "subjectId": "...", "duration": number, "category": "string", "activity": "string" } ] } ] }
- Tailor task descriptions specifically to ${settings.grade || 'Grade 10th'} level difficulty and ${settings.board || 'CBSE'} syllabus requirements.
- "activity" must be 1-2 sentences, varied and highly specific to the subject.
- "duration" must add up to the available minutes for that date.
- "category" should be one of: "Practice testing", "Spaced review", "Feynman technique", "Closed-book recall".
- Match learning preferences: ${settings.preferredModes.join(", ")}.
${effectiveStr ? `- ${effectiveStr}` : ""}
${ineffectiveStr ? `- ${ineffectiveStr}` : ""}
- Give near-term attention to upcoming exams and subjects with low confidence.`;

  const user = `Student Profile: ${settings.grade || 'Grade 10th'} (${settings.board || 'CBSE'} Board)
Subjects: ${JSON.stringify(subjects)}
Upcoming Exams: ${JSON.stringify(exams)}
Days to plan: ${JSON.stringify(days)}

Generate the plan in the requested JSON format.`;

  try {
    const raw = await callGroq(system, user, true);
    let cleanJson = raw.trim();

    // Extract JSON from markdown code fences if present
    const fenceMatch = cleanJson.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fenceMatch) {
      cleanJson = fenceMatch[1].trim();
    } else {
      const match = cleanJson.match(/\{[\s\S]*\}/);
      if (match) {
        cleanJson = match[0];
      }
    }

    // Clean up trailing commas if any
    cleanJson = cleanJson.replace(/,\s*([\]}])/g, '$1');

    const parsed = JSON.parse(cleanJson) as { plan: { date: string; tasks: any[] }[] };
    
    const sessions: StudySession[] = [];
    for (const day of parsed.plan) {
      for (const t of day.tasks) {
        sessions.push({
          id: Math.random().toString(36).substring(2, 9),
          subjectId: t.subjectId,
          activity: t.activity,
          duration: t.duration,
          scheduledDate: day.date,
          completed: false,
          category: t.category || "Study"
        });
      }
    }
    return sessions;
  } catch (e) {
    console.error("Mistral plan generation error", e);
    throw e;
  }
}

// ---------------------------------------------------------------------------
// 2. Adjust the plan based on natural-language user feedback
// ---------------------------------------------------------------------------

export interface FeedbackResult {
  updatedActivities: { id: string; activity: string; duration?: number }[];
  aiMessage: string; // Short response to show the user in chat
}

/**
 * Takes user's typed feedback (e.g. "I'm exhausted, make it lighter") and
 * the current sessions, then returns updated activity descriptions + a reply.
 */
export async function adjustPlanWithFeedback(
  feedback: string,
  sessions: StudySession[],
  subjects: Subject[],
  reflectionContext?: { wentWell: string; difficult: string }
): Promise<FeedbackResult> {
  const sessionList = sessions.map((s) => ({
    id: s.id,
    subject: subjects.find((x) => x.id === s.subjectId)?.name ?? "Study",
    activity: s.activity,
    duration: s.duration,
    completed: s.completed,
  }));

  const system = `You are an adaptive study planner AI inside a student planner app.
The student provided natural-language feedback about today's study plan (e.g., "I'm tired, make it lighter", "Focus more on Physics", "Give me 15-minute quick sessions").

Your task is to REVISE today's study sessions to directly reflect their feedback:
1. "aiMessage": A brief 1-2 sentence supportive confirmation explaining what you adjusted.
2. "updatedActivities": An array of objects for incomplete sessions. MUST include:
   - "id": The EXACT session id provided in the request.
   - "activity": The NEW, REVISED action description explicitly implementing their request (e.g., if tired -> lighter task; if specific subject requested -> focus on that subject).
   - "duration": (optional) updated session duration in minutes if requested.

Respond ONLY with valid JSON matching: {"aiMessage":"...","updatedActivities":[{"id":"...","activity":"...","duration":15}]}`;

  const user = `Student's feedback: "${feedback}"

Current sessions to update:
${JSON.stringify(sessionList, null, 2)}
${reflectionContext ? `\nContext from daily reflection — went well: "${reflectionContext.wentWell}", difficult: "${reflectionContext.difficult}"` : ""}

Return JSON with updated activity descriptions and optional durations.`;

  try {
    const raw = await callGroq(system, user, true);
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON found");
    const parsed = JSON.parse(match[0].replace(/,\s*([\]}])/g, '$1')) as FeedbackResult;
    return parsed;
  } catch (e) {
    console.error("Groq feedback parse error", e);
    return {
      updatedActivities: [],
      aiMessage: "I received your feedback! Try refreshing your plan if you'd like changes.",
    };
  }
}

// ---------------------------------------------------------------------------
// 3. Generate a daily reflection response / plan adjustment tip
// ---------------------------------------------------------------------------

export async function generateReflectionInsight(
  wentWell: string,
  difficult: string,
  focus: string,
  subjects: Subject[]
): Promise<string> {
  const focusSubject = subjects.find((s) => s.id === focus)?.name ?? focus;

  const system = `You are a warm, encouraging study coach. 
Based on a student's daily reflection, give a short, personal, actionable insight (2–3 sentences max).
- Acknowledge something positive from today.
- Give one practical tip based on what was difficult today.
- End with a motivating sentence for tomorrow.
Do NOT use bullet points or lists. Write in flowing, warm prose.`;

  const user = `What went well today: "${wentWell || "nothing specific"}"
What felt difficult today: "${difficult || "nothing specific"}"
Subject to focus on tomorrow: "${focusSubject || "not specified"}"

Write a 2–3 sentence coaching insight.`;

  try {
    return await callGroq(system, user);
  } catch (e) {
    console.error("Mistral reflection insight error", e);
    return "";
  }
}
