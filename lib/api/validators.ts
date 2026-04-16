import { z } from "zod";

export const createSessionBodySchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
});

export const postMessageBodySchema = z.object({
  content: z.string().min(1).max(100_000),
});

/** Accepts an empty JSON object (strict). */
export const connectDisconnectBodySchema = z.object({}).strict();
