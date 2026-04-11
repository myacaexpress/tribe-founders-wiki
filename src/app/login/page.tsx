"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const BG = "linear-gradient(180deg, rgba(3,8,18,0.98) 0%, rgba(5,22,28,0.96) 20%, rgba(6,32,35,0.94) 35%, rgba(50,32,22,0.88) 55%, rgba(65,38,28,0.9) 70%, rgba(45,18,15,0.94) 85%, rgba(8,4,10,0.99) 100%), url('/bg-nature.jpg')";

const glass: React.CSSProperties = {
  background: "rgba(255,255,255,0.08)",
  backdropFilter: "blur(40px)",
  WebkitBackdropFilter: "blur(40px)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 20,
  padding: 32,
  boxShadow: "0 4px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.08)",
};

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
    <div style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ position: "fixed", inset: 0, zIndex: 0, backgroundImage: BG, backgroundSize: "cover", backgroundPosition: "center" }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 380 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1 }}>
            <span style={{ color: "#fff" }}>Tri</span>
            <span style={{ color: "#ff6b5a" }}>Be</span>
          </div>
          <div style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginTop: 8 }}>
            Trifecta Founders
          </div>
        </div>

        {/* Form */}
        <div style={glass}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.6)", marginBottom: 8 }}>
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                style={{ width: "100%", padding: "14px 18px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, color: "#fff", fontSize: 15, outline: "none", boxSizing: "border-box" }}
                disabled={loading}
                autoFocus
              />
            </div>

            {error && (
              <div style={{ background: "rgba(255,107,90,0.12)", border: "1px solid rgba(255,107,90,0.3)", borderRadius: 12, padding: "12px 16px", marginBottom: 16 }}>
                <span style={{ fontSize: 14, color: "#ff6b5a" }}>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ display: "block", width: "100%", padding: "16px 24px", border: "none", borderRadius: 50, fontSize: 16, fontWeight: 700, background: "linear-gradient(135deg, #00c9a7, #00b4d8)", color: "#fff", boxShadow: "0 4px 20px rgba(0,201,167,0.3)", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Entering..." : "Enter"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
