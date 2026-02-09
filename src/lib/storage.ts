// In-memory storage for files and sessions
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

// In-memory storage maps
const files = new Map<string, StoredFile>();
const codeToFileId = new Map<string, string>();
const sessionToFileIds = new Map<string, Set<string>>();

// Configuration
const SESSION_TIMEOUT = parseInt(process.env.SESSION_TIMEOUT || '15000', 10); // 15 seconds without heartbeat
const CLEANUP_INTERVAL = 5000; // Check for stale sessions every 5 seconds

// Generate a unique 4-digit alphanumeric code
export function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars like O, 0, I, 1
  let code: string;
  let attempts = 0;
  const maxAttempts = 100;

  do {
    code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    attempts++;
    // Prevent infinite loop if all codes are taken
    if (attempts >= maxAttempts) {
      throw new Error('Unable to generate unique code');
    }
  } while (codeToFileId.has(code));

  return code;
}

// Generate a session ID
export function generateSessionId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let sessionId = '';
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
  sessionId: string
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

  files.set(id, file);
  codeToFileId.set(code, id);

  // Track session files
  if (!sessionToFileIds.has(sessionId)) {
    sessionToFileIds.set(sessionId, new Set());
  }
  sessionToFileIds.get(sessionId)!.add(id);

  console.log(`[Storage] File stored: ${originalName} (${code}) - Session: ${sessionId.substring(0, 8)}...`);

  return file;
}

// Get file by code
export function getFileByCode(code: string): StoredFile | null {
  const fileId = codeToFileId.get(code.toUpperCase());
  if (!fileId) return null;

  const file = files.get(fileId);
  if (!file) return null;

  // Check if session is still active (has recent heartbeat)
  const timeSinceHeartbeat = Date.now() - file.lastHeartbeat;
  if (timeSinceHeartbeat > SESSION_TIMEOUT) {
    console.log(`[Storage] File ${code} session expired (${timeSinceHeartbeat}ms since last heartbeat)`);
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
  const fileIds = sessionToFileIds.get(sessionId);
  if (!fileIds || fileIds.size === 0) {
    return false;
  }

  const now = Date.now();
  for (const fileId of fileIds) {
    const file = files.get(fileId);
    if (file) {
      file.lastHeartbeat = now;
    }
  }

  return true;
}

// Delete a specific file
export function deleteFile(fileId: string): boolean {
  const file = files.get(fileId);
  if (!file) return false;

  // Remove from all maps
  codeToFileId.delete(file.code);
  files.delete(fileId);

  // Remove from session tracking
  const sessionFiles = sessionToFileIds.get(file.sessionId);
  if (sessionFiles) {
    sessionFiles.delete(fileId);
    if (sessionFiles.size === 0) {
      sessionToFileIds.delete(file.sessionId);
    }
  }

  console.log(`[Storage] File deleted: ${file.originalName} (${file.code})`);

  return true;
}

// Delete all files for a session (when user closes tab)
export function deleteSession(sessionId: string): number {
  const fileIds = sessionToFileIds.get(sessionId);
  if (!fileIds) return 0;

  let deletedCount = 0;
  for (const fileId of fileIds) {
    if (deleteFile(fileId)) {
      deletedCount++;
    }
  }

  sessionToFileIds.delete(sessionId);
  console.log(`[Storage] Session ${sessionId.substring(0, 8)}... deleted (${deletedCount} files)`);

  return deletedCount;
}

// Get files for a session
export function getSessionFiles(sessionId: string): StoredFile[] {
  const fileIds = sessionToFileIds.get(sessionId);
  if (!fileIds) return [];

  const result: StoredFile[] = [];
  for (const fileId of fileIds) {
    const file = files.get(fileId);
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

  for (const [fileId, file] of files) {
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

// Get storage stats
export function getStorageStats() {
  return {
    totalFiles: files.size,
    totalSessions: sessionToFileIds.size,
    totalSize: Array.from(files.values()).reduce((sum, f) => sum + f.size, 0),
  };
}

// Start cleanup interval
let cleanupIntervalId: NodeJS.Timeout | null = null;

export function startCleanupInterval() {
  if (cleanupIntervalId) return;

  cleanupIntervalId = setInterval(() => {
    cleanupExpiredSessions();
  }, CLEANUP_INTERVAL);

  console.log('[Storage] Cleanup interval started');
}

export function stopCleanupInterval() {
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
    console.log('[Storage] Cleanup interval stopped');
  }
}

// Auto-start cleanup on module load (for server-side only)
if (typeof window === 'undefined') {
  startCleanupInterval();
}
