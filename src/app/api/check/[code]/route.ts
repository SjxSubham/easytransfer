import { NextRequest, NextResponse } from 'next/server';
import { getFileByCode } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{
    code: string;
  }>;
}

/**
 * GET /api/check/[code]
 * Check if a code exists and the file is available for download
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { code } = await params;

    if (!code || code.length !== 4) {
      return NextResponse.json(
        {
          success: false,
          available: false,
          error: 'Invalid code format. Code must be 4 characters.',
        },
        { status: 400 }
      );
    }

    const normalizedCode = code.toUpperCase();
    const file = getFileByCode(normalizedCode);

    if (!file) {
      return NextResponse.json(
        {
          success: true,
          available: false,
          error: 'File not found or session has expired. The uploader may have closed their tab.',
        },
        { status: 404 }
      );
    }

    // File is available
    return NextResponse.json({
      success: true,
      available: true,
      fileName: file.originalName,
      fileSize: file.size,
      fileType: file.mimeType,
      uploadedAt: file.uploadedAt,
    });
  } catch (error) {
    console.error('[API] Check code error:', error);
    return NextResponse.json(
      {
        success: false,
        available: false,
        error: 'An error occurred while checking the code.',
      },
      { status: 500 }
    );
  }
}
