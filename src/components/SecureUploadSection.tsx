"use client";

import { useState, useCallback, useRef } from "react";
import {
  Upload,
  FileUp,
  AlertCircle,
  CheckCircle,
  Loader2,
  Shield,
} from "lucide-react";
import { UploadStatus, ActiveFile } from "@/types";
import TokenDisplay from "./TokenDisplay";
import FileCard from "./FileCard";

interface SecureUploadSectionProps {
  sessionId: string;
  activeFiles: ActiveFile[];
  remainingUploads: number;
  onUploadSuccess: (file: ActiveFile) => void;
  onFileRemove: (code: string) => void;
}

interface SecureActiveFile extends ActiveFile {
  token: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function SecureUploadSection({
  sessionId,
  activeFiles,
  remainingUploads,
  onUploadSuccess,
  onFileRemove,
}: SecureUploadSectionProps) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [lastUploadedFile, setLastUploadedFile] =
    useState<SecureActiveFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use refs to avoid stale closures
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;
  const remainingUploadsRef = useRef(remainingUploads);
  remainingUploadsRef.current = remainingUploads;

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const validateFile = useCallback((file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File is too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}. Your file is ${formatFileSize(file.size)}.`;
    }
    if (file.size === 0) {
      return "Cannot upload empty files.";
    }
    if (remainingUploadsRef.current <= 0) {
      return "Rate limit exceeded. You can only upload 3 files per hour.";
    }
    return null;
  }, []);

  const uploadFile = useCallback(
    async (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        setStatus("error");
        return;
      }

      setStatus("uploading");
      setError(null);
      setUploadProgress(0);

      let progressInterval: NodeJS.Timeout | null = null;

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("sessionId", sessionIdRef.current);

        progressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            if (prev >= 90) {
              return prev;
            }
            return prev + Math.random() * 20;
          });
        }, 200);

        const response = await fetch("/api/secure/upload", {
          method: "POST",
          body: formData,
        });

        if (progressInterval) {
          clearInterval(progressInterval);
          progressInterval = null;
        }
        setUploadProgress(100);

        let data;
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          try {
            data = await response.json();
          } catch {
            throw new Error(
              "Server returned an invalid response. Please try again.",
            );
          }
        } else {
          const text = await response.text();
          console.error(
            "Non-JSON response:",
            response.status,
            text.substring(0, 200),
          );
          throw new Error(
            response.status >= 500
              ? "Server error occurred. Please try again."
              : `Upload failed with status ${response.status}. Please try again.`,
          );
        }

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Upload failed");
        }

        const newFile: SecureActiveFile = {
          code: data.token, // Use the token as the "code" for display
          token: data.token,
          sessionId: data.sessionId,
          fileName: data.fileName,
          fileSize: data.fileSize,
          fileType: data.fileType,
          uploadedAt: data.uploadedAt,
        };

        setLastUploadedFile(newFile);
        onUploadSuccess({
          code: data.token,
          sessionId: data.sessionId,
          fileName: data.fileName,
          fileSize: data.fileSize,
          fileType: data.fileType,
          uploadedAt: data.uploadedAt,
        });
        setStatus("success");
      } catch (err) {
        if (progressInterval) {
          clearInterval(progressInterval);
        }
        setError(err instanceof Error ? err.message : "Failed to upload file");
        setStatus("error");
      }
    },
    [validateFile, onUploadSuccess],
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        uploadFile(files[0]);
      }
    },
    [uploadFile],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        uploadFile(files[0]);
      }
      if (e.target) {
        e.target.value = "";
      }
    },
    [uploadFile],
  );

  const handleClick = () => {
    if (status !== "uploading") {
      fileInputRef.current?.click();
    }
  };

  const resetUpload = useCallback(() => {
    setStatus("idle");
    setError(null);
    setUploadProgress(0);
    setLastUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  return (
    <div className="w-full">
      {status === "idle" && (
        <div
          className={`relative border-2 border-dashed rounded-2xl p-8 transition-all duration-300 cursor-pointer ${
            isDragging
              ? "border-emerald-400 bg-emerald-500/10 scale-[1.02]"
              : "border-emerald-500/30 hover:border-emerald-500/50 hover:bg-emerald-500/5"
          }`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
          />

          <div className="flex flex-col items-center gap-4 text-center">
            <div className="relative">
              <div className="p-4 bg-emerald-500/10 rounded-full">
                <Upload className="w-10 h-10 text-emerald-400" />
              </div>
              <div className="absolute -top-1 -right-1 p-1 bg-emerald-500 rounded-full">
                <Shield className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
            <div>
              <p className="text-lg font-semibold text-white mb-1">
                Drop your file here or click to browse
              </p>
              <p className="text-sm text-gray-500">
                Maximum file size: {formatFileSize(MAX_FILE_SIZE)} &bull;
                JWT-secured sharing
              </p>
            </div>
            <button className="px-6 py-3 bg-emerald-500 text-white font-semibold rounded-xl shadow-lg hover:bg-emerald-600 transform hover:scale-105 transition-all duration-200 flex items-center gap-2">
              <FileUp className="w-5 h-5" />
              Select File
            </button>
          </div>
        </div>
      )}

      {status === "uploading" && (
        <div className="bg-zinc-900 border border-emerald-500/20 rounded-2xl p-6 text-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
            <div>
              <p className="text-lg font-semibold text-white mb-2">
                Encrypting & Uploading...
              </p>
              <div className="w-64 h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-300 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {Math.round(uploadProgress)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {status === "success" && lastUploadedFile && (
        <div className="bg-zinc-900 border border-emerald-500/20 rounded-2xl p-6">
          <div className="flex flex-col items-center gap-4 mb-6">
            <div className="relative">
              <div className="p-3 bg-emerald-500/10 rounded-full">
                <CheckCircle className="w-10 h-10 text-emerald-400" />
              </div>
              <div className="absolute -top-1 -right-1 p-1 bg-emerald-500 rounded-full">
                <Shield className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-white mb-1">
                Securely Shared!
              </p>
              <p className="text-sm text-gray-500">
                {lastUploadedFile.fileName}
              </p>
            </div>
          </div>

          <TokenDisplay
            token={lastUploadedFile.token}
            fileName={lastUploadedFile.fileName}
          />

          <button
            onClick={resetUpload}
            className="w-full mt-6 px-6 py-3 bg-emerald-500/10 text-emerald-400 font-semibold rounded-xl border border-emerald-500/20 hover:bg-emerald-500/20 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Upload className="w-5 h-5" />
            Upload Another File
          </button>
        </div>
      )}

      {status === "error" && (
        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6">
          <div className="flex flex-col items-center gap-4">
            <div className="p-3 bg-white/5 rounded-full">
              <AlertCircle className="w-10 h-10 text-gray-400" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-white mb-1">
                Upload Failed
              </p>
              <p className="text-sm text-gray-500">{error}</p>
            </div>
            <button
              onClick={resetUpload}
              className="px-6 py-3 bg-emerald-500 text-white font-semibold rounded-xl shadow-lg hover:bg-emerald-600 transform hover:scale-105 transition-all duration-200"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {status === "idle" && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
          <span>Remaining uploads:</span>
          <span
            className={`font-semibold ${remainingUploads > 0 ? "text-emerald-400" : "text-gray-400"}`}
          >
            {remainingUploads}/3
          </span>
        </div>
      )}

      {activeFiles.length > 0 && status !== "success" && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
            </span>
            Secure Shares ({activeFiles.length})
          </h3>
          <div className="space-y-4">
            {activeFiles.map((file) => (
              <FileCard key={file.code} file={file} onRemove={onFileRemove} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
