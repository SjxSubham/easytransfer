import { NextRequest, NextResponse } from "next/server";
import { deleteSession } from "@/lib/storage";

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

    const deletedCount = deleteSession(sessionId);

    console.log(
      `[Session] Deleted session ${sessionId.substring(0, 8)}... (${deletedCount} files)`,
    );

    return NextResponse.json({
      success: true,
      deletedFiles: deletedCount,
    });
  } catch (error) {
    console.error("[Session] Delete error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Session ID is required" },
        { status: 400 },
      );
    }

    const deletedCount = deleteSession(sessionId);

    return NextResponse.json({
      success: true,
      deletedFiles: deletedCount,
    });
  } catch (error) {
    console.error("[Session] Delete error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
