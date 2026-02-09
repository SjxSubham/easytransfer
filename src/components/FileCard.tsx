"use client";

import { useEffect, useState } from "react";
import { File, X, Copy, Check, Clock, Eye } from "lucide-react";
import { ActiveFile } from "@/types";

interface FileCardProps {
  file: ActiveFile;
  onRemove?: (code: string) => void;
}

export default function FileCard({ file, onRemove }: FileCardProps) {
  const [copied, setCopied] = useState(false);
  const [timeActive, setTimeActive] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const elapsed = Date.now() - file.uploadedAt;
      const seconds = Math.floor(elapsed / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);

      if (hours > 0) {
        setTimeActive(`${hours}h ${minutes % 60}m`);
      } else if (minutes > 0) {
        setTimeActive(`${minutes}m ${seconds % 60}s`);
      } else {
        setTimeActive(`${seconds}s`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [file.uploadedAt]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(file.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = () => {
    const type = file.fileType;
    if (type.startsWith("image/")) {
      return <Eye className="w-5 h-5 text-white" />;
    }
    return <File className="w-5 h-5 text-gray-300" />;
  };

  const truncateFileName = (name: string, maxLength: number = 25) => {
    if (name.length <= maxLength) return name;
    const ext = name.split(".").pop() || "";
    const baseName = name.slice(0, name.length - ext.length - 1);
    const truncatedBase = baseName.slice(0, maxLength - ext.length - 4) + "...";
    return `${truncatedBase}.${ext}`;
  };

  return (
    <div className="bg-zinc-900 border border-white/10 rounded-xl p-4 animate-fade-in hover:border-white/20 transition-all duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex-shrink-0 p-2 bg-white/5 rounded-lg">
            {getFileIcon()}
          </div>
          <div className="min-w-0">
            <p
              className="font-medium text-white truncate"
              title={file.fileName}
            >
              {truncateFileName(file.fileName)}
            </p>
            <p className="text-sm text-gray-500">
              {formatFileSize(file.fileSize)}
            </p>
          </div>
        </div>

        {onRemove && (
          <button
            onClick={() => onRemove(file.code)}
            className="flex-shrink-0 p-1.5 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Stop sharing"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between bg-black rounded-lg p-3 border border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 uppercase tracking-wider">
              Code:
            </span>
            <span className="font-mono text-2xl font-bold text-white tracking-[0.3em]">
              {file.code}
            </span>
          </div>
          <button
            onClick={copyCode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              copied
                ? "bg-white/20 text-white"
                : "bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white"
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
          <span className="text-gray-400">Active</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>{timeActive} shared</span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-white/5">
        <p className="text-xs text-gray-600 text-center">
          Share this code with others to let them download the file
        </p>
      </div>
    </div>
  );
}
