import { NextResponse } from "next/server";
import { getStorageStats } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * GET /api/debug
 * Debug endpoint to check storage state
 */
export async function GET() {
  try {
    const stats = getStorageStats();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      storage: {
        totalFiles: stats.totalFiles,
        totalSessions: stats.totalSessions,
        totalSizeBytes: stats.totalSize,
        totalSizeMB: (stats.totalSize / (1024 * 1024)).toFixed(2),
        activeCodes: stats.activeCodes,
      },
      config: {
        sessionTimeoutMs: parseInt(
          process.env.SESSION_TIMEOUT || "60000",
          10,
        ),
        maxFileSizeMB: 10,
        maxUploadsPerIP: 3,
      },
    });
  } catch (error) {
    console.error("[Debug] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get storage stats",
      },
      { status: 500 },
    );
  }
}
