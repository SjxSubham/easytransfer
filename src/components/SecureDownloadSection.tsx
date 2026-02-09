"use client";

import { useState, useCallback, useRef } from "react";
import {
  Download,
  Shield,
  ShieldCheck,
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
  ClipboardPaste,
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
  | "not-found"
  | "invalid-token";

export default function SecureDownloadSection() {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<DownloadStatus>("idle");
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/"))
      return <Image className="w-8 h-8 text-emerald-400" />;
    if (mimeType.startsWith("video/"))
      return <Film className="w-8 h-8 text-emerald-400" />;
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

  const isValidJWTFormat = (value: string): boolean => {
    if (!value || typeof value !== "string") return false;
    const trimmed = value.trim();
    const parts = trimmed.split(".");
    if (parts.length !== 3) return false;
    const base64urlRegex = /^[A-Za-z0-9_-]+$/;
    return parts.every((part) => base64urlRegex.test(part));
  };

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setToken(text.trim());
        // Reset status when token changes
        if (status !== "idle") {
          setStatus("idle");
          setFileInfo(null);
          setError(null);
        }
      }
    } catch (err) {
      console.error("Failed to paste:", err);
    }
  }, [status]);

  const handleTokenChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setToken(e.target.value);
      // Reset status when token changes
      if (status !== "idle") {
        setStatus("idle");
        setFileInfo(null);
        setError(null);
      }
    },
    [status],
  );

  const checkToken = useCallback(async () => {
    const trimmedToken = token.trim();

    if (!trimmedToken) {
      setError("Please paste a token first.");
      setStatus("error");
      return;
    }

    if (!isValidJWTFormat(trimmedToken)) {
      setStatus("invalid-token");
      setError(
        "This doesn't look like a valid token. Make sure you copied the entire token.",
      );
      return;
    }

    setStatus("checking");
    setError(null);
    setFileInfo(null);

    try {
      const response = await fetch("/api/secure/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: trimmedToken }),
      });

      let data;
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        try {
          data = await response.json();
        } catch {
          throw new Error("Server returned an invalid response.");
        }
      } else {
        throw new Error("Server returned an unexpected response.");
      }

      if (response.status === 401) {
        setStatus("invalid-token");
        setError(
          data.error ||
            "Invalid or expired token. The token may have been tampered with.",
        );
        return;
      }

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
        setError(data.error || "File not found or session expired.");
      }
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof Error
          ? err.message
          : "Failed to verify token. Please try again.",
      );
    }
  }, [token]);

  const downloadFile = async () => {
    if (!fileInfo) return;

    setIsDownloading(true);

    try {
      const response = await fetch("/api/secure/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      });

      if (!response.ok) {
        let errorMessage = "Download failed";
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch {
            // ignore parse error
          }
        }
        throw new Error(errorMessage);
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
    setToken("");
    setStatus("idle");
    setFileInfo(null);
    setError(null);
    textareaRef.current?.focus();
  };

  return (
    <div className="bg-zinc-900 border border-emerald-500/20 rounded-2xl p-6 sm:p-8">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-emerald-500/10 text-emerald-400 mb-4">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Secure Receive</h2>
        <p className="text-gray-500">Paste the secure token to download</p>
      </div>

      <div className="mb-6">
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">
              Access Token
            </span>
          </div>
          <textarea
            ref={textareaRef}
            value={token}
            onChange={handleTokenChange}
            className="w-full h-28 p-4 bg-black border-2 border-emerald-500/20 rounded-xl text-white text-sm font-mono
                     focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none
                     transition-all duration-200 placeholder-gray-600 resize-none"
            placeholder="Paste your JWT token here...&#10;&#10;e.g. eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
          />
          <button
            onClick={handlePaste}
            className="absolute top-9 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-lg transition-colors border border-emerald-500/20"
            title="Paste from clipboard"
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            Paste
          </button>
        </div>
      </div>

      {status === "idle" && (
        <button
          onClick={checkToken}
          disabled={!token.trim()}
          className="w-full flex items-center justify-center gap-2 py-4 px-6
                   bg-emerald-500 text-white font-semibold rounded-xl
                   hover:bg-emerald-600 transform hover:scale-[1.02]
                   transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          <ShieldCheck className="w-5 h-5" />
          <span>Verify & Find File</span>
        </button>
      )}

      {status === "checking" && (
        <div className="flex flex-col items-center gap-3 py-4">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          <p className="text-gray-400">
            Verifying token & searching for file...
          </p>
        </div>
      )}

      {status === "ready" && fileInfo && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-center gap-2 p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-medium text-emerald-400">
              Token Verified Successfully
            </span>
          </div>

          <div className="bg-black rounded-xl p-4 border border-emerald-500/20">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 p-3 bg-emerald-500/10 rounded-xl">
                {getFileIcon(fileInfo.fileType)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <FileCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-emerald-400 text-sm font-medium">
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

          <button
            onClick={downloadFile}
            disabled={isDownloading}
            className="w-full flex items-center justify-center gap-2 py-4 px-6
                     bg-emerald-500 text-white font-semibold rounded-xl
                     hover:bg-emerald-600 transform hover:scale-[1.02]
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
                <span>Secure Download</span>
              </>
            )}
          </button>

          <button
            onClick={resetForm}
            className="w-full py-3 text-gray-500 hover:text-white transition-colors"
          >
            Download another file
          </button>
        </div>
      )}

      {status === "invalid-token" && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-medium">
                  Token Verification Failed
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  {error ||
                    "The token is invalid, expired, or has been tampered with."}
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

      <div className="mt-6 text-center">
        <p className="text-xs text-gray-600">
          The token is cryptographically verified before granting access.
          <br />
          Only tokens generated by the uploader will work.
        </p>
      </div>
    </div>
  );
}
