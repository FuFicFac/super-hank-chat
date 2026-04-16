import { z } from "zod";

export const ARTIFACT_TYPES = ["html", "svg", "markdown", "code"] as const;
export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

export const artifactSchema = z.object({
  type: z.enum(ARTIFACT_TYPES),
  title: z.string().optional(),
  id: z.string().optional(),
  language: z.string().optional(), // only meaningful for type=code
  content: z.string(),
});

export type Artifact = z.infer<typeof artifactSchema>;

export type ParsedMessage = {
  prose: string;
  artifact: Artifact | null;
};
