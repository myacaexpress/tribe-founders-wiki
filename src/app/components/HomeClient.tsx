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

const glass = {
  background: "rgba(255,255,255,0.14)",
  backdropFilter: "blur(32px)",
  WebkitBackdropFilter: "blur(32px)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)",
  borderRadius: "20px",
} as React.CSSProperties;

export default function HomeClient({
  radarItems,
  groupTableItems,
  laneItems,
  taskItems,
  businessStateSentence,
}: HomeClientProps) {
  const [activeTab, setActiveTab] = useState<"todo" | "done">("todo");

  const todoItems = taskItems.filter((t) => !t.done);
  const doneItems = taskItems.filter((t) => t.done);

  const getFounderColor = (founder?: string) => {
    switch (founder) {
      case "shawn":  return "text-[#00c9a7]";
      case "mark":   return "text-[#ff7b6b]";
      case "michael":return "text-[#b8c8b0]";
      default:       return "text-white/60";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "raised":    return "bg-amber-400/20 text-amber-300";
      case "discussed": return "bg-sky-400/20 text-sky-300";
      case "decided":   return "bg-[#00c9a7]/20 text-[#00c9a7]";
      case "executing": return "bg-indigo-400/20 text-indigo-300";
      default:          return "bg-emerald-400/20 text-emerald-300";
    }
  };

  return (
    <div
      className="pb-24 px-5"
      style={{
        minHeight: "100vh",
        backgroundImage: `linear-gradient(175deg, rgba(10,46,56,0.9) 0%, rgba(26,74,74,0.8) 25%, rgba(45,107,90,0.7) 40%, rgba(199,106,74,0.7) 65%, rgba(232,149,106,0.6) 80%, rgba(42,26,46,0.92) 100%), url('/bg-sunset.jpg')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="max-w-lg mx-auto py-8 space-y-5">

        {/* Logo header */}
        <div className="text-center pt-2 pb-2">
          <h1 className="text-5xl font-bold font-serif">
            <span className="text-white">Tri</span>
            <span className="text-[#ff7b6b]">Be</span>
          </h1>
          <p className="text-sm font-semibold text-white/70 tracking-widest mt-2">
            FOUNDERS — FLORIDA
          </p>
        </div>

        {/* State sentence card */}
        <div className="border border-white/25 p-6" style={glass}>
          <p className="text-white font-serif text-lg leading-relaxed">
            {businessStateSentence}
          </p>
        </div>

        {/* Action buttons — scrollable pill row */}
        <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          <a
            href="https://meet.google.com/new"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-none px-5 py-2.5 bg-[#00c9a7] text-white rounded-full font-bold text-sm whitespace-nowrap hover:opacity-90 transition-opacity"
          >
            Meet
          </a>
          {[
            { href: "/meeting", label: "Record" },
            { href: "/watchers", label: "Watchers" },
            { href: "/search",   label: "Search" },
            { href: "/wiki",     label: "Full Wiki" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="flex-none px-5 py-2.5 border border-white/25 rounded-full font-semibold text-sm text-white whitespace-nowrap hover:bg-white/20 transition-colors"
              style={{ background: "rgba(255,255,255,0.18)" }}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Radar card — each item is its own mini card */}
        <div className="border border-white/25 p-6" style={glass}>
          <h2 className="serif-heading text-xl mb-4 text-white font-bold">Radar</h2>
          <div className="space-y-3">
            {radarItems.map((item) => (
              <div
                key={item.id}
                className="flex gap-3 p-4 rounded-xl border border-white/15"
                style={{ background: "rgba(255,255,255,0.1)" }}
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 ${
                    item.level === "red"   ? "bg-[#e85d4e]"
                    : item.level === "amber" ? "bg-amber-400"
                    : "bg-[#b8c8b0]"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white leading-snug">{item.title}</p>
                  {item.description && (
                    <p className="text-sm text-white/60 mt-0.5">{item.description}</p>
                  )}
                  {item.daysUntil && (
                    <p className="text-xs text-[#00c9a7] font-semibold mt-1">{item.daysUntil} days</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Group Table card */}
        <div className="border border-white/25 p-6" style={glass}>
          <h2 className="serif-heading text-xl mb-4 text-white font-bold">Group Table</h2>
          <div className="space-y-3">
            {groupTableItems.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-white/15"
                style={{ background: "rgba(255,255,255,0.1)" }}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-semibold text-white leading-snug">{item.title}</p>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${getStatusBadge(item.status)}`}>
                    {item.status}
                  </span>
                </div>
                <p className="text-xs text-white/50">{item.owner}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Lanes card */}
        <div className="border border-white/25 p-6" style={glass}>
          <h2 className="serif-heading text-xl mb-4 text-white font-bold">Lanes</h2>
          <div className="space-y-5">
            {[
              { key: "shawn",   label: "Shawn",   color: "#00c9a7", items: laneItems.shawn },
              { key: "mark",    label: "Mark",    color: "#ff7b6b", items: laneItems.mark },
              { key: "michael", label: "Michael", color: "#b8c8b0", items: laneItems.michael },
            ].map(({ key, label, color, items }) => (
              <div key={key}>
                <h3 className="text-sm font-bold mb-2" style={{ color }}>{label}</h3>
                <div className="space-y-2 pl-4 border-l-2" style={{ borderColor: color }}>
                  {items?.map((lane) => (
                    <div key={lane.id}>
                      <p className="font-medium text-white text-sm">{lane.title}</p>
                      <p className="text-xs text-white/60">{lane.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tasks card */}
        <div className="border border-white/25 p-6" style={glass}>
          <h2 className="serif-heading text-xl mb-4 text-white font-bold">Tasks</h2>
          {/* Tab row — pill buttons, scrollable */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {(["todo", "done"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-none px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all"
                style={activeTab === tab
                  ? { background: "#00c9a7", color: "#fff" }
                  : { background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.2)" }
                }
              >
                {tab === "todo" ? `To Do (${todoItems.length})` : `Done (${doneItems.length})`}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {(activeTab === "todo" ? todoItems : doneItems).map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3.5 rounded-xl border border-white/15"
                style={{ background: "rgba(255,255,255,0.1)" }}
              >
                <input type="checkbox" checked={task.done} readOnly className="w-4 h-4 flex-shrink-0" />
                <p className={`text-sm font-medium ${getFounderColor(task.founder)}`}>{task.title}</p>
              </div>
            ))}
          </div>
        </div>

        {/* This Week timeline card */}
        <div className="border border-white/25 p-6" style={glass}>
          <h2 className="serif-heading text-xl mb-4 text-white font-bold">This Week</h2>
          <div className="relative pl-6">
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-white/20" />
            <div className="space-y-4">
              {[
                { color: "#e85d4e", text: "April 12: Carrier meeting (Humana)" },
                { color: "#00c9a7", text: "April 14: Tech stack decision" },
                { color: "#b8c8b0", text: "April 15: Financial model review" },
              ].map(({ color, text }) => (
                <div key={text} className="relative">
                  <div className="absolute -left-[1.35rem] top-1 w-3 h-3 rounded-full" style={{ background: color }} />
                  <p className="font-semibold text-white">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* FAB */}
      <Link
        href="/add"
        className="fixed bottom-8 right-6 w-14 h-14 bg-[#e85d4e] text-white rounded-full flex items-center justify-center font-bold text-xl hover:opacity-90 transition-opacity shadow-lg"
      >
        +
      </Link>
    </div>
  );
}
