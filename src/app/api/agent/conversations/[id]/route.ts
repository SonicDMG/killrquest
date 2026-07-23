import { NextRequest, NextResponse } from "next/server";
import { getConversation } from "@/lib/conversations";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conversation = await getConversation(params.id);
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
    return NextResponse.json({ conversation });
  } catch (e) {
    console.error("[conversations] get error:", e);
    return NextResponse.json({ error: "Failed to load conversation" }, { status: 500 });
  }
}
