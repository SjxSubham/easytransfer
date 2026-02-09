import { NextRequest, NextResponse } from "next/server";
import { getFileByCode } from "@/lib/storage";
import { verifyToken, isJWTFormat } from "@/lib/jwt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/secure/check
 * Check if a JWT token is valid and the associated file is available.
 * Uses POST to avoid leaking tokens in URL/logs.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          available: false,
          error: "Token is required.",
        },
        { status: 400 },
      );
    }

    // Check if it looks like a JWT
    if (!isJWTFormat(token)) {
      return NextResponse.json(
        {
          success: false,
          available: false,
          error: "Invalid token format. Please paste the full token you received.",
        },
        { status: 400 },
      );
    }

    // Verify the JWT signature and expiration
    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        {
          success: false,
          available: false,
          error:
            "Invalid or expired token. The token may have been tampered with or has expired.",
        },
        { status: 401 },
      );
    }

    // Token is valid - now check if the file still exists in storage
    const file = getFileByCode(payload.code);

    if (!file) {
      return NextResponse.json(
        {
          success: true,
          available: false,
          error:
            "File not found or session has expired. The uploader may have closed their tab.",
        },
        { status: 404 },
      );
    }

    console.log(
      `[Secure Check] Token verified for file: ${file.originalName} (${file.code})`,
    );

    // File is available - return info (from the verified token, not the raw storage)
    return NextResponse.json({
      success: true,
      available: true,
      fileName: file.originalName,
      fileSize: file.size,
      fileType: file.mimeType,
      uploadedAt: file.uploadedAt,
    });
  } catch (error) {
    console.error("[Secure Check] Error:", error);
    return NextResponse.json(
      {
        success: false,
        available: false,
        error: "An error occurred while verifying the token.",
      },
      { status: 500 },
    );
  }
}
