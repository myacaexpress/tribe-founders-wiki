"use client";

import { useState } from "react";
import Link from "next/link";
import type {
  RadarItem,
  GroupTableItem,
  LaneItem,
  TaskItem,
} from "@/lib/data";

export interface HomeClientProps {
  radarItems: RadarItem[];
  groupTableItems: GroupTableItem[];
  laneItems: Record<string, LaneItem[]>;
  taskItems: TaskItem[];
  businessStateSentence: string;
}

const BG_GRADIENT = "linear-gradient(180deg, rgba(3,8,18,0.98) 0%, rgba(5,22,28,0.96) 20%, rgba(6,32,35,0.94) 35%, rgba(50,32,22,0.88) 55%, rgba(65,38,28,0.9) 70%, rgba(45,18,15,0.94) 85%, rgba(8,4,10,0.99) 100%)";

const glass: React.CSSProperties = {
  background: "rgba(255,255,255,0.08)",
  backdropFilter: "blur(40px)",
  WebkitBackdropFilter: "blur(40px)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 20,
  padding: 24,
  marginBottom: 16,
  boxShadow: "0 4px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.08)",
};

const tabActive: React.CSSProperties = {
  flexShrink: 0,
  padding: "10px 20px",
  borderRadius: 50,
  fontSize: 14,
  fontWeight: 600,
  border: "none",
  whiteSpace: "nowrap",
  background: "linear-gradient(135deg, #00c9a7, #00b4d8)",
  color: "#fff",
  boxShadow: "0 4px 15px rgba(0,201,167,0.3)",
  cursor: "pointer",
};

const tabInactive: React.CSSProperties = {
  flexShrink: 0,
  padding: "10px 20px",
  borderRadius: 50,
  fontSize: 14,
  fontWeight: 600,
  whiteSpace: "nowrap",
  background: "rgba(255,255,255,0.08)",
  color: "rgba(255,255,255,0.6)",
  border: "1px solid rgba(255,255,255,0.1)",
  cursor: "pointer",
};

export default function HomeClient({
  radarItems,
  groupTableItems,
  laneItems,
  taskItems,
  businessStateSentence,
}: HomeClientProps) {
  const [activeTab, setActiveTab] = useState<"todo" | "done">("todo");
  const [showMeetShare, setShowMeetShare] = useState(false);
  const [meetUrl, setMeetUrl] = useState("https://meet.google.com/new");

  const todoItems = taskItems.filter((t) => !t.done);
  const doneItems = taskItems.filter((t) => t.done);

  const founderColor = (founder?: string): string => {
    switch (founder) {
      case "shawn":   return "#00c9a7";
      case "mark":    return "#ff6b5a";
      case "michael": return "#b8c8b0";
      default:        return "rgba(255,255,255,0.5)";
    }
  };

  const statusBadgeStyle = (status: string): React.CSSProperties => {
    switch (status) {
      case "raised":    return { background: "rgba(251,191,36,0.15)",  color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)" };
      case "discussed": return { background: "rgba(56,189,248,0.15)",  color: "#38bdf8", border: "1px solid rgba(56,189,248,0.3)" };
      case "decided":   return { background: "rgba(0,201,167,0.15)",   color: "#00c9a7", border: "1px solid rgba(0,201,167,0.3)" };
      case "executing": return { background: "rgba(129,140,248,0.15)", color: "#818cf8", border: "1px solid rgba(129,140,248,0.3)" };
      default:          return { background: "rgba(52,211,153,0.15)",  color: "#34d399", border: "1px solid rgba(52,211,153,0.3)" };
    }
  };

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>

      {/* Fixed scenic background */}
      <div style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        backgroundImage: `${BG_GRADIENT}, url('/bg-nature.jpg')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }} />

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1, maxWidth: 420, margin: "0 auto", padding: "48px 20px 100px" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1 }}>
            <span style={{ color: "#fff" }}>Tri</span>
            <span style={{ color: "#ff6b5a" }}>Be</span>
          </div>
          <div style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginTop: 6 }}>
            Trifecta Founders
          </div>
        </div>

        {/* State sentence */}
        <div style={glass}>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: "rgba(255,255,255,0.75)", margin: 0 }}>
            {businessStateSentence}
          </p>
        </div>

        {/* Action buttons */}
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" as never, marginBottom: 16, marginLeft: -20, marginRight: -20, paddingLeft: 20, paddingRight: 20 } as React.CSSProperties}>
          <div style={{ display: "flex", gap: 8, paddingTop: 4, paddingBottom: 8, width: "max-content" }}>
            <button
              onClick={() => {
                window.open("https://meet.google.com/new", "_blank", "noopener,noreferrer");
                setShowMeetShare(true);
              }}
              style={{ flexShrink: 0, padding: "10px 20px", borderRadius: 50, fontSize: 14, fontWeight: 600, background: "linear-gradient(135deg, #00c9a7, #00b4d8)", color: "#fff", border: "none", whiteSpace: "nowrap", boxShadow: "0 4px 15px rgba(0,201,167,0.3)", cursor: "pointer" }}
            >
              Meet
            </button>
            {[
              { href: "/meeting",  label: "Record" },
              { href: "/watchers", label: "Watchers" },
              { href: "/search",   label: "Search" },
              { href: "/wiki",     label: "Full Wiki" },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                style={{ flexShrink: 0, padding: "10px 20px", borderRadius: 50, fontSize: 14, fontWeight: 600, background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.1)", textDecoration: "none", whiteSpace: "nowrap" }}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* Meet share panel */}
        {showMeetShare && (
          <div style={{ ...glass, marginBottom: 16, padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>Share Meeting Link</span>
              <button onClick={() => setShowMeetShare(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 18, cursor: "pointer", padding: 0, lineHeight: 1 }}>×</button>
            </div>
            <input
              type="text"
              value={meetUrl}
              onChange={(e) => setMeetUrl(e.target.value)}
              placeholder="Paste your Meet URL here"
              style={{ width: "100%", padding: "8px 12px", borderRadius: 10, fontSize: 13, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", outline: "none", boxSizing: "border-box", marginBottom: 10 }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <a
                href={`sms:?body=${encodeURIComponent(`Join our meeting: ${meetUrl}`)}`}
                style={{ flex: 1, textAlign: "center", padding: "9px 12px", borderRadius: 10, fontSize: 13, fontWeight: 600, background: "rgba(0,201,167,0.15)", color: "#00c9a7", border: "1px solid rgba(0,201,167,0.3)", textDecoration: "none", whiteSpace: "nowrap" }}
              >
                iMessage
              </a>
              <a
                href={`mailto:?subject=${encodeURIComponent("Meeting Link")}&body=${encodeURIComponent(`Join our meeting: ${meetUrl}`)}`}
                style={{ flex: 1, textAlign: "center", padding: "9px 12px", borderRadius: 10, fontSize: 13, fontWeight: 600, background: "rgba(180,212,255,0.1)", color: "#7dd3fc", border: "1px solid rgba(125,211,252,0.3)", textDecoration: "none", whiteSpace: "nowrap" }}
              >
                Email
              </a>
            </div>
          </div>
        )}

        {/* Radar */}
        <div style={glass}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 16 }}>Radar</div>
          {radarItems.map((item) => (
            <div
              key={item.id}
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "16px 18px", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                    background: item.level === "red" ? "#ff6b5a" : item.level === "amber" ? "#f59e0b" : "#b8c8b0",
                  }} />
                  <span style={{ fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.9)" }}>{item.title}</span>
                </div>
                {item.description && (
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 4, paddingLeft: 16 }}>{item.description}</div>
                )}
              </div>
              {item.daysUntil != null && (
                <div style={{ fontSize: 14, fontWeight: 700, color: (item.daysUntil as number) <= 7 ? "#ff6b5a" : "#00c9a7", flexShrink: 0, marginLeft: 12 }}>
                  {item.daysUntil}d
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Group Table */}
        <div style={glass}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 16 }}>Group Table</div>
          {groupTableItems.map((item) => (
            <div
              key={item.id}
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "16px 18px", marginBottom: 10 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 4 }}>
                <span style={{ fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.9)" }}>{item.title}</span>
                <span style={{
                  ...statusBadgeStyle(item.status),
                  fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 50,
                  flexShrink: 0, textTransform: "capitalize",
                }}>
                  {item.status}
                </span>
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>{item.owner}</div>
            </div>
          ))}
        </div>

        {/* Lanes */}
        <div style={glass}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 16 }}>Lanes</div>
          {[
            { key: "shawn",   label: "Shawn",   color: "#00c9a7", items: laneItems.shawn },
            { key: "mark",    label: "Mark",    color: "#ff6b5a", items: laneItems.mark },
            { key: "michael", label: "Michael", color: "#b8c8b0", items: laneItems.michael },
          ].map(({ key, label, color, items }) => (
            <div key={key} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 8 }}>{label}</div>
              <div style={{ paddingLeft: 16, borderLeft: `2px solid ${color}` }}>
                {items?.map((lane) => (
                  <div key={lane.id} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.85)" }}>{lane.title}</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>{lane.description}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Tasks */}
        <div style={glass}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 16 }}>Tasks</div>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "4px 0", marginBottom: 16, scrollbarWidth: "none" }}>
            {(["todo", "done"] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={activeTab === tab ? tabActive : tabInactive}>
                {tab === "todo" ? `To Do (${todoItems.length})` : `Done (${doneItems.length})`}
              </button>
            ))}
          </div>
          {(activeTab === "todo" ? todoItems : doneItems).map((task) => (
            <div
              key={task.id}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, marginBottom: 8 }}
            >
              <input type="checkbox" checked={task.done} readOnly style={{ width: 16, height: 16, flexShrink: 0, accentColor: "#00c9a7" }} />
              <span style={{ fontSize: 14, fontWeight: 500, color: founderColor(task.founder) }}>{task.title}</span>
            </div>
          ))}
        </div>

        {/* This Week */}
        <div style={{ ...glass, marginBottom: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 16 }}>This Week</div>
          <div style={{ position: "relative", paddingLeft: 24 }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, background: "rgba(255,255,255,0.15)" }} />
            {[
              { color: "#ff6b5a", text: "April 12: Carrier meeting (Humana)" },
              { color: "#00c9a7", text: "April 14: Tech stack decision" },
              { color: "#b8c8b0", text: "April 15: Financial model review" },
            ].map(({ color, text }) => (
              <div key={text} style={{ position: "relative", marginBottom: 16 }}>
                <div style={{ position: "absolute", left: -30, top: 4, width: 12, height: 12, borderRadius: "50%", background: color }} />
                <div style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.85)" }}>{text}</div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* FAB */}
      <Link
        href="/add"
        style={{
          position: "fixed", bottom: 32, right: 24, width: 56, height: 56,
          background: "linear-gradient(135deg, #ff6b5a, #ff8a65)", borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: 24, fontWeight: 700, textDecoration: "none",
          boxShadow: "0 4px 20px rgba(255,107,90,0.4)", zIndex: 50,
        }}
      >
        +
      </Link>
    </div>
  );
}
