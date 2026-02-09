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
          error: "Token is required.",
        },
        { status: 400 },
      );
    }

    if (!isJWTFormat(token)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid token format. Please provide a valid access token.",
        },
        { status: 400 },
      );
    }

    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        {
          success: false,
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
          success: false,
          error:
            "File not found or session has expired. The uploader may have closed their tab.",
        },
        { status: 404 },
      );
    }

    if (file.id !== payload.fileId) {
      return NextResponse.json(
        {
          success: false,
          error: "Token does not match the stored file. Access denied.",
        },
        { status: 403 },
      );
    }

    const response = new NextResponse(new Uint8Array(file.data), {
      status: 200,
      headers: {
        "Content-Type": file.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(file.originalName)}"`,
        "Content-Length": file.size.toString(),
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
        "X-File-Name": encodeURIComponent(file.originalName),
        "X-File-Size": file.size.toString(),
        "X-Secured-By": "JWT",
      },
    });

    return response;
  } catch (error) {
    console.error("[Secure Download] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to download file. Please try again.",
      },
      { status: 500 },
    );
  }
}
