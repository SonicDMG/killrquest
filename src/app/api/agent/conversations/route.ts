import { NextResponse } from "next/server";
import { listConversations } from "@/lib/conversations";

export const runtime = "nodejs";

export async function GET() {
  try {
    const conversations = await listConversations();
    return NextResponse.json({ conversations });
  } catch (e) {
    console.error("[conversations] list error:", e);
    return NextResponse.json({ conversations: [], error: "Failed to load conversations" });
  }
}
