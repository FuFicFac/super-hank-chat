import { NextResponse } from "next/server";

const GOOGLE_TTS_URL =
  "https://texttospeech.googleapis.com/v1/text:synthesize";

export async function POST(req: Request) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "TTS not configured — GOOGLE_API_KEY is missing" },
      { status: 501 },
    );
  }

  let text: string;
  try {
    const body = await req.json();
    text = body.text;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  if (!text || typeof text !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'text' field" },
      { status: 400 },
    );
  }

  // Truncate very long text to avoid API limits
  const truncated = text.slice(0, 5000);

  try {
    const res = await fetch(`${GOOGLE_TTS_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text: truncated },
        voice: { languageCode: "en-US", name: "en-US-Neural2-F" },
        audioConfig: { audioEncoding: "MP3" },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "Unknown error");
      console.error("[TTS] Google API error:", res.status, errBody);
      return NextResponse.json(
        { error: "Google TTS API error" },
        { status: 502 },
      );
    }

    const data = await res.json();
    const audioContent: string = data.audioContent;

    if (!audioContent) {
      return NextResponse.json(
        { error: "No audio content in response" },
        { status: 502 },
      );
    }

    // audioContent is base64-encoded MP3
    const audioBuffer = Buffer.from(audioContent, "base64");

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audioBuffer.length),
      },
    });
  } catch (err) {
    console.error("[TTS] Fetch error:", err);
    return NextResponse.json(
      { error: "Failed to reach Google TTS API" },
      { status: 502 },
    );
  }
}
