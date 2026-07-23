import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";

const OPENAI_MODELS = ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"];
const OPENROUTER_MODELS = [
  "openai/gpt-4o",
  "anthropic/claude-3-5-sonnet",
  "meta-llama/llama-3.3-70b-instruct",
];

export async function GET(req: NextRequest) {
  const provider = req.nextUrl.searchParams.get("provider") ?? "ollama";

  if (provider === "openai") {
    return NextResponse.json({ models: OPENAI_MODELS });
  }

  if (provider === "openrouter") {
    return NextResponse.json({ models: OPENROUTER_MODELS });
  }

  // Default: Ollama — fetch live model list and filter to tool-capable
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ models: [], error: `Ollama returned ${res.status}` });
    }
    const data = (await res.json()) as {
      models: { name: string; capabilities?: string[] }[];
    };
    const models = data.models
      .filter((m) => m.capabilities?.includes("tools"))
      .map((m) => m.name);
    return NextResponse.json({ models });
  } catch {
    return NextResponse.json({ models: [], error: "Ollama unreachable" });
  }
}
