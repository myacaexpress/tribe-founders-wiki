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

  const getFounderBgColor = (founder?: string) => {
    switch (founder) {
      case "shawn":
        return "bg-[#f0f8f7]";
      case "mark":
        return "bg-[#fef4f2]";
      case "michael":
        return "bg-[#f5f7f4]";
      default:
        return "bg-[#faf7f2]";
    }
  };

  return (
    <div className="min-h-screen bg-[#faf7f2] pb-24">
      <div className="container-main py-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold font-serif mb-2">
            <span className="text-[#1a1a1a]">Tri</span>
            <span className="text-[#e85d4e]">Be</span>
          </h1>
          <p className="text-xs font-semibold text-[#8a8580] tracking-widest">
            FOUNDERS — FLORIDA
          </p>
        </div>

        {/* State sentence card */}
        <div className="card mb-4 bg-gradient-to-br from-[#ffffff] to-[#faf7f2]">
          <p className="text-[#1a1a1a] font-serif text-lg leading-relaxed">
            {businessStateSentence}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mb-4">
          <a
            href="https://meet.google.com/new"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 btn-primary text-center"
          >
            Start Google Meet
          </a>
          <Link
            href="/meeting"
            className="flex-none px-4 py-2 border border-[#eae4da] bg-white text-[#1a1a1a] rounded-lg font-semibold text-sm hover:bg-[#faf7f2] transition-colors flex items-center"
          >
            Meeting Tools
          </Link>
          <Link
            href="/watchers"
            className="flex-none px-4 py-2 border border-[#eae4da] bg-white text-[#1a1a1a] rounded-lg font-semibold text-sm hover:bg-[#faf7f2] transition-colors flex items-center"
          >
            Watchers
          </Link>
          <Link
            href="/search"
            className="flex-none px-4 py-2 border border-[#eae4da] bg-white text-[#1a1a1a] rounded-lg font-semibold text-sm hover:bg-[#faf7f2] transition-colors flex items-center"
          >
            Search
          </Link>
        </div>

        {/* Radar card */}
        <div className="card mb-4">
          <h2 className="serif-heading text-lg mb-4 text-[#1a1a1a]">Radar</h2>
          <div className="space-y-3">
            {radarItems.map((item) => (
              <div
                key={item.id}
                className="flex gap-3 pb-3 border-b border-[#eae4da] last:border-b-0"
              >
                <div
                  className={`w-3 h-3 rounded-full flex-shrink-0 mt-1 ${
                    item.level === "red"
                      ? "bg-[#e85d4e]"
                      : item.level === "amber"
                      ? "bg-[#e8a33d]"
                      : "bg-[#a8b5a0]"
                  }`}
                />
                <div className="flex-1">
                  <p className="font-medium text-[#1a1a1a]">{item.title}</p>
                  {item.description && (
                    <p className="text-sm text-[#8a8580]">{item.description}</p>
                  )}
                  {item.daysUntil && (
                    <p className="text-xs text-[#8a8580] mt-1">
                      {item.daysUntil} days
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Group Table card */}
        <div className="card mb-4">
          <h2 className="serif-heading text-lg mb-4 text-[#1a1a1a]">
            Group Table
          </h2>
          <div className="space-y-3">
            {groupTableItems.map((item) => (
              <div key={item.id} className="pb-3 border-b border-[#eae4da] last:border-b-0">
                <div className="flex items-start justify-between mb-1">
                  <p className="font-medium text-[#1a1a1a]">{item.title}</p>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded ${
                      item.status === "raised"
                        ? "bg-amber-100 text-amber-700"
                        : item.status === "discussed"
                        ? "bg-blue-100 text-blue-700"
                        : item.status === "decided"
                        ? "bg-teal-100 text-teal-700"
                        : item.status === "executing"
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
                <p className="text-xs text-[#8a8580]">{item.owner}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Lanes card */}
        <div className="card mb-4">
          <h2 className="serif-heading text-lg mb-4 text-[#1a1a1a]">Lanes</h2>
          <div className="space-y-4">
            {/* Shawn - Teal */}
            <div>
              <h3 className="text-sm font-semibold text-[#2b8a88] mb-2">
                Shawn (Teal)
              </h3>
              <div className="space-y-2 pl-4 border-l-2 border-[#2b8a88]">
                {laneItems.shawn?.map((lane) => (
                  <div key={lane.id} className="text-sm">
                    <p className="font-medium text-[#1a1a1a]">{lane.title}</p>
                    <p className="text-xs text-[#8a8580]">{lane.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Mark - Coral */}
            <div>
              <h3 className="text-sm font-semibold text-[#e85d4e] mb-2">
                Mark (Coral)
              </h3>
              <div className="space-y-2 pl-4 border-l-2 border-[#e85d4e]">
                {laneItems.mark?.map((lane) => (
                  <div key={lane.id} className="text-sm">
                    <p className="font-medium text-[#1a1a1a]">{lane.title}</p>
                    <p className="text-xs text-[#8a8580]">{lane.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Michael - Sage */}
            <div>
              <h3 className="text-sm font-semibold text-[#a8b5a0] mb-2">
                Michael (Sage)
              </h3>
              <div className="space-y-2 pl-4 border-l-2 border-[#a8b5a0]">
                {laneItems.michael?.map((lane) => (
                  <div key={lane.id} className="text-sm">
                    <p className="font-medium text-[#1a1a1a]">{lane.title}</p>
                    <p className="text-xs text-[#8a8580]">{lane.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tasks card */}
        <div className="card mb-4">
          <h2 className="serif-heading text-lg mb-4 text-[#1a1a1a]">Tasks</h2>
          <div className="mb-4 flex gap-2 border-b border-[#eae4da]">
            <button
              onClick={() => setActiveTab("todo")}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === "todo"
                  ? "text-[#2b8a88] border-b-2 border-[#2b8a88]"
                  : "text-[#8a8580]"
              }`}
            >
              To Do ({todoItems.length})
            </button>
            <button
              onClick={() => setActiveTab("done")}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === "done"
                  ? "text-[#2b8a88] border-b-2 border-[#2b8a88]"
                  : "text-[#8a8580]"
              }`}
            >
              Done ({doneItems.length})
            </button>
          </div>

          <div className="space-y-2">
            {(activeTab === "todo" ? todoItems : doneItems).map((task) => (
              <div
                key={task.id}
                className={`flex items-center gap-3 p-3 rounded ${getFounderBgColor(
                  task.founder
                )}`}
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
          className="block w-full text-center py-3 px-4 border-2 border-dashed border-[#eae4da] rounded-lg text-[#2b8a88] font-medium hover:border-[#2b8a88] hover:bg-[#f0f8f7] transition-colors mb-4"
        >
          Open Full Wiki
        </Link>

        {/* This Week timeline card */}
        <div className="card">
          <h2 className="serif-heading text-lg mb-4 text-[#1a1a1a]">
            This Week
          </h2>
          <div className="relative pl-6">
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#eae4da]" />
            <div className="space-y-4">
              <div className="relative">
                <div className="absolute -left-4 top-1 w-3 h-3 rounded-full bg-[#e85d4e]" />
                <p className="font-medium text-[#1a1a1a]">
                  April 12: Carrier meeting (Humana)
                </p>
              </div>
              <div className="relative">
                <div className="absolute -left-4 top-1 w-3 h-3 rounded-full bg-[#2b8a88]" />
                <p className="font-medium text-[#1a1a1a]">
                  April 14: Tech stack decision
                </p>
              </div>
              <div className="relative">
                <div className="absolute -left-4 top-1 w-3 h-3 rounded-full bg-[#a8b5a0]" />
                <p className="font-medium text-[#1a1a1a]">
                  April 15: Financial model review
                </p>
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
