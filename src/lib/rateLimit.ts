const MAX_UPLOADS_PER_IP = parseInt(process.env.MAX_UPLOADS_PER_IP || "3", 10);
const RATE_LIMIT_WINDOW_MS = parseInt(
  process.env.RATE_LIMIT_WINDOW_MS || "3600000",
  10,
);

interface RateLimitEntry {
  count: number;
  firstUploadAt: number;
  uploads: string[];
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [ip, entry] of rateLimitStore.entries()) {
    if (now - entry.firstUploadAt > RATE_LIMIT_WINDOW_MS) {
      rateLimitStore.delete(ip);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  message?: string;
}

export function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry) {
    return {
      allowed: true,
      remaining: MAX_UPLOADS_PER_IP,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    };
  }

  if (now - entry.firstUploadAt > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.delete(ip);
    return {
      allowed: true,
      remaining: MAX_UPLOADS_PER_IP,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    };
  }

  const remaining = MAX_UPLOADS_PER_IP - entry.count;

  if (remaining > 0) {
    return {
      allowed: true,
      remaining: remaining,
      resetAt: entry.firstUploadAt + RATE_LIMIT_WINDOW_MS,
    };
  }

  return {
    allowed: false,
    remaining: 0,
    resetAt: entry.firstUploadAt + RATE_LIMIT_WINDOW_MS,
    message: `Rate limit exceeded. You can only upload ${MAX_UPLOADS_PER_IP} files per hour. Please try again later.`,
  };
}

export function recordUpload(ip: string, code: string): void {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now - entry.firstUploadAt > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(ip, {
      count: 1,
      firstUploadAt: now,
      uploads: [code],
    });
  } else {
    entry.count += 1;
    entry.uploads.push(code);
  }
}
