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

export interface ActiveFile {
  code: string;
  sessionId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: number;
}

export type UploadStatus = "idle" | "uploading" | "success" | "error";

export type DownloadStatus =
  | "idle"
  | "checking"
  | "ready"
  | "downloading"
  | "error"
  | "not-found";

export type ConnectionStatus = "connected" | "disconnected" | "reconnecting";
