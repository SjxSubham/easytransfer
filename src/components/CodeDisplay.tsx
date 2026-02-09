"use client";

import { useState, useCallback } from "react";
import { Copy, Check, Share2 } from "lucide-react";

interface CodeDisplayProps {
  code: string;
  fileName?: string;
  onShare?: () => void;
}

export default function CodeDisplay({
  code,
  fileName,
  onShare,
}: CodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = code;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (e) {
        console.error("Failed to copy:", e);
      }
      document.body.removeChild(textArea);
    }
  }, [code]);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "EasyTransfer - File Share",
          text: `Download my shared file${fileName ? ` "${fileName}"` : ""} using code: ${code}`,
          url: window.location.origin,
        });
      } catch (err) {
        // User cancelled or share failed
        if (onShare) onShare();
      }
    } else if (onShare) {
      onShare();
    }
  }, [code, fileName, onShare]);

  return (
    <div className="w-full">
      <div className="relative mb-4">
        <div className="flex items-center justify-center gap-2 sm:gap-3 p-4 sm:p-6 bg-gradient-to-r from-white/5 to-white/10 rounded-xl border border-white/10">
          {code.split("").map((char, index) => (
            <div
              key={index}
              className="flex items-center justify-center w-12 h-14 sm:w-16 sm:h-20 bg-black rounded-lg border-2 border-white/20 shadow-lg shadow-white/5 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <span className="text-2xl sm:text-4xl font-mono font-bold text-white tracking-wider">
                {char}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={copyToClipboard}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
            copied
              ? "bg-white text-black"
              : "bg-white/10 hover:bg-white/20 text-white border border-white/10"
          }`}
        >
          {copied ? (
            <>
              <Check className="w-5 h-5" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-5 h-5" />
              <span>Copy Code</span>
            </>
          )}
        </button>

        {typeof navigator !== "undefined" && "share" in navigator && (
          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium bg-white text-black hover:bg-gray-200 transition-all duration-200"
          >
            <Share2 className="w-5 h-5" />
            <span className="hidden sm:inline">Share</span>
          </button>
        )}
      </div>

      <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
        <p className="text-sm text-gray-400 text-center">
          Share this code with others to let them download your file.
          <br />
          <span className="text-gray-500 text-xs mt-1 block">
            ⚠️ Keep this tab open - the file will be deleted when you close it.
          </span>
        </p>
      </div>
    </div>
  );
}
