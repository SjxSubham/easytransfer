import { NextRequest, NextResponse } from "next/server";
import { getFileByCode } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{
    code: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { code } = await params;

    if (!code || code.length !== 4) {
      return NextResponse.json(
        {
          success: false,
          available: false,
          error: "Invalid code format. Code must be 4 characters.",
        },
        { status: 400 },
      );
    }

    const normalizedCode = code.toUpperCase().trim();
    const file = getFileByCode(normalizedCode);

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
