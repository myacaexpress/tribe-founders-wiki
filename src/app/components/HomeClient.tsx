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

const SCENIC_BG = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1080&q=80";

const glass = {
  background: "rgba(255,255,255,0.18)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
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
      className="min-h-screen pb-24"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(6,45,45,0.75) 0%, rgba(6,45,45,0.5) 40%, rgba(180,80,50,0.55) 80%, rgba(60,20,10,0.8) 100%), url(${SCENIC_BG})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="container-main py-6">

        {/* Logo header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold font-serif">
            <span className="text-white">Tri</span>
            <span className="text-[#ff7b6b]">Be</span>
          </h1>
          <p className="text-xs font-semibold text-white/50 tracking-widest mt-1">
            FOUNDERS — FLORIDA
          </p>
        </div>

        {/* State sentence card */}
        <div className="rounded-2xl border border-white/30 p-5 mb-4" style={glass}>
          <p className="text-white font-serif text-lg leading-relaxed">
            {businessStateSentence}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <a
            href="https://meet.google.com/new"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 btn-primary text-center text-sm py-2"
          >
            Meet
          </a>
          <Link
            href="/meeting"
            className="flex-none px-3 py-2 border border-white/30 rounded-full font-semibold text-sm text-white hover:bg-white/10 transition-colors"
            style={{ background: "rgba(255,255,255,0.18)" }}
          >
            Record
          </Link>
          <Link
            href="/watchers"
            className="flex-none px-3 py-2 border border-white/30 rounded-full font-semibold text-sm text-white hover:bg-white/10 transition-colors"
            style={{ background: "rgba(255,255,255,0.18)" }}
          >
            Watchers
          </Link>
          <Link
            href="/search"
            className="flex-none px-3 py-2 border border-white/30 rounded-full font-semibold text-sm text-white hover:bg-white/10 transition-colors"
            style={{ background: "rgba(255,255,255,0.18)" }}
          >
            Search
          </Link>
        </div>

        {/* Radar card */}
        <div className="rounded-2xl border border-white/30 p-5 mb-4" style={glass}>
          <h2 className="serif-heading text-lg mb-4 text-white font-bold">Radar</h2>
          <div className="space-y-3">
            {radarItems.map((item) => (
              <div
                key={item.id}
                className="flex gap-3 pb-3 border-b border-white/10 last:border-b-0"
              >
                <div
                  className={`w-3 h-3 rounded-full flex-shrink-0 mt-1 ${
                    item.level === "red"
                      ? "bg-[#e85d4e]"
                      : item.level === "amber"
                      ? "bg-amber-400"
                      : "bg-[#b8c8b0]"
                  }`}
                />
                <div className="flex-1">
                  <p className="font-medium text-white">{item.title}</p>
                  {item.description && (
                    <p className="text-sm text-white/60">{item.description}</p>
                  )}
                  {item.daysUntil && (
                    <p className="text-xs text-white/50 mt-1">{item.daysUntil} days</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Group Table card */}
        <div className="rounded-2xl border border-white/30 p-5 mb-4" style={glass}>
          <h2 className="serif-heading text-lg mb-4 text-white font-bold">Group Table</h2>
          <div className="space-y-3">
            {groupTableItems.map((item) => (
              <div key={item.id} className="pb-3 border-b border-white/10 last:border-b-0">
                <div className="flex items-start justify-between mb-1">
                  <p className="font-medium text-white">{item.title}</p>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusBadge(item.status)}`}>
                    {item.status}
                  </span>
                </div>
                <p className="text-xs text-white/50">{item.owner}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Lanes card */}
        <div className="rounded-2xl border border-white/30 p-5 mb-4" style={glass}>
          <h2 className="serif-heading text-lg mb-4 text-white font-bold">Lanes</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-[#00c9a7] mb-2">Shawn</h3>
              <div className="space-y-2 pl-4 border-l-2 border-[#00c9a7]">
                {laneItems.shawn?.map((lane) => (
                  <div key={lane.id} className="text-sm">
                    <p className="font-medium text-white">{lane.title}</p>
                    <p className="text-xs text-white/60">{lane.description}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#ff7b6b] mb-2">Mark</h3>
              <div className="space-y-2 pl-4 border-l-2 border-[#ff7b6b]">
                {laneItems.mark?.map((lane) => (
                  <div key={lane.id} className="text-sm">
                    <p className="font-medium text-white">{lane.title}</p>
                    <p className="text-xs text-white/60">{lane.description}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#b8c8b0] mb-2">Michael</h3>
              <div className="space-y-2 pl-4 border-l-2 border-[#b8c8b0]">
                {laneItems.michael?.map((lane) => (
                  <div key={lane.id} className="text-sm">
                    <p className="font-medium text-white">{lane.title}</p>
                    <p className="text-xs text-white/60">{lane.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tasks card */}
        <div className="rounded-2xl border border-white/30 p-5 mb-4" style={glass}>
          <h2 className="serif-heading text-lg mb-4 text-white font-bold">Tasks</h2>
          <div className="mb-4 flex gap-2 border-b border-white/20">
            <button
              onClick={() => setActiveTab("todo")}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === "todo"
                  ? "text-[#00c9a7] border-b-2 border-[#00c9a7]"
                  : "text-white/50"
              }`}
            >
              To Do ({todoItems.length})
            </button>
            <button
              onClick={() => setActiveTab("done")}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === "done"
                  ? "text-[#00c9a7] border-b-2 border-[#00c9a7]"
                  : "text-white/50"
              }`}
            >
              Done ({doneItems.length})
            </button>
          </div>
          <div className="space-y-2">
            {(activeTab === "todo" ? todoItems : doneItems).map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.15)" }}
              >
                <input
                  type="checkbox"
                  checked={task.done}
                  readOnly
                  className="w-4 h-4"
                />
                <p className={`text-sm font-medium ${getFounderColor(task.founder)}`}>
                  {task.title}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Open Full Wiki link */}
        <Link
          href="/wiki"
          className="block w-full text-center py-3 px-4 border border-white/30 rounded-full text-white font-semibold hover:bg-white/10 transition-colors mb-4"
          style={{ background: "rgba(255,255,255,0.15)" }}
        >
          Open Full Wiki
        </Link>

        {/* This Week timeline card */}
        <div className="rounded-2xl border border-white/30 p-5" style={glass}>
          <h2 className="serif-heading text-lg mb-4 text-white font-bold">This Week</h2>
          <div className="relative pl-6">
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-white/20" />
            <div className="space-y-4">
              <div className="relative">
                <div className="absolute -left-4 top-1 w-3 h-3 rounded-full bg-[#e85d4e]" />
                <p className="font-medium text-white">April 12: Carrier meeting (Humana)</p>
              </div>
              <div className="relative">
                <div className="absolute -left-4 top-1 w-3 h-3 rounded-full bg-[#00c9a7]" />
                <p className="font-medium text-white">April 14: Tech stack decision</p>
              </div>
              <div className="relative">
                <div className="absolute -left-4 top-1 w-3 h-3 rounded-full bg-[#b8c8b0]" />
                <p className="font-medium text-white">April 15: Financial model review</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Add Something FAB */}
      <Link
        href="/add"
        className="fixed bottom-8 right-6 w-14 h-14 bg-[#e85d4e] text-white rounded-full flex items-center justify-center font-bold text-xl hover:opacity-90 transition-opacity shadow-lg"
      >
        +
      </Link>
    </div>
  );
}
