"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AddPage() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [destination, setDestination] = useState<
    "lane" | "brainstorm" | "email"
  >("lane");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);

    try {
      // For Phase 1, just log and show success
      console.log("Add Something:", { content, destination });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      setSuccess(true);
      setContent("");

      // Close after 2 seconds
      setTimeout(() => {
        router.back();
      }, 1500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf7f2] flex flex-col">
      <div className="container-main py-6 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/"
            className="text-[#8a8580] hover:text-[#1a1a1a] transition-colors"
          >
            ← Back
          </Link>
        </div>

        {/* Main content */}
        {success ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-4">✓</div>
              <p className="text-[#1a1a1a] font-serif text-lg">Got it!</p>
              <p className="text-[#8a8580] text-sm mt-2">Closing in a moment...</p>
            </div>
          </div>
        ) : (
          <>
            <h1 className="serif-heading text-3xl mb-8 text-[#1a1a1a]">
              What&apos;s on your mind?
            </h1>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-6">
              {/* Textarea */}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your thought, idea, decision, or update..."
                className="flex-1 px-4 py-4 border border-[#eae4da] rounded-lg bg-white text-[#1a1a1a] placeholder-[#8a8580] focus:outline-none focus:border-[#2b8a88] focus:ring-2 focus:ring-[#2b8a88] focus:ring-opacity-20 transition-all resize-none"
                disabled={loading}
                autoFocus
              />

              {/* Destination buttons */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setDestination("lane")}
                  className={`py-3 px-4 rounded-lg font-medium transition-all ${
                    destination === "lane"
                      ? "bg-[#2b8a88] text-white ring-2 ring-[#2b8a88] ring-offset-2 ring-offset-[#faf7f2]"
                      : "bg-white text-[#2b8a88] border border-[#2b8a88]"
                  }`}
                  disabled={loading}
                >
                  My Lane
                </button>
                <button
                  type="button"
                  onClick={() => setDestination("brainstorm")}
                  className={`py-3 px-4 rounded-lg font-medium transition-all ${
                    destination === "brainstorm"
                      ? "bg-[#e85d4e] text-white ring-2 ring-[#e85d4e] ring-offset-2 ring-offset-[#faf7f2]"
                      : "bg-white text-[#e85d4e] border border-[#e85d4e]"
                  }`}
                  disabled={loading}
                >
                  My Brainstorm
                </button>
                <button
                  type="button"
                  onClick={() => setDestination("email")}
                  disabled
                  className="py-3 px-4 rounded-lg font-medium bg-white text-[#a8b5a0] border border-[#a8b5a0] opacity-50 cursor-not-allowed relative"
                >
                  Watch Email
                  <span className="absolute -top-2 -right-2 bg-[#e8a33d] text-[#1a1a1a] text-xs font-bold px-2 py-1 rounded">
                    Phase 2
                  </span>
                </button>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <Link
                  href="/"
                  className="flex-1 btn-secondary text-center"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading || !content.trim()}
                  className="flex-1 btn-primary disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
