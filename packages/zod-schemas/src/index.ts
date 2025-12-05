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

export const createIndexCardSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  type: z.enum(["text", "url", "pdf", "youtube", "tweet", "spotify", "audio"]),
  source: z.string(),
});

export const createPreSignedUrlSchema = z.object({
  fileName: z.string(),
  contentType: z.string(),
});
