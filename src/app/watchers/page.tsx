"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface WatcherInfo {
  name: string;
  founder: string;
  type: string;
  targetPage: string;
  schedule: string;
  description: string;
  active: boolean;
  valid: boolean;
}

interface RunResult {
  name: string;
  success: boolean;
  message: string;
  error?: string;
  targetPage?: string;
  updatedAt?: string;
}

export default function WatchersPage() {
  const [watchers, setWatchers] = useState<WatcherInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<RunResult[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchWatchers();
  }, []);

  const fetchWatchers = async () => {
    try {
      const response = await fetch("/api/watchers/list");
      if (!response.ok) throw new Error("Failed to load watchers");
      const data = await response.json();
      setWatchers(data.watchers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load watchers");
    } finally {
      setLoading(false);
    }
  };

  const runAllWatchers = async () => {
    setRunning(true);
    setResults([]);
    setError("");

    try {
      const response = await fetch("/api/watchers/run", { method: "POST" });
      if (!response.ok) throw new Error("Failed to run watchers");
      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run watchers");
    } finally {
      setRunning(false);
    }
  };

  const founderColor = (founder: string) => {
    switch (founder.toLowerCase()) {
      case "shawn":
        return "text-[#2b8a88]";
      case "mark":
        return "text-[#e85d4e]";
      case "michael":
        return "text-[#a8b5a0]";
      default:
        return "text-[#8a8580]";
    }
  };

  return (
    <div className="min-h-screen bg-[#faf7f2] pb-24">
      <div className="container-main py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-[#8a8580] hover:text-[#1a1a1a] transition-colors"
            >
              &#8592; Back
            </Link>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="serif-heading text-3xl text-[#1a1a1a]">Watchers</h1>
          <button
            onClick={runAllWatchers}
            disabled={running || watchers.length === 0}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-opacity ${
              running || watchers.length === 0
                ? "bg-[#eae4da] text-[#8a8580] cursor-not-allowed"
                : "bg-[#2b8a88] text-white hover:opacity-90"
            }`}
          >
            {running ? "Running..." : "Run All Watchers"}
          </button>
        </div>

        <p className="text-[#8a8580] text-sm mb-6">
          Watchers monitor external sources and update wiki pages automatically.
        </p>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2b8a88]" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-[#fef4f2] border border-[#e85d4e] rounded-lg p-4 mb-6">
            <p className="text-[#e85d4e] text-sm">{error}</p>
          </div>
        )}

        {/* Results banner */}
        {results.length > 0 && (
          <div className="bg-[#f0f8f7] border border-[#2b8a88] rounded-lg p-4 mb-6">
            <p className="text-[#2b8a88] font-semibold text-sm mb-2">
              Run Complete
            </p>
            {results.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span>{r.success ? "&#10003;" : "&#10007;"}</span>
                <span className="font-medium">{r.name}</span>
                <span className="text-[#8a8580]">
                  {r.message || r.error}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Watcher cards */}
        {!loading && watchers.length === 0 && !error && (
          <div className="bg-white border border-[#eae4da] rounded-lg p-8 text-center">
            <p className="text-[#8a8580]">
              No watchers configured yet. Add .md files to the watchers/
              directory in your repo.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {watchers.map((watcher, index) => (
            <div
              key={index}
              className={`bg-white border rounded-lg p-5 ${
                watcher.active
                  ? "border-[#eae4da]"
                  : "border-[#eae4da] opacity-60"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-[#1a1a1a]">
                    {watcher.name.replace(".md", "").replace(/-/g, " ")}
                  </h3>
                  <p
                    className={`text-sm font-medium capitalize ${founderColor(
                      watcher.founder
                    )}`}
                  >
                    {watcher.founder}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      watcher.active
                        ? "bg-[#f0f8f7] text-[#2b8a88]"
                        : "bg-[#f5f4f2] text-[#8a8580]"
                    }`}
                  >
                    {watcher.active ? "Active" : "Inactive"}
                  </span>
                  <span className="text-xs px-2 py-1 rounded bg-[#fef9f0] text-[#e8a33d]">
                    {watcher.schedule}
                  </span>
                </div>
              </div>

              <p className="text-sm text-[#8a8580] mb-3">
                {watcher.description}
              </p>

              <div className="flex items-center gap-4 text-xs text-[#8a8580]">
                <span>Type: {watcher.type}</span>
                <span>Target: {watcher.targetPage}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
