// In-memory storage for files and sessions
// Uses global singleton pattern to persist across Next.js hot reloads
// For production, consider using Redis (Upstash) + Blob storage (Vercel Blob/S3)

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

// Configuration
const SESSION_TIMEOUT = parseInt(process.env.SESSION_TIMEOUT || "60000", 10); // 60 seconds without heartbeat (increased from 15)
const CLEANUP_INTERVAL = 10000; // Check for stale sessions every 10 seconds

// Global storage interface
interface GlobalStorage {
  files: Map<string, StoredFile>;
  codeToFileId: Map<string, string>;
  sessionToFileIds: Map<string, Set<string>>;
  cleanupIntervalId: NodeJS.Timeout | null;
  initialized: boolean;
}

// Extend globalThis to include our storage
declare global {
  // eslint-disable-next-line no-var
  var __easytransfer_storage: GlobalStorage | undefined;
}

// Initialize or get the global storage singleton
function getStorage(): GlobalStorage {
  if (!global.__easytransfer_storage) {
    console.log("[Storage] Initializing new global storage instance");
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

// Get storage maps
const storage = getStorage();

// Generate a unique 4-digit alphanumeric code
export function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing chars like O, 0, I, 1
  let code: string;
  let attempts = 0;
  const maxAttempts = 100;

  do {
    code = "";
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    attempts++;
    // Prevent infinite loop if all codes are taken
    if (attempts >= maxAttempts) {
      throw new Error("Unable to generate unique code");
    }
  } while (storage.codeToFileId.has(code));

  return code;
}

// Generate a session ID
export function generateSessionId(): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let sessionId = "";
  for (let i = 0; i < 32; i++) {
    sessionId += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return sessionId;
}

// Store a file
export function storeFile(
  filename: string,
  originalName: string,
  mimeType: string,
  data: Buffer,
  uploaderIp: string,
  sessionId: string,
): StoredFile {
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

  // Track session files
  if (!storage.sessionToFileIds.has(sessionId)) {
    storage.sessionToFileIds.set(sessionId, new Set());
  }
  storage.sessionToFileIds.get(sessionId)!.add(id);

  console.log(
    `[Storage] File stored: ${originalName} (${code}) - Session: ${sessionId.substring(0, 8)}... | Total files: ${storage.files.size}`,
  );

  // Debug: List all stored codes
  console.log(
    `[Storage] Active codes: ${Array.from(storage.codeToFileId.keys()).join(", ")}`,
  );

  return file;
}

// Get file by code (without timeout check - for debugging)
export function getFileByCodeRaw(code: string): StoredFile | null {
  const normalizedCode = code.toUpperCase().trim();
  const fileId = storage.codeToFileId.get(normalizedCode);

  console.log(
    `[Storage] Looking for code: "${normalizedCode}" | Found fileId: ${fileId || "NOT FOUND"}`,
  );
  console.log(
    `[Storage] Available codes: ${Array.from(storage.codeToFileId.keys()).join(", ") || "NONE"}`,
  );

  if (!fileId) return null;

  const file = storage.files.get(fileId);
  if (!file) {
    console.log(
      `[Storage] FileId ${fileId} exists in codeToFileId but not in files map!`,
    );
    return null;
  }

  return file;
}

// Get file by code (with session timeout check)
export function getFileByCode(code: string): StoredFile | null {
  const file = getFileByCodeRaw(code);
  if (!file) return null;

  // Check if session is still active (has recent heartbeat)
  const timeSinceHeartbeat = Date.now() - file.lastHeartbeat;
  console.log(
    `[Storage] File ${code} - Time since heartbeat: ${timeSinceHeartbeat}ms (timeout: ${SESSION_TIMEOUT}ms)`,
  );

  if (timeSinceHeartbeat > SESSION_TIMEOUT) {
    console.log(
      `[Storage] File ${code} session expired (${timeSinceHeartbeat}ms since last heartbeat)`,
    );
    deleteFile(file.id);
    return null;
  }

  return file;
}

// Check if code exists and is active
export function isCodeActive(code: string): boolean {
  return getFileByCode(code) !== null;
}

// Update heartbeat for a session
export function updateHeartbeat(sessionId: string): boolean {
  const fileIds = storage.sessionToFileIds.get(sessionId);
  if (!fileIds || fileIds.size === 0) {
    console.log(
      `[Storage] Heartbeat failed - no files for session: ${sessionId.substring(0, 8)}...`,
    );
    return false;
  }

  const now = Date.now();
  for (const fileId of fileIds) {
    const file = storage.files.get(fileId);
    if (file) {
      file.lastHeartbeat = now;
      console.log(`[Storage] Heartbeat updated for file: ${file.code}`);
    }
  }

  return true;
}

// Delete a specific file
export function deleteFile(fileId: string): boolean {
  const file = storage.files.get(fileId);
  if (!file) return false;

  // Remove from all maps
  storage.codeToFileId.delete(file.code);
  storage.files.delete(fileId);

  // Remove from session tracking
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

// Delete all files for a session (when user closes tab)
export function deleteSession(sessionId: string): number {
  const fileIds = storage.sessionToFileIds.get(sessionId);
  if (!fileIds) return 0;

  // Create a copy of the set to avoid modification during iteration
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

// Get files for a session
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

// Cleanup expired sessions
export function cleanupExpiredSessions(): number {
  const now = Date.now();
  let cleanedCount = 0;

  // Create a copy of entries to avoid modification during iteration
  const entries = Array.from(storage.files.entries());

  for (const [fileId, file] of entries) {
    const timeSinceHeartbeat = now - file.lastHeartbeat;
    if (timeSinceHeartbeat > SESSION_TIMEOUT) {
      console.log(
        `[Storage] Cleaning up expired file: ${file.code} (${timeSinceHeartbeat}ms since heartbeat)`,
      );
      deleteFile(fileId);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    console.log(`[Storage] Cleaned up ${cleanedCount} expired files`);
  }

  return cleanedCount;
}

// Get storage stats
export function getStorageStats() {
  return {
    totalFiles: storage.files.size,
    totalSessions: storage.sessionToFileIds.size,
    totalSize: Array.from(storage.files.values()).reduce(
      (sum, f) => sum + f.size,
      0,
    ),
    activeCodes: Array.from(storage.codeToFileId.keys()),
  };
}

// Start cleanup interval
export function startCleanupInterval() {
  if (storage.cleanupIntervalId) return;

  storage.cleanupIntervalId = setInterval(() => {
    cleanupExpiredSessions();
  }, CLEANUP_INTERVAL);

  console.log("[Storage] Cleanup interval started");
}

export function stopCleanupInterval() {
  if (storage.cleanupIntervalId) {
    clearInterval(storage.cleanupIntervalId);
    storage.cleanupIntervalId = null;
    console.log("[Storage] Cleanup interval stopped");
  }
}

// Auto-start cleanup on module load (for server-side only)
if (typeof window === "undefined") {
  startCleanupInterval();
}
