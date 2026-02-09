import jwt from "jsonwebtoken";

// JWT secret - in production, always set JWT_SECRET env variable
// Falls back to a generated secret (resets on server restart, which is fine for this ephemeral app)
const JWT_SECRET: string =
  process.env.JWT_SECRET ||
  `easytransfer_fallback_${process.pid}_${Date.now()}`;

// Token expiration time (1 hour)
const TOKEN_EXPIRY = "1h";

export interface JWTPayload {
  code: string;
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: number;
}

export interface VerifiedPayload extends JWTPayload {
  iat: number;
  exp: number;
}

/**
 * Sign a JWT token containing file access information.
 * Only the server can create valid tokens since only it knows the secret.
 */
export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY,
    algorithm: "HS256",
    issuer: "easytransfer",
    subject: "secure-file-access",
  });
}

/**
 * Verify and decode a JWT token.
 * Returns the decoded payload if valid, or null if invalid/expired.
 */
export function verifyToken(token: string): VerifiedPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: "easytransfer",
      subject: "secure-file-access",
    }) as VerifiedPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.log("[JWT] Token expired:", error.expiredAt);
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.log("[JWT] Invalid token:", error.message);
    } else {
      console.error("[JWT] Verification error:", error);
    }
    return null;
  }
}

/**
 * Decode a token without verification (for display/debug purposes only).
 * Do NOT use this for authorization - always use verifyToken().
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.decode(token) as JWTPayload | null;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Get the expiration time of a token in milliseconds since epoch.
 * Returns null if the token is invalid.
 */
export function getTokenExpiry(token: string): number | null {
  try {
    const decoded = jwt.decode(token) as VerifiedPayload | null;
    if (decoded && decoded.exp) {
      return decoded.exp * 1000; // Convert seconds to milliseconds
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Check if a token string looks like a valid JWT format (3 base64url segments).
 * This does NOT verify the signature - use verifyToken() for that.
 */
export function isJWTFormat(token: string): boolean {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  // Check that each part is valid base64url
  const base64urlRegex = /^[A-Za-z0-9_-]+$/;
  return parts.every((part) => base64urlRegex.test(part));
}
