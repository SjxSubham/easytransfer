import { NextRequest, NextResponse } from "next/server";
import { getFileByCode } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;

    if (!code) {
      return NextResponse.json(
        { success: false, error: "Code is required" },
        { status: 400 },
      );
    }

    const normalizedCode = code.toUpperCase().trim();

    if (!/^[A-Z0-9]{4}$/.test(normalizedCode)) {
      return NextResponse.json(
        { success: false, error: "Invalid code format" },
        { status: 400 },
      );
    }

    const file = getFileByCode(normalizedCode);

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error:
            "File not found or the sharing session has expired. The file owner may have closed their browser tab.",
        },
        { status: 404 },
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
      },
    });

    console.log(
      `[Download] File downloaded: ${file.originalName} (${normalizedCode})`,
    );

    return response;
  } catch (error) {
    console.error("[Download] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to download file" },
      { status: 500 },
    );
  }
}

export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;

    if (!code) {
      return new NextResponse(null, { status: 400 });
    }

    const normalizedCode = code.toUpperCase().trim();

    if (!/^[A-Z0-9]{4}$/.test(normalizedCode)) {
      return new NextResponse(null, { status: 400 });
    }

    const file = getFileByCode(normalizedCode);

    if (!file) {
      return new NextResponse(null, { status: 404 });
    }

    return new NextResponse(null, {
      status: 200,
      headers: {
        "Content-Type": file.mimeType || "application/octet-stream",
        "Content-Length": file.size.toString(),
        "X-File-Name": encodeURIComponent(file.originalName),
        "X-File-Size": file.size.toString(),
      },
    });
  } catch (error) {
    console.error("[Download HEAD] Error:", error);
    return new NextResponse(null, { status: 500 });
  }
}
