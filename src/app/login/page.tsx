"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError("Invalid password. Try again.");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf7f2] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold font-serif">
            <span className="text-[#1a1a1a]">Tri</span>
            <span className="text-[#e85d4e]">Be</span>
          </h1>
          <p className="text-sm text-[#8a8580] mt-2">FOUNDERS — FLORIDA</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-[#1a1a1a] mb-2"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-4 py-3 border border-[#eae4da] rounded-lg bg-white text-[#1a1a1a] placeholder-[#8a8580] focus:outline-none focus:border-[#2b8a88] focus:ring-2 focus:ring-[#2b8a88] focus:ring-opacity-20 transition-all"
              disabled={loading}
              autoFocus
            />
          </div>

          {error && (
            <div className="p-3 bg-[#fee6e6] border border-[#e85d4e] rounded-lg">
              <p className="text-sm text-[#e85d4e]">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary"
          >
            {loading ? "Entering..." : "Enter"}
          </button>
        </form>
      </div>
    </div>
  );
}
