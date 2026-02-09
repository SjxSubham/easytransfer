// File entry stored in memory
export interface FileEntry {
  id: string;
  code: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileData: Buffer;
  uploadedAt: number;
  lastHeartbeat: number;
  uploaderIp: string;
  sessionId: string;
}

// Rate limit entry for tracking IP usage
export interface RateLimitEntry {
  ip: string;
  uploadCount: number;
  totalSize: number;
  firstUploadAt: number;
  lastUploadAt: number;
}

// API Response types
export interface UploadResponse {
  success: boolean;
  code?: string;
  sessionId?: string;
  fileName?: string;
  fileSize?: number;
  error?: string;
  remainingUploads?: number;
}

export interface DownloadResponse {
  success: boolean;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  error?: string;
}

export interface CheckResponse {
  success: boolean;
  available: boolean;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  error?: string;
}

export interface HeartbeatResponse {
  success: boolean;
  error?: string;
  activeFiles?: number;
}

// Client-side file state
export interface ActiveFile {
  code: string;
  sessionId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: number;
}

// Upload status for UI
export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

// Download status for UI
export type DownloadStatus = 'idle' | 'checking' | 'ready' | 'downloading' | 'error' | 'not-found';

// Connection status
export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';
