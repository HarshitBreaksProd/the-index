import z from "zod";

export const signupSchema = z.object({
  firstName: z.string().min(3),
  lastName: z.string().min(3),
  email: z.email(),
  password: z.string().min(8, "Password must consist of 8 characters"),
  confirmPassword: z.string(),
});

export const signinSchema = z.object({
  email: z.email(),
  password: z.string().min(8, "Password must consist of 8 characters"),
});

export const createIndexSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  coverImageUrl: z.string(),
});

export const editIndexSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  coverImageUrl: z.string(),
});

export const changeIndexVisibilitySchema = z.object({
  id: z.string(),
  isPublic: z.boolean(),
});

export const createIndexCardSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  type: z.enum(["text", "url", "pdf", "youtube", "tweet", "spotify", "audio"]),
  source: z.string(),
});

export const editIndexCardSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  type: z.enum(["text", "url", "pdf", "youtube", "tweet", "spotify", "audio"]),
  source: z.string(),
});

export const changeIndexCardVisibilitySchema = z.object({
  id: z.string(),
  isPublic: z.boolean(),
});

export const copyIndexCardSchema = z.object({
  id: z.string(),
  indexId: z.string(),
});

export const retryCardProcessingSchema = z.object({
  id: z.string(),
});

export const createPreSignedUrlSchema = z.object({
  fileName: z.string(),
  contentType: z.string(),
});

export const createChatSchema = z.object({
  title: z.string(),
  indexId: z.string(),
});

export const editChatSchema = z.object({
  title: z.string(),
});

export const userMessageSchema = z.object({
  chatId: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

export const firstMessageSchema = z.object({
  indexId: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

export const createTagSchema = z.object({
  title: z.string(),
});
