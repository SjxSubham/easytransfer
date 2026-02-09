import { cleanupRateLimitStore } from "./rateLimit";

export interface StoredFile {
  id: string;
  code: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  data: Buffer;
  uploadedAt: number;
  lastHeartbeat: number;
  uploaderIp: string;
  sessionId: string;
}

const SESSION_TIMEOUT = parseInt(process.env.SESSION_TIMEOUT || "180000", 10);
const CLEANUP_INTERVAL = 10000;
const MAX_CONCURRENT_SESSIONS = parseInt(
  process.env.MAX_CONCURRENT_SESSIONS || "30",
  10,
);

interface GlobalStorage {
  files: Map<string, StoredFile>;
  codeToFileId: Map<string, string>;
  sessionToFileIds: Map<string, Set<string>>;
  cleanupIntervalId: NodeJS.Timeout | null;
  initialized: boolean;
}

declare global {
  // eslint-disable-next-line no-var
  var __easytransfer_storage: GlobalStorage | undefined;
}

function getStorage(): GlobalStorage {
  if (!global.__easytransfer_storage) {
    global.__easytransfer_storage = {
      files: new Map<string, StoredFile>(),
      codeToFileId: new Map<string, string>(),
      sessionToFileIds: new Map<string, Set<string>>(),
      cleanupIntervalId: null,
      initialized: true,
    };
  }
  return global.__easytransfer_storage;
}

const storage = getStorage();

export function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code: string;
  let attempts = 0;
  const maxAttempts = 100;

  do {
    code = "";
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    attempts++;
    if (attempts >= maxAttempts) {
      throw new Error("Unable to generate unique code");
    }
  } while (storage.codeToFileId.has(code));

  return code;
}

export function generateSessionId(): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let sessionId = "";
  for (let i = 0; i < 32; i++) {
    sessionId += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return sessionId;
}

export function canAcceptNewSession(sessionId: string): boolean {
  if (storage.sessionToFileIds.has(sessionId)) {
    return true;
  }
  return storage.sessionToFileIds.size < MAX_CONCURRENT_SESSIONS;
}

export function getActiveSessions(): number {
  return storage.sessionToFileIds.size;
}

export function getMaxConcurrentSessions(): number {
  return MAX_CONCURRENT_SESSIONS;
}

export function storeFile(
  filename: string,
  originalName: string,
  mimeType: string,
  data: Buffer,
  uploaderIp: string,
  sessionId: string,
): StoredFile {
  if (!canAcceptNewSession(sessionId)) {
    throw new Error("Server is at capacity. Please try again later.");
  }

  const id = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const code = generateCode();
  const now = Date.now();

  const file: StoredFile = {
    id,
    code,
    filename,
    originalName,
    mimeType,
    size: data.length,
    data,
    uploadedAt: now,
    lastHeartbeat: now,
    uploaderIp,
    sessionId,
  };

  storage.files.set(id, file);
  storage.codeToFileId.set(code, id);

  if (!storage.sessionToFileIds.has(sessionId)) {
    storage.sessionToFileIds.set(sessionId, new Set());
  }
  storage.sessionToFileIds.get(sessionId)!.add(id);

  console.log(
    `[Storage] File stored: ${originalName} (${code}) | Session: ${sessionId.substring(0, 8)}... | Total files: ${storage.files.size}`,
  );

  return file;
}

export function getFileByCode(code: string): StoredFile | null {
  const normalizedCode = code.toUpperCase().trim();
  const fileId = storage.codeToFileId.get(normalizedCode);

  if (!fileId) return null;

  const file = storage.files.get(fileId);
  if (!file) return null;

  const timeSinceHeartbeat = Date.now() - file.lastHeartbeat;

  if (timeSinceHeartbeat > SESSION_TIMEOUT) {
    console.log(`[Storage] File ${code} session expired`);
    deleteFile(file.id);
    return null;
  }

  return file;
}

export function updateHeartbeat(sessionId: string): boolean {
  const fileIds = storage.sessionToFileIds.get(sessionId);
  if (!fileIds || fileIds.size === 0) return false;

  const now = Date.now();
  for (const fileId of fileIds) {
    const file = storage.files.get(fileId);
    if (file) {
      file.lastHeartbeat = now;
    }
  }

  return true;
}

export function deleteFile(fileId: string): boolean {
  const file = storage.files.get(fileId);
  if (!file) return false;

  storage.codeToFileId.delete(file.code);
  storage.files.delete(fileId);

  const sessionFiles = storage.sessionToFileIds.get(file.sessionId);
  if (sessionFiles) {
    sessionFiles.delete(fileId);
    if (sessionFiles.size === 0) {
      storage.sessionToFileIds.delete(file.sessionId);
    }
  }

  console.log(`[Storage] File deleted: ${file.originalName} (${file.code})`);
  return true;
}

export function deleteSession(sessionId: string): number {
  const fileIds = storage.sessionToFileIds.get(sessionId);
  if (!fileIds) return 0;

  const fileIdsCopy = Array.from(fileIds);
  let deletedCount = 0;

  for (const fileId of fileIdsCopy) {
    if (deleteFile(fileId)) {
      deletedCount++;
    }
  }

  storage.sessionToFileIds.delete(sessionId);
  console.log(
    `[Storage] Session ${sessionId.substring(0, 8)}... deleted (${deletedCount} files)`,
  );

  return deletedCount;
}

export function getSessionFiles(sessionId: string): StoredFile[] {
  const fileIds = storage.sessionToFileIds.get(sessionId);
  if (!fileIds) return [];

  const result: StoredFile[] = [];
  for (const fileId of fileIds) {
    const file = storage.files.get(fileId);
    if (file) {
      result.push(file);
    }
  }

  return result;
}

export function cleanupExpiredSessions(): number {
  const now = Date.now();
  let cleanedCount = 0;

  const entries = Array.from(storage.files.entries());

  for (const [fileId, file] of entries) {
    const timeSinceHeartbeat = now - file.lastHeartbeat;
    if (timeSinceHeartbeat > SESSION_TIMEOUT) {
      deleteFile(fileId);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    console.log(`[Storage] Cleaned up ${cleanedCount} expired files`);
  }

  return cleanedCount;
}

export function getStorageStats() {
  return {
    totalFiles: storage.files.size,
    totalSessions: storage.sessionToFileIds.size,
    maxConcurrentSessions: MAX_CONCURRENT_SESSIONS,
    totalSize: Array.from(storage.files.values()).reduce(
      (sum, f) => sum + f.size,
      0,
    ),
    activeCodes: Array.from(storage.codeToFileId.keys()),
  };
}

function startCleanupInterval() {
  if (storage.cleanupIntervalId) return;

  storage.cleanupIntervalId = setInterval(() => {
    cleanupExpiredSessions();
    cleanupRateLimitStore();
  }, CLEANUP_INTERVAL);
}

if (typeof window === "undefined") {
  startCleanupInterval();
}
