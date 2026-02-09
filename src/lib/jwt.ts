import jwt from "jsonwebtoken";

const JWT_SECRET: string =
  process.env.JWT_SECRET ||
  `easytransfer_fallback_${process.pid}_${Date.now()}`;

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

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY,
    algorithm: "HS256",
    issuer: "easytransfer",
    subject: "secure-file-access",
  });
}

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
    }
    return null;
  }
}

export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload | null;
  } catch {
    return null;
  }
}

export function getTokenExpiry(token: string): number | null {
  try {
    const decoded = jwt.decode(token) as VerifiedPayload | null;
    if (decoded && decoded.exp) {
      return decoded.exp * 1000;
    }
    return null;
  } catch {
    return null;
  }
}

export function isJWTFormat(token: string): boolean {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const base64urlRegex = /^[A-Za-z0-9_-]+$/;
  return parts.every((part) => base64urlRegex.test(part));
}
