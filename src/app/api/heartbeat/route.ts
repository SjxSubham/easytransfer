import { NextRequest, NextResponse } from "next/server";
import { updateHeartbeat, getSessionFiles } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Session ID is required" },
        { status: 400 },
      );
    }

    const updated = updateHeartbeat(sessionId);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Session not found or expired" },
        { status: 404 },
      );
    }

    const files = getSessionFiles(sessionId);

    return NextResponse.json({
      success: true,
      activeFiles: files.length,
      files: files.map((f) => ({
        code: f.code,
        fileName: f.originalName,
        fileSize: f.size,
      })),
    });
  } catch (error) {
    console.error("[Heartbeat] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
