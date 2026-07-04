import { NextResponse } from "next/server";
import {
  generateImageRequestSchema,
  generateOpenAiImage,
} from "@/lib/images/openai-image";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const parsed = generateImageRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid image request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const image = await generateOpenAiImage(parsed.data);
    return NextResponse.json(image);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Image generation failed";
    const status = message.includes("OPENAI_API_KEY") ? 501 : 502;

    console.error("[Images] OpenAI image generation failed:", err);
    return NextResponse.json({ error: message }, { status });
  }
}
