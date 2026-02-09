"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Share2,
  ArrowDownToLine,
  Github,
  Wifi,
  WifiOff,
  Info,
} from "lucide-react";
import UploadSection from "@/components/UploadSection";
import DownloadSection from "@/components/DownloadSection";
import { ActiveFile, ConnectionStatus } from "@/types";

const HEARTBEAT_INTERVAL = 5000; // 5 seconds

type Tab = "upload" | "download";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("upload");
  const [sessionId, setSessionId] = useState<string>("");
  const [activeFiles, setActiveFiles] = useState<ActiveFile[]>([]);
  const [remainingUploads, setRemainingUploads] = useState<number>(3);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connected");
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isUnloadingRef = useRef(false);

  // Generate session ID on mount
  useEffect(() => {
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    setSessionId(newSessionId);
  }, []);

  // Heartbeat to keep session alive
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

  // Start heartbeat interval when there are active files
  useEffect(() => {
    if (activeFiles.length > 0 && sessionId) {
      // Send initial heartbeat
      sendHeartbeat();

      // Set up interval
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
      // Clear interval if no active files
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    }
  }, [activeFiles.length, sessionId, sendHeartbeat]);

  // Cleanup on page unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (activeFiles.length > 0) {
        isUnloadingRef.current = true;

        // Send delete request using sendBeacon for reliability
        const data = JSON.stringify({ sessionId });
        navigator.sendBeacon(
          "/api/heartbeat",
          new Blob([data], { type: "application/json" }),
        );

        // Show confirmation dialog
        e.preventDefault();
        e.returnValue =
          "You have active file shares. Closing this tab will delete them.";
        return e.returnValue;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && activeFiles.length > 0) {
        // Send heartbeat when tab becomes hidden to extend session
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

  // Handle successful upload
  const handleUploadSuccess = useCallback((file: ActiveFile) => {
    setActiveFiles((prev) => [...prev, file]);
    setRemainingUploads((prev) => Math.max(0, prev - 1));
  }, []);

  // Handle file removal
  const handleFileRemove = useCallback(async (code: string) => {
    setActiveFiles((prev) => prev.filter((f) => f.code !== code));
  }, []);

  return (
    <main className="min-h-screen flex flex-col bg-black">
      {/* Header */}
      <header className="w-full py-4 px-4 sm:px-6 border-b border-white/10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-xl">
              <Share2 className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">EasyTransfer</h1>
              <p className="text-xs text-gray-500 hidden sm:block">
                Temporary File Sharing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Connection Status */}
            {activeFiles.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                {connectionStatus === "connected" ? (
                  <>
                    <Wifi className="w-4 h-4 text-white" />
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

            {/* GitHub Link */}
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-500 hover:text-white transition-colors"
              title="View on GitHub"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-xl">
          {/* Hero Section */}
          <div className="text-center mb-8">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
              Share Files{" "}
              <span className="bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
                Instantly
              </span>
            </h2>
            <p className="text-gray-500 max-w-md mx-auto">
              No account needed. Upload a file, get a code, share it with
              anyone. Files are deleted when you close this tab.
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex mb-6 bg-zinc-900 rounded-xl p-1.5 border border-white/5">
            <button
              onClick={() => setActiveTab("upload")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                activeTab === "upload"
                  ? "bg-white text-black shadow-lg"
                  : "text-gray-500 hover:text-white hover:bg-white/5"
              }`}
            >
              <Share2 className="w-5 h-5" />
              <span>Share</span>
            </button>
            <button
              onClick={() => setActiveTab("download")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                activeTab === "download"
                  ? "bg-white text-black shadow-lg"
                  : "text-gray-500 hover:text-white hover:bg-white/5"
              }`}
            >
              <ArrowDownToLine className="w-5 h-5" />
              <span>Receive</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="animate-fade-in">
            {activeTab === "upload" ? (
              <UploadSection
                sessionId={sessionId}
                activeFiles={activeFiles}
                remainingUploads={remainingUploads}
                onUploadSuccess={handleUploadSuccess}
                onFileRemove={handleFileRemove}
              />
            ) : (
              <DownloadSection />
            )}
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="px-4 pb-4">
        <div className="max-w-xl mx-auto">
          <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-500">
                <p className="font-medium text-gray-400 mb-1">How it works</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Upload any file up to 10MB</li>
                  <li>Get a unique 4-digit code</li>
                  <li>Share the code with anyone</li>
                  <li>File is available while this tab is open</li>
                  <li>File is automatically deleted when you close the tab</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 px-4 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-gray-600">
          <p>Made with ❤️ for easy file sharing</p>
          <p>Files are temporary and encrypted in transit</p>
        </div>
      </footer>

      {/* Active Files Indicator (Mobile) */}
      {activeFiles.length > 0 && activeTab === "download" && (
        <div className="fixed bottom-4 left-4 right-4 sm:hidden">
          <button
            onClick={() => setActiveTab("upload")}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white text-black font-medium rounded-xl shadow-lg"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-black"></span>
            </span>
            <span>
              {activeFiles.length} Active Share
              {activeFiles.length > 1 ? "s" : ""}
            </span>
          </button>
        </div>
      )}
    </main>
  );
}
