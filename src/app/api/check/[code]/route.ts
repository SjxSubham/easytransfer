import { NextRequest, NextResponse } from "next/server";
import { getFileByCode, getStorageStats } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{
    code: string;
  }>;
}

/**
 * GET /api/check/[code]
 * Check if a code exists and the file is available for download
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { code } = await params;

    console.log(`[Check API] Checking code: "${code}"`);

    // Get storage stats for debugging
    const stats = getStorageStats();
    console.log(`[Check API] Storage stats:`, {
      totalFiles: stats.totalFiles,
      activeCodes: stats.activeCodes,
    });

    if (!code || code.length !== 4) {
      return NextResponse.json(
        {
          success: false,
          available: false,
          error: "Invalid code format. Code must be 4 characters.",
          debug: {
            receivedCode: code,
            codeLength: code?.length,
            activeCodes: stats.activeCodes,
          },
        },
        { status: 400 },
      );
    }

    const normalizedCode = code.toUpperCase().trim();
    console.log(`[Check API] Normalized code: "${normalizedCode}"`);

    const file = getFileByCode(normalizedCode);

    if (!file) {
      console.log(`[Check API] File not found for code: ${normalizedCode}`);
      return NextResponse.json(
        {
          success: true,
          available: false,
          error:
            "File not found or session has expired. The uploader may have closed their tab.",
          debug: {
            searchedCode: normalizedCode,
            totalFilesInStorage: stats.totalFiles,
            activeCodes: stats.activeCodes,
          },
        },
        { status: 404 },
      );
    }

    console.log(`[Check API] File found: ${file.originalName} (${file.code})`);

    // File is available
    return NextResponse.json({
      success: true,
      available: true,
      fileName: file.originalName,
      fileSize: file.size,
      fileType: file.mimeType,
      uploadedAt: file.uploadedAt,
      debug: {
        code: file.code,
        sessionId: file.sessionId.substring(0, 8) + "...",
        lastHeartbeat: new Date(file.lastHeartbeat).toISOString(),
        ageMs: Date.now() - file.uploadedAt,
      },
    });
  } catch (error) {
    console.error("[Check API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        available: false,
        error: "An error occurred while checking the code.",
      },
      { status: 500 },
    );
  }
}
