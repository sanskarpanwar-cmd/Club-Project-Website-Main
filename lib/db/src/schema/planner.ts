import { pgTable, text, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const plannerDataSchema = z.object({
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    createdAt: z.string(),
  }).nullable(),
  subjects: z.array(z.object({
    id: z.string(),
    name: z.string(),
    confidence: z.number(),
  })),
  exams: z.array(z.object({
    id: z.string(),
    subjectId: z.string(),
    title: z.string(),
    date: z.string(),
  })),
  weekdayMinutes: z.number(),
  weekendMinutes: z.number(),
  todayMinutes: z.number(),
  unavailableDays: z.array(z.string()),
  preferredModes: z.array(z.string()),
  sessions: z.array(z.object({
    id: z.string(),
    subjectId: z.string(),
    activity: z.string(),
    duration: z.number(),
    scheduledDate: z.string(),
    completed: z.boolean(),
    completedAt: z.string().optional(),
    category: z.string(),
  })),
  reflections: z.array(z.object({
    id: z.string(),
    week: z.string(),
    wentWell: z.string(),
    difficult: z.string(),
    focus: z.string(),
    realism: z.string(),
  })),
  recoveryMode: z.boolean(),
});

export type PlannerData = z.infer<typeof plannerDataSchema>;

