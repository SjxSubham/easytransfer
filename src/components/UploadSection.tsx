"use client";

import { useState, useCallback, useRef } from "react";
import {
  Upload,
  FileUp,
  X,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { UploadStatus, ActiveFile } from "@/types";
import CodeDisplay from "./CodeDisplay";
import FileCard from "./FileCard";

interface UploadSectionProps {
  sessionId: string;
  activeFiles: ActiveFile[];
  remainingUploads: number;
  onUploadSuccess: (file: ActiveFile) => void;
  onFileRemove: (code: string) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function UploadSection({
  sessionId,
  activeFiles,
  remainingUploads,
  onUploadSuccess,
  onFileRemove,
}: UploadSectionProps) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [lastUploadedFile, setLastUploadedFile] = useState<ActiveFile | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File is too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}. Your file is ${formatFileSize(file.size)}.`;
    }
    if (file.size === 0) {
      return "Cannot upload empty files.";
    }
    if (remainingUploads <= 0) {
      return "Rate limit exceeded. You can only upload 3 files per hour.";
    }
    return null;
  };

  const uploadFile = async (file: File) => {
    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setStatus("error");
      return;
    }

    setStatus("uploading");
    setError(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sessionId", sessionId);

      // Simulate progress (since we can't get real progress with fetch)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 20;
        });
      }, 200);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Upload failed");
      }

      const newFile: ActiveFile = {
        code: data.code,
        sessionId: data.sessionId,
        fileName: data.fileName,
        fileSize: data.fileSize,
        fileType: data.fileType,
        uploadedAt: data.uploadedAt,
      };

      setLastUploadedFile(newFile);
      onUploadSuccess(newFile);
      setStatus("success");
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "Failed to upload file");
      setStatus("error");
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we're leaving the dropzone entirely
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
    [sessionId, remainingUploads],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        uploadFile(files[0]);
      }
      // Reset input so same file can be selected again
      e.target.value = "";
    },
    [sessionId, remainingUploads],
  );

  const handleClick = () => {
    if (status !== "uploading") {
      fileInputRef.current?.click();
    }
  };

  const resetUpload = () => {
    setStatus("idle");
    setError(null);
    setUploadProgress(0);
    setLastUploadedFile(null);
  };

  return (
    <div className="w-full">
      {/* Upload Area */}
      {status === "idle" && (
        <div
          className={`relative border-2 border-dashed rounded-2xl p-8 transition-all duration-300 cursor-pointer ${
            isDragging
              ? "border-white bg-white/10 scale-[1.02]"
              : "border-white/20 hover:border-white/40 hover:bg-white/5"
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
            <div className="p-4 bg-white/10 rounded-full">
              <Upload className="w-10 h-10 text-white" />
            </div>
            <div>
              <p className="text-lg font-semibold text-white mb-1">
                Drop your file here or click to browse
              </p>
              <p className="text-sm text-gray-500">
                Maximum file size: {formatFileSize(MAX_FILE_SIZE)}
              </p>
            </div>
            <button className="px-6 py-3 bg-white text-black font-semibold rounded-xl shadow-lg hover:bg-gray-200 transform hover:scale-105 transition-all duration-200 flex items-center gap-2">
              <FileUp className="w-5 h-5" />
              Select File
            </button>
          </div>
        </div>
      )}

      {/* Uploading State */}
      {status === "uploading" && (
        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 text-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-white animate-spin" />
            <div>
              <p className="text-lg font-semibold text-white mb-2">
                Uploading...
              </p>
              <div className="w-64 h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-white to-gray-400 transition-all duration-300"
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

      {/* Success State */}
      {status === "success" && lastUploadedFile && (
        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6">
          <div className="flex flex-col items-center gap-4 mb-6">
            <div className="p-3 bg-white/10 rounded-full">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-white mb-1">
                File Ready to Share!
              </p>
              <p className="text-sm text-gray-500">
                {lastUploadedFile.fileName}
              </p>
            </div>
          </div>

          <CodeDisplay
            code={lastUploadedFile.code}
            fileName={lastUploadedFile.fileName}
          />

          <button
            onClick={resetUpload}
            className="w-full mt-6 px-6 py-3 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Upload className="w-5 h-5" />
            Upload Another File
          </button>
        </div>
      )}

      {/* Error State */}
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
              className="px-6 py-3 bg-white text-black font-semibold rounded-xl shadow-lg hover:bg-gray-200 transform hover:scale-105 transition-all duration-200"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Rate Limit Info */}
      {status === "idle" && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
          <span>Remaining uploads:</span>
          <span
            className={`font-semibold ${remainingUploads > 0 ? "text-white" : "text-gray-400"}`}
          >
            {remainingUploads}/3
          </span>
        </div>
      )}

      {/* Active Files */}
      {activeFiles.length > 0 && status !== "success" && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
            </span>
            Active Shares ({activeFiles.length})
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
