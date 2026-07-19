import { z } from "zod";

export const identifierSchema = z.string().trim().min(1).max(100);
export const nameSchema = z.string().trim().min(2).max(120);
export const phoneSchema = z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/, "Enter a valid phone number.");
export const courseCodeSchema = z.string().trim().min(2).max(24).transform((value) => value.toUpperCase());

export const authSchema = z.object({
  name: nameSchema,
  credential: z.string().min(1).max(160).optional(),
  matricule: z.string().trim().min(2).max(40).optional(),
  password: z.string().min(8).max(160).optional(),
  phone: phoneSchema.optional(),
  position: z.string().trim().min(2).max(120).optional(),
  accessCode: z.string().trim().max(40).optional(),
  confirmPassword: z.string().max(160).optional(),
  role: z.enum(["student", "staff"]).optional(),
});

export const announcementSchema = z.object({
  title: z.string().trim().min(3).max(160),
  body: z.string().trim().min(3).max(5000),
  status: z.enum(["draft", "published", "scheduled", "archived"]).default("published"),
  publishAt: z.string().datetime().nullable().optional(),
});

export const complaintSchema = z.object({
  category: z.enum(["Mark Complaint", "Bio-Data Correction", "Others"]),
  description: z.string().trim().min(20).max(5000),
});

export const evaluationQuestionSchema = z.object({
  id: z.string().optional(),
  prompt: z.string().trim().min(5).max(2000),
  options: z.array(z.string().trim().min(1).max(500)).length(4),
  correctOptionIndex: z.number().int().min(0).max(3),
  marks: z.number().positive().max(100).default(1),
  explanation: z.string().trim().max(2000).optional().default(""),
  sourceSection: z.string().trim().max(200).optional().default(""),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  approved: z.boolean().default(false),
});

export const evaluationSchema = z.object({
  title: z.string().trim().min(3).max(160),
  courseCode: courseCodeSchema,
  courseTitle: z.string().trim().min(2).max(160),
  department: z.string().trim().min(2).max(120),
  level: z.string().trim().min(2).max(40),
  semester: z.string().trim().min(2).max(40),
  academicYear: z.string().trim().min(4).max(20),
  instructions: z.string().trim().max(2000).optional().default(""),
  durationMinutes: z.number().int().min(1).max(240),
  opensAt: z.string().datetime(),
  closesAt: z.string().datetime(),
  attemptLimit: z.number().int().min(1).max(10).default(1),
  shuffleQuestions: z.boolean().default(false),
  shuffleOptions: z.boolean().default(false),
  releaseMode: z.enum(["immediate", "after_close", "manual"]).default("immediate"),
  status: z.enum(["draft", "published", "paused", "closed", "archived"]).default("draft"),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  questions: z.array(evaluationQuestionSchema).min(1).max(200),
});

export const lostFoundSchema = z.object({
  type: z.enum(["LOST", "FOUND"]),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().min(5).max(2000),
  location: z.string().trim().min(2).max(160),
  itemDate: z.string().min(8).max(20),
  contactPreference: z.enum(["phone", "in-app"]).default("in-app"),
});

export const forumTextSchema = z.string().trim().min(1).max(1000).refine(
  (value) => !/(?:https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|org|net|edu|io|co|cm)\b|<a\s|&#x?[0-9a-f]+;)/i.test(value),
  "Links are not allowed in the General Forum.",
);

export function parseBody<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    const error = new Error(result.error.issues[0]?.message || "Invalid request.") as Error & { status?: number };
    error.status = 400;
    throw error;
  }
  return result.data;
}
