"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Shield,
  ArrowDownToLine,
  ArrowLeft,
  Wifi,
  WifiOff,
  Info,
  Lock,
} from "lucide-react";
import SecureUploadSection from "@/components/SecureUploadSection";
import SecureDownloadSection from "@/components/SecureDownloadSection";
import { ActiveFile, ConnectionStatus } from "@/types";
import Link from "next/link";

const HEARTBEAT_INTERVAL = 5000; // 5 seconds

type Tab = "upload" | "download";

export default function SecurePage() {
  const [activeTab, setActiveTab] = useState<Tab>("upload");
  const [sessionId, setSessionId] = useState<string>("");
  const [activeFiles, setActiveFiles] = useState<ActiveFile[]>([]);
  const [remainingUploads, setRemainingUploads] = useState<number>(3);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connected");
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isUnloadingRef = useRef(false);

  useEffect(() => {
    const newSessionId = `secure_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    setSessionId(newSessionId);
  }, []);

  const sendHeartbeat = useCallback(async () => {
    if (!sessionId || activeFiles.length === 0 || isUnloadingRef.current)
      return;

    try {
      const response = await fetch("/api/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      if (response.ok) {
        setConnectionStatus("connected");
      } else {
        setConnectionStatus("reconnecting");
      }
    } catch (error) {
      console.error("Heartbeat failed:", error);
      setConnectionStatus("reconnecting");
    }
  }, [sessionId, activeFiles.length]);

  useEffect(() => {
    if (activeFiles.length > 0 && sessionId) {
      sendHeartbeat();

      heartbeatIntervalRef.current = setInterval(
        sendHeartbeat,
        HEARTBEAT_INTERVAL,
      );

      return () => {
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
      };
    } else {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    }
  }, [activeFiles.length, sessionId, sendHeartbeat]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (activeFiles.length > 0) {
        isUnloadingRef.current = true;

        const data = JSON.stringify({ sessionId });
        navigator.sendBeacon(
          "/api/session",
          new Blob([data], { type: "application/json" }),
        );

        e.preventDefault();
        e.returnValue =
          "You have active secure file shares. Closing this tab will delete them.";
        return e.returnValue;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && activeFiles.length > 0) {
        sendHeartbeat();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeFiles.length, sessionId, sendHeartbeat]);

  const handleUploadSuccess = useCallback((file: ActiveFile) => {
    setActiveFiles((prev) => [...prev, file]);
    setRemainingUploads((prev) => Math.max(0, prev - 1));
  }, []);

  const handleFileRemove = useCallback(async (code: string) => {
    setActiveFiles((prev) => prev.filter((f) => f.code !== code));
  }, []);

  return (
    <main className="min-h-screen flex flex-col bg-black">
      <header className="w-full py-4 px-4 sm:px-6 border-b border-emerald-500/10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-white/5"
              title="Back to EasyTransfer"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="p-2 bg-emerald-500 rounded-xl">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                EasyTransfer
                <span className="text-xs font-medium px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
                  SECURE
                </span>
              </h1>
              <p className="text-xs text-gray-500 hidden sm:block">
                JWT-Secured File Sharing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {activeFiles.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                {connectionStatus === "connected" ? (
                  <>
                    <Wifi className="w-4 h-4 text-emerald-400" />
                    <span className="text-gray-400 hidden sm:inline">
                      Connected
                    </span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-gray-400 animate-pulse" />
                    <span className="text-gray-500 hidden sm:inline">
                      Reconnecting...
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
              Secure Share{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
                with JWT
              </span>
            </h2>
            <p className="text-gray-500 max-w-md mx-auto">
              Files are protected with cryptographically signed tokens. Only
              users with a valid token can access your files.
            </p>
          </div>

          <div className="flex mb-6 bg-zinc-900 rounded-xl p-1.5 border border-emerald-500/10">
            <button
              onClick={() => setActiveTab("upload")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                activeTab === "upload"
                  ? "bg-emerald-500 text-white shadow-lg"
                  : "text-gray-500 hover:text-white hover:bg-white/5"
              }`}
            >
              <Lock className="w-5 h-5" />
              <span>Secure Share</span>
            </button>
            <button
              onClick={() => setActiveTab("download")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                activeTab === "download"
                  ? "bg-emerald-500 text-white shadow-lg"
                  : "text-gray-500 hover:text-white hover:bg-white/5"
              }`}
            >
              <ArrowDownToLine className="w-5 h-5" />
              <span>Receive</span>
            </button>
          </div>

          <div className="animate-fade-in">
            {activeTab === "upload" ? (
              <SecureUploadSection
                sessionId={sessionId}
                activeFiles={activeFiles}
                remainingUploads={remainingUploads}
                onUploadSuccess={handleUploadSuccess}
                onFileRemove={handleFileRemove}
              />
            ) : (
              <SecureDownloadSection />
            )}
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="max-w-xl mx-auto">
          <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-500">
                <p className="font-medium text-emerald-400 mb-1">
                  How Secure Sharing Works
                </p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Upload any file up to 10MB</li>
                  <li>
                    Get a{" "}
                    <span className="text-emerald-400">
                      cryptographically signed JWT token
                    </span>
                  </li>
                  <li>Share the token with your recipient</li>
                  <li>Token cannot be guessed, forged, or brute-forced</li>
                  <li>Token expires automatically after 1 hour</li>
                  <li>File is deleted when you close this tab</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="max-w-xl mx-auto">
          <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-500">
                <p className="font-medium text-gray-400 mb-1">
                  Why JWT is more secure
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div className="text-gray-600">Standard: 4-char code</div>
                  <div className="text-emerald-400">
                    Secure: 200+ char signed token
                  </div>
                  <div className="text-gray-600">~1.6M combinations</div>
                  <div className="text-emerald-400">
                    Practically unguessable
                  </div>
                  <div className="text-gray-600">Code can be brute-forced</div>
                  <div className="text-emerald-400">
                    Cryptographically verified
                  </div>
                  <div className="text-gray-600">No tamper detection</div>
                  <div className="text-emerald-400">
                    Tamper-proof signatures
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="py-4 px-4 border-t border-emerald-500/5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-gray-600">
          <p>Made with ❤️ by @sjx for secure file sharing</p>
          <p className="flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            Protected with JWT (HS256)
          </p>
        </div>
      </footer>

      {activeFiles.length > 0 && activeTab === "download" && (
        <div className="fixed bottom-4 left-4 right-4 sm:hidden">
          <button
            onClick={() => setActiveTab("upload")}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-500 text-white font-medium rounded-xl shadow-lg"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            <span>
              {activeFiles.length} Secure Share
              {activeFiles.length > 1 ? "s" : ""}
            </span>
          </button>
        </div>
      )}
    </main>
  );
}
