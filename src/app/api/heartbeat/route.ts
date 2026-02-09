import { NextRequest, NextResponse } from 'next/server';
import { updateHeartbeat, deleteSession, getSessionFiles } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/heartbeat
 * Updates the heartbeat timestamp for a session to keep files alive
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const updated = updateHeartbeat(sessionId);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Session not found or expired' },
        { status: 404 }
      );
    }

    const files = getSessionFiles(sessionId);

    return NextResponse.json({
      success: true,
      activeFiles: files.length,
      files: files.map(f => ({
        code: f.code,
        fileName: f.originalName,
        fileSize: f.size,
      })),
    });
  } catch (error) {
    console.error('[Heartbeat] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/heartbeat
 * Explicitly end a session and delete all associated files
 * Called when user closes the tab (via beforeunload/pagehide)
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const deletedCount = deleteSession(sessionId);

    return NextResponse.json({
      success: true,
      deletedFiles: deletedCount,
    });
  } catch (error) {
    console.error('[Heartbeat] Delete session error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
