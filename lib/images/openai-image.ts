import "server-only";
import { z } from "zod";

const OPENAI_IMAGES_URL = "https://api.openai.com/v1/images/generations";

const imageSizeSchema = z.enum([
  "auto",
  "1024x1024",
  "1024x1536",
  "1536x1024",
]);

const imageQualitySchema = z.enum(["auto", "low", "medium", "high"]);

export const generateImageRequestSchema = z.object({
  prompt: z.string().trim().min(1).max(4000),
  size: imageSizeSchema.optional(),
  quality: imageQualitySchema.optional(),
});

export type GenerateImageRequest = z.infer<typeof generateImageRequestSchema>;

export type GeneratedImage = {
  mimeType: "image/png";
  dataUrl: string;
};

type OpenAiImageResponse = {
  data?: Array<{
    b64_json?: string;
    url?: string;
  }>;
  error?: {
    message?: string;
  };
};

export async function generateOpenAiImage(
  input: GenerateImageRequest,
): Promise<GeneratedImage> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing");
  }

  const model = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1";
  const size =
    input.size ?? process.env.OPENAI_IMAGE_SIZE ?? "1024x1024";

  const requestBody: Record<string, unknown> = {
    model,
    prompt: input.prompt,
    size,
  };

  if (input.quality) {
    requestBody.quality = input.quality;
  }

  const response = await fetch(OPENAI_IMAGES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const payload = (await response.json().catch(() => ({}))) as OpenAiImageResponse;

  if (!response.ok) {
    throw new Error(
      payload.error?.message ?? `OpenAI image API error ${response.status}`,
    );
  }

  const firstImage = payload.data?.[0];
  if (!firstImage) {
    throw new Error("OpenAI image API returned no image data");
  }

  if (firstImage.b64_json) {
    return {
      mimeType: "image/png",
      dataUrl: `data:image/png;base64,${firstImage.b64_json}`,
    };
  }

  if (firstImage.url) {
    const imageResponse = await fetch(firstImage.url);
    if (!imageResponse.ok) {
      throw new Error("Failed to download generated image");
    }

    const buffer = Buffer.from(await imageResponse.arrayBuffer());
    return {
      mimeType: "image/png",
      dataUrl: `data:image/png;base64,${buffer.toString("base64")}`,
    };
  }

  throw new Error("OpenAI image API response did not include image data");
}
