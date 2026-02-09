import { NextRequest, NextResponse } from "next/server";
import { storeFile, generateSessionId } from "@/lib/storage";
import { checkRateLimit, recordUpload } from "@/lib/rateLimit";
import {
  getClientIP,
  sanitizeFilename,
  isValidFileSize,
  formatFileSize,
} from "@/lib/utils";
import { signToken } from "@/lib/jwt";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request.headers);
    const rateLimitResult = checkRateLimit(clientIP);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error:
            rateLimitResult.message ||
            "Rate limit exceeded. You can only upload 3 files per hour.",
          remaining: 0,
          resetAt: rateLimitResult.resetAt,
        },
        { status: 429 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const sessionId =
      (formData.get("sessionId") as string) || generateSessionId();

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: "No file provided",
        },
        { status: 400 },
      );
    }

    if (!isValidFileSize(file.size)) {
      return NextResponse.json(
        {
          success: false,
          error: `File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}. Your file is ${formatFileSize(file.size)}.`,
        },
        { status: 400 },
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot upload empty files",
        },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const sanitizedFilename = sanitizeFilename(file.name);
    if (!sanitizedFilename) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid filename",
        },
        { status: 400 },
      );
    }

    const storedFile = storeFile(
      sanitizedFilename,
      file.name,
      file.type || "application/octet-stream",
      buffer,
      clientIP,
      sessionId,
    );

    recordUpload(clientIP, storedFile.code);

    const token = signToken({
      code: storedFile.code,
      fileId: storedFile.id,
      fileName: storedFile.originalName,
      fileSize: storedFile.size,
      mimeType: storedFile.mimeType,
      uploadedAt: storedFile.uploadedAt,
    });

    return NextResponse.json({
      success: true,
      token,
      sessionId: sessionId,
      fileName: storedFile.originalName,
      fileSize: storedFile.size,
      fileType: storedFile.mimeType,
      uploadedAt: storedFile.uploadedAt,
      remainingUploads: rateLimitResult.remaining - 1,
    });
  } catch (error) {
    console.error("[Secure Upload] Error:", error);

    if (error instanceof Error) {
      if (error.message === "Unable to generate unique code") {
        return NextResponse.json(
          {
            success: false,
            error: "Server is busy. Please try again in a moment.",
          },
          { status: 503 },
        );
      }
      if (error.message === "Server is at capacity. Please try again later.") {
        return NextResponse.json(
          {
            success: false,
            error:
              "Server is at capacity. Maximum 30 concurrent users reached. Please try again later.",
          },
          { status: 503 },
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to upload file. Please try again.",
      },
      { status: 500 },
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
