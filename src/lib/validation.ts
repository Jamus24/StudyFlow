import { z } from "zod";

export const schemas = {
  register: z.object({
    name: z.string().min(2, "Tell us your name").max(60),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "Use at least 8 characters").max(72),
  }),
  login: z.object({
    email: z.string().email("Enter a valid email"),
    password: z.string().min(1, "Enter your password"),
  }),
  subject: z.object({
    name: z.string().min(1).max(60),
    color: z.string().min(1).max(20),
    icon: z.string().optional(),
    examDate: z.string().optional(),
    targetGrade: z.string().max(12).optional(),
    description: z.string().max(400).optional(),
    archived: z.boolean().optional(),
  }),
  task: z.object({
    title: z.string().min(1).max(140),
    description: z.string().max(2000).optional(),
    subjectId: z.string().optional().nullable(),
    priority: z.enum(["low", "medium", "high"]).default("medium"),
    type: z
      .enum(["study", "review", "practice", "exam", "project"])
      .default("study"),
    estMinutes: z.number().int().min(1).max(600).default(30),
    dueDate: z.string().optional().nullable(),
    scheduledFor: z.string().optional().nullable(),
    status: z.enum(["todo", "doing", "done"]).default("todo"),
    tags: z.string().max(200).optional(),
  }),
  session: z.object({
    subjectId: z.string().optional().nullable(),
    taskId: z.string().optional().nullable(),
    durationMin: z.number().int().min(1).max(600),
    focusScore: z.number().int().min(1).max(100).optional(),
    note: z.string().max(1000).optional(),
    mode: z.enum(["pomodoro", "freeform", "deep"]).default("pomodoro"),
    startedAt: z.string().optional(),
  }),
  plan: z.object({
    goal: z.string().min(4).max(300),
    horizon: z.enum(["week", "month", "exam"]).default("week"),
    hoursPerWeek: z.number().min(1).max(40),
    level: z.string().max(40).optional(),
    weaknesses: z.string().max(500).optional(),
    subjectIds: z.array(z.string()).optional(),
  }),
  note: z.object({
    title: z.string().min(1).max(160),
    content: z.string().max(20000),
    subjectId: z.string().optional().nullable(),
    tags: z.string().max(200).optional(),
    pinned: z.boolean().optional(),
  }),
  deck: z.object({
    name: z.string().min(1).max(80),
    description: z.string().max(400).optional(),
    subjectId: z.string().optional().nullable(),
  }),
  flashcard: z.object({
    front: z.string().min(1).max(600),
    back: z.string().min(1).max(1000),
  }),
  generateCards: z.object({
    source: z.string().min(10).max(12000),
    count: z.number().int().min(1).max(30),
    difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  }),
  tutor: z.object({
    threadId: z.string().optional(),
    subjectId: z.string().optional().nullable(),
    message: z.string().min(1).max(4000),
  }),
  preferences: z.object({
    theme: z.enum(["light", "dark", "system"]).optional(),
    accent: z.string().max(20).optional(),
    pomodoroWork: z.number().int().min(5).max(90).optional(),
    pomodoroBreak: z.number().int().min(1).max(30).optional(),
    emailDigest: z.boolean().optional(),
    weeklyReport: z.boolean().optional(),
    pushReminders: z.boolean().optional(),
    reduceMotion: z.boolean().optional(),
    compactDensity: z.boolean().optional(),
  }),
  profile: z.object({
    name: z.string().min(2).max(60),
    bio: z.string().max(400).optional(),
    grade: z.string().max(40).optional(),
    timezone: z.string().max(60).optional(),
    avatarUrl: z.string().url().optional().or(z.literal("")).nullable(),
    weeklyGoalMin: z.number().int().min(60).max(3000).optional(),
  }),
  ticket: z.object({
    subject: z.string().min(4).max(120),
    body: z.string().min(10).max(2000),
    priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  }),
  flag: z.object({
    key: z.string().min(2).max(60),
    label: z.string().min(2).max(80),
    description: z.string().max(400).optional(),
    enabled: z.boolean(),
    rollout: z.number().int().min(0).max(100),
  }),
};

export type SchemaOf<K extends keyof typeof schemas> = z.infer<(typeof schemas)[K]>;
