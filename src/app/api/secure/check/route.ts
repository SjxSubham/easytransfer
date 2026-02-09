import { NextRequest, NextResponse } from "next/server";
import { getFileByCode } from "@/lib/storage";
import { verifyToken, isJWTFormat } from "@/lib/jwt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    if (!isJWTFormat(token)) {
      return NextResponse.json(
        {
          success: false,
          available: false,
          error:
            "Invalid token format. Please paste the full token you received.",
        },
        { status: 400 },
      );
    }

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
