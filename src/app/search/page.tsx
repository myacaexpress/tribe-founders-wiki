"use client";

import { useState } from "react";
import Link from "next/link";

interface SearchResult {
  path: string;
  title: string;
  snippet: string;
  score: number;
  type: string;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    setError("");
    setSearched(true);

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(query.trim())}`
      );
      if (!response.ok) throw new Error("Search failed");
      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const typeColor = (type: string) => {
    switch (type) {
      case "meeting":
        return "bg-[#f0f8f7] text-[#2b8a88]";
      case "task":
        return "bg-[#fef4f2] text-[#e85d4e]";
      case "decision":
        return "bg-[#fef9f0] text-[#e8a33d]";
      case "idea":
        return "bg-[#f5f7f4] text-[#a8b5a0]";
      case "lane":
        return "bg-[#f0f8f7] text-[#2b8a88]";
      case "imessage":
        return "bg-[#eef0f8] text-[#5b6abf]";
      case "transcript":
        return "bg-[#f5f0f8] text-[#8b5fbf]";
      default:
        return "bg-[#f5f4f2] text-[#8a8580]";
    }
  };

  return (
    <div className="min-h-screen bg-[#faf7f2] pb-24">
      <div className="container-main py-6">
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/"
            className="text-[#8a8580] hover:text-[#1a1a1a] transition-colors"
          >
            &#8592; Back
          </Link>
        </div>

        <h1 className="serif-heading text-3xl mb-6 text-[#1a1a1a]">Search</h1>

        {/* Search form */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search wiki, meetings, messages..."
              className="flex-1 px-4 py-3 border border-[#eae4da] rounded-lg bg-white text-[#1a1a1a] placeholder-[#8a8580] focus:outline-none focus:border-[#2b8a88] focus:ring-2 focus:ring-[#2b8a88] focus:ring-opacity-20 transition-all"
              autoFocus
            />
            <button
              type="submit"
              disabled={searching || !query.trim()}
              className={`px-6 py-3 rounded-lg font-semibold transition-opacity ${
                searching || !query.trim()
                  ? "bg-[#eae4da] text-[#8a8580] cursor-not-allowed"
                  : "bg-[#2b8a88] text-white hover:opacity-90"
              }`}
            >
              {searching ? "..." : "Search"}
            </button>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="bg-[#fef4f2] border border-[#e85d4e] rounded-lg p-4 mb-6">
            <p className="text-[#e85d4e] text-sm">{error}</p>
          </div>
        )}

        {/* Results */}
        {searching && (
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2b8a88]" />
          </div>
        )}

        {!searching && searched && results.length === 0 && (
          <div className="bg-white border border-[#eae4da] rounded-lg p-8 text-center">
            <p className="text-[#8a8580]">
              No results found for &ldquo;{query}&rdquo;
            </p>
          </div>
        )}

        {!searching && results.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-[#8a8580] mb-4">
              {results.length} result{results.length !== 1 ? "s" : ""}
            </p>

            {results.map((result, i) => (
              <div
                key={i}
                className="bg-white border border-[#eae4da] rounded-lg p-4 hover:border-[#2b8a88] transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-[#1a1a1a] text-sm">
                    {result.title}
                  </h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-medium ${typeColor(
                      result.type
                    )}`}
                  >
                    {result.type}
                  </span>
                </div>
                <p className="text-sm text-[#8a8580] mb-2">
                  {result.snippet}
                </p>
                <p className="text-xs text-[#b5b0aa]">{result.path}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
