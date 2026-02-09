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

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const clientIP = getClientIP(request.headers);

    // Check rate limit
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

    // Parse the multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const sessionId =
      (formData.get("sessionId") as string) || generateSessionId();

    // Validate file exists
    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: "No file provided",
        },
        { status: 400 },
      );
    }

    // Validate file size
    if (!isValidFileSize(file.size)) {
      return NextResponse.json(
        {
          success: false,
          error: `File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}. Your file is ${formatFileSize(file.size)}.`,
        },
        { status: 400 },
      );
    }

    // Validate file size is not zero
    if (file.size === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot upload empty files",
        },
        { status: 400 },
      );
    }

    // Read file data
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Sanitize filename
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

    // Store the file
    const storedFile = storeFile(
      sanitizedFilename,
      file.name,
      file.type || "application/octet-stream",
      buffer,
      clientIP,
      sessionId,
    );

    // Record this upload for rate limiting
    recordUpload(clientIP, storedFile.code);

    // Generate a signed JWT token containing file access info
    const token = signToken({
      code: storedFile.code,
      fileId: storedFile.id,
      fileName: storedFile.originalName,
      fileSize: storedFile.size,
      mimeType: storedFile.mimeType,
      uploadedAt: storedFile.uploadedAt,
    });

    console.log(
      `[Secure Upload] File stored with JWT: ${storedFile.originalName} (${storedFile.code}) - Token length: ${token.length}`,
    );

    // Return success with JWT token instead of plain code
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

    // Handle specific errors
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

// Handle preflight requests for CORS
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
