"use client";

import { useState, useCallback } from "react";
import { Copy, Check, Share2, Shield, Clock } from "lucide-react";

interface TokenDisplayProps {
  token: string;
  fileName?: string;
  onShare?: () => void;
}

export default function TokenDisplay({
  token,
  fileName,
  onShare,
}: TokenDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [showFull, setShowFull] = useState(false);

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = token;
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
  }, [token]);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "EasyTransfer - Secure File Share",
          text: `Download my securely shared file${fileName ? ` "${fileName}"` : ""} using this token:\n\n${token}`,
          url: window.location.origin + "/secure",
        });
      } catch (err) {
        if (onShare) onShare();
      }
    } else if (onShare) {
      onShare();
    }
  }, [token, fileName, onShare]);

  // Truncate the token for display
  const displayToken = showFull
    ? token
    : token.length > 40
      ? token.substring(0, 20) + "..." + token.substring(token.length - 20)
      : token;

  return (
    <div className="w-full">
      <div className="flex items-center justify-center gap-2 mb-4">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs font-medium text-emerald-400">
            JWT Secured
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs font-medium text-gray-400">
            Expires in 1h
          </span>
        </div>
      </div>

      <div className="relative mb-4">
        <div className="p-4 bg-gradient-to-r from-emerald-500/5 to-white/5 rounded-xl border border-emerald-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">
              Secure Access Token
            </span>
          </div>
          <div
            className="font-mono text-sm text-white/80 break-all cursor-pointer bg-black/40 rounded-lg p-3 border border-white/5 hover:border-white/10 transition-colors"
            onClick={() => setShowFull(!showFull)}
            title={
              showFull ? "Click to collapse" : "Click to expand full token"
            }
          >
            {displayToken}
          </div>
          {!showFull && token.length > 40 && (
            <button
              onClick={() => setShowFull(true)}
              className="mt-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Click to show full token
            </button>
          )}
          {showFull && token.length > 40 && (
            <button
              onClick={() => setShowFull(false)}
              className="mt-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Click to collapse
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={copyToClipboard}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
            copied
              ? "bg-emerald-500 text-white"
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
              <span>Copy Token</span>
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

      <div className="mt-4 p-4 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
        <p className="text-sm text-gray-400 text-center">
          Share this{" "}
          <span className="text-emerald-400 font-medium">secure token</span>{" "}
          with others to let them download your file.
          <br />
          <span className="text-gray-500 text-xs mt-1 block">
            🔒 The token is cryptographically signed — it cannot be guessed or
            forged.
            <br />
            ⚠️ Keep this tab open — the file will be deleted when you close it.
          </span>
        </p>
      </div>
    </div>
  );
}
