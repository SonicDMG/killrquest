import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const providers = [];

  // Ollama is always available
  providers.push({
    id: "ollama",
    label: "Ollama",
    baseUrl: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
  });

  if (process.env.OPENAI_API_KEY) {
    providers.push({ id: "openai", label: "OpenAI" });
  }

  if (process.env.OPENROUTER_API_KEY) {
    providers.push({ id: "openrouter", label: "OpenRouter" });
  }

  return NextResponse.json({ providers });
}
