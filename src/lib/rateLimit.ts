// Rate limiting module for IP-based upload restrictions
// Limits each IP to MAX_UPLOADS_PER_IP uploads

const MAX_UPLOADS_PER_IP = parseInt(process.env.MAX_UPLOADS_PER_IP || '3', 10);
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '3600000', 10); // 1 hour default

interface RateLimitEntry {
  count: number;
  firstUploadAt: number;
  uploads: string[]; // Array of upload codes for this IP
}

// In-memory storage for rate limiting
// In production, use Redis or similar for distributed rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitStore.entries()) {
    if (now - entry.firstUploadAt > RATE_LIMIT_WINDOW_MS) {
      rateLimitStore.delete(ip);
    }
  }
}, 60000); // Cleanup every minute

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  message?: string;
}

/**
 * Check if an IP is allowed to upload
 */
export function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  // No previous uploads from this IP
  if (!entry) {
    return {
      allowed: true,
      remaining: MAX_UPLOADS_PER_IP,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    };
  }

  // Check if the rate limit window has expired
  if (now - entry.firstUploadAt > RATE_LIMIT_WINDOW_MS) {
    // Reset the entry
    rateLimitStore.delete(ip);
    return {
      allowed: true,
      remaining: MAX_UPLOADS_PER_IP,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    };
  }

  // Check if under the limit
  const remaining = MAX_UPLOADS_PER_IP - entry.count;

  if (remaining > 0) {
    return {
      allowed: true,
      remaining: remaining,
      resetAt: entry.firstUploadAt + RATE_LIMIT_WINDOW_MS,
    };
  }

  // Rate limit exceeded
  return {
    allowed: false,
    remaining: 0,
    resetAt: entry.firstUploadAt + RATE_LIMIT_WINDOW_MS,
    message: `Rate limit exceeded. You can only upload ${MAX_UPLOADS_PER_IP} files per hour. Please try again later.`,
  };
}

/**
 * Record an upload for rate limiting
 */
export function recordUpload(ip: string, code: string): void {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now - entry.firstUploadAt > RATE_LIMIT_WINDOW_MS) {
    // Create new entry
    rateLimitStore.set(ip, {
      count: 1,
      firstUploadAt: now,
      uploads: [code],
    });
  } else {
    // Update existing entry
    entry.count += 1;
    entry.uploads.push(code);
  }
}

/**
 * Remove an upload from rate limit tracking (when file is deleted)
 * Note: This doesn't decrement the count to prevent gaming the system
 */
export function removeUploadFromTracking(ip: string, code: string): void {
  const entry = rateLimitStore.get(ip);
  if (entry) {
    const index = entry.uploads.indexOf(code);
    if (index > -1) {
      entry.uploads.splice(index, 1);
    }
  }
}

/**
 * Get rate limit info for an IP
 */
export function getRateLimitInfo(ip: string): RateLimitResult {
  return checkRateLimit(ip);
}

/**
 * Get uploads associated with an IP
 */
export function getUploadsForIP(ip: string): string[] {
  const entry = rateLimitStore.get(ip);
  return entry ? [...entry.uploads] : [];
}

/**
 * Clear rate limit for an IP (admin use only)
 */
export function clearRateLimit(ip: string): void {
  rateLimitStore.delete(ip);
}

/**
 * Get the maximum uploads allowed per IP
 */
export function getMaxUploadsPerIP(): number {
  return MAX_UPLOADS_PER_IP;
}
