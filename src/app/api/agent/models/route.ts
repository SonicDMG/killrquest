import { NextResponse } from "next/server";

export const runtime = "nodejs";

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";

export async function GET() {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ models: [], error: `Ollama returned ${res.status}` });
    }
    const data = (await res.json()) as {
      models: { name: string; capabilities?: string[] }[];
    };

    // Only surface models that declare tool-use capability
    const models = data.models
      .filter((m) => m.capabilities?.includes("tools"))
      .map((m) => m.name);

    return NextResponse.json({ models });
  } catch {
    return NextResponse.json({ models: [], error: "Ollama unreachable" });
  }
}
