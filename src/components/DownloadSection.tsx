"use client";

import { useState, useRef, KeyboardEvent, useCallback } from "react";
import {
  Download,
  Search,
  FileCheck,
  Loader2,
  AlertCircle,
  File,
  Image,
  Film,
  Music,
  Archive,
  FileText,
  X,
} from "lucide-react";

interface FileInfo {
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: number;
}

type DownloadStatus =
  | "idle"
  | "checking"
  | "ready"
  | "downloading"
  | "error"
  | "not-found";

export default function DownloadSection() {
  const [code, setCode] = useState(["", "", "", ""]);
  const [status, setStatus] = useState<DownloadStatus>("idle");
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const fullCode = code.join("").toUpperCase();

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/"))
      return <Image className="w-8 h-8 text-white" />;
    if (mimeType.startsWith("video/"))
      return <Film className="w-8 h-8 text-white" />;
    if (mimeType.startsWith("audio/"))
      return <Music className="w-8 h-8 text-gray-300" />;
    if (
      mimeType.includes("zip") ||
      mimeType.includes("rar") ||
      mimeType.includes("tar") ||
      mimeType.includes("7z")
    ) {
      return <Archive className="w-8 h-8 text-gray-300" />;
    }
    if (
      mimeType.includes("pdf") ||
      mimeType.includes("document") ||
      mimeType.includes("text")
    ) {
      return <FileText className="w-8 h-8 text-gray-300" />;
    }
    return <File className="w-8 h-8 text-gray-400" />;
  };

  const handleInputChange = (index: number, value: string) => {
    // Only allow alphanumeric characters
    const cleanValue = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

    if (cleanValue.length <= 1) {
      const newCode = [...code];
      newCode[index] = cleanValue;
      setCode(newCode);

      // Auto-focus next input
      if (cleanValue.length === 1 && index < 3) {
        inputRefs[index + 1].current?.focus();
      }

      // Reset status when code changes
      if (status !== "idle") {
        setStatus("idle");
        setFileInfo(null);
        setError(null);
      }
    } else if (cleanValue.length > 1) {
      // Handle paste
      const chars = cleanValue.slice(0, 4).split("");
      const newCode = ["", "", "", ""];
      chars.forEach((char, i) => {
        if (i < 4) newCode[i] = char;
      });
      setCode(newCode);

      // Focus the last filled input or the next empty one
      const lastFilledIndex = Math.min(chars.length - 1, 3);
      inputRefs[lastFilledIndex].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && code[index] === "" && index > 0) {
      inputRefs[index - 1].current?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs[index - 1].current?.focus();
    } else if (e.key === "ArrowRight" && index < 3) {
      inputRefs[index + 1].current?.focus();
    } else if (e.key === "Enter" && fullCode.length === 4) {
      checkCode();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData
      .getData("text")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase();
    const chars = pastedText.slice(0, 4).split("");
    const newCode = ["", "", "", ""];
    chars.forEach((char, i) => {
      if (i < 4) newCode[i] = char;
    });
    setCode(newCode);

    if (chars.length > 0) {
      const focusIndex = Math.min(chars.length, 3);
      inputRefs[focusIndex].current?.focus();
    }
  };

  const checkCode = useCallback(async () => {
    if (fullCode.length !== 4) return;

    setStatus("checking");
    setError(null);
    setFileInfo(null);

    try {
      const response = await fetch(`/api/check/${fullCode}`);
      const data = await response.json();

      if (data.available) {
        setStatus("ready");
        setFileInfo({
          fileName: data.fileName,
          fileSize: data.fileSize,
          fileType: data.fileType,
          uploadedAt: data.uploadedAt,
        });
      } else {
        setStatus("not-found");
        setError(data.error || "File not found or session expired");
      }
    } catch (err) {
      setStatus("error");
      setError("Failed to check code. Please try again.");
    }
  }, [fullCode]);

  const downloadFile = async () => {
    if (!fileInfo) return;

    setIsDownloading(true);

    try {
      const response = await fetch(`/api/download/${fullCode}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Download failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileInfo.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download file");
      setStatus("error");
    } finally {
      setIsDownloading(false);
    }
  };

  const resetForm = () => {
    setCode(["", "", "", ""]);
    setStatus("idle");
    setFileInfo(null);
    setError(null);
    inputRefs[0].current?.focus();
  };

  return (
    <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 sm:p-8">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-white/10 text-white mb-4">
          <Download className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Receive File</h2>
        <p className="text-gray-500">Enter the 4-digit code to download</p>
      </div>

      {/* Code Input */}
      <div className="mb-6">
        <div className="flex justify-center gap-3" onPaste={handlePaste}>
          {code.map((digit, index) => (
            <input
              key={index}
              ref={inputRefs[index]}
              type="text"
              maxLength={4}
              value={digit}
              onChange={(e) => handleInputChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-14 h-16 sm:w-16 sm:h-20 text-center text-2xl sm:text-3xl font-mono font-bold
                       bg-black border-2 border-white/20 rounded-xl text-white uppercase
                       focus:border-white focus:ring-2 focus:ring-white/30 focus:outline-none
                       transition-all duration-200 placeholder-gray-600"
              placeholder="•"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="characters"
              spellCheck="false"
            />
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      {status === "idle" && (
        <button
          onClick={checkCode}
          disabled={fullCode.length !== 4}
          className="w-full flex items-center justify-center gap-2 py-4 px-6
                   bg-white text-black font-semibold rounded-xl
                   hover:bg-gray-200 transform hover:scale-[1.02]
                   transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          <Search className="w-5 h-5" />
          <span>Find File</span>
        </button>
      )}

      {/* Checking Status */}
      {status === "checking" && (
        <div className="flex flex-col items-center gap-3 py-4">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
          <p className="text-gray-400">Searching for file...</p>
        </div>
      )}

      {/* File Found */}
      {status === "ready" && fileInfo && (
        <div className="space-y-4 animate-fade-in">
          {/* File Preview Card */}
          <div className="bg-black rounded-xl p-4 border border-white/20">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 p-3 bg-white/10 rounded-xl">
                {getFileIcon(fileInfo.fileType)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <FileCheck className="w-4 h-4 text-white flex-shrink-0" />
                  <span className="text-white text-sm font-medium">
                    File Available
                  </span>
                </div>
                <p
                  className="text-white font-medium truncate"
                  title={fileInfo.fileName}
                >
                  {fileInfo.fileName}
                </p>
                <p className="text-gray-500 text-sm">
                  {formatFileSize(fileInfo.fileSize)}
                </p>
              </div>
            </div>
          </div>

          {/* Download Button */}
          <button
            onClick={downloadFile}
            disabled={isDownloading}
            className="w-full flex items-center justify-center gap-2 py-4 px-6
                     bg-white text-black font-semibold rounded-xl
                     hover:bg-gray-200 transform hover:scale-[1.02]
                     transition-all duration-200 disabled:opacity-70 disabled:cursor-wait disabled:transform-none"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Downloading...</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span>Download File</span>
              </>
            )}
          </button>

          {/* New Download Button */}
          <button
            onClick={resetForm}
            className="w-full py-3 text-gray-500 hover:text-white transition-colors"
          >
            Download another file
          </button>
        </div>
      )}

      {/* Not Found / Error */}
      {(status === "not-found" || status === "error") && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-medium">
                  {status === "not-found" ? "File Not Found" : "Error"}
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  {error ||
                    "The file may have expired or the uploader closed their tab."}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={resetForm}
            className="w-full flex items-center justify-center gap-2 py-3 px-6
                     bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl
                     transition-all duration-200 border border-white/10"
          >
            <X className="w-4 h-4" />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* Help Text */}
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-600">
          Ask the sender for the 4-digit code to access their file
        </p>
      </div>
    </div>
  );
}
