"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface WikiSection {
  id: string;
  title: string;
  items: { label: string; slug: string; color: string }[];
}

interface MeetingSummary {
  name: string;
  path: string;
  date: string;
  title: string;
  isBrief: boolean;
}

// Bullet colors per spec: teal=active, amber=decision, coral=idea, gray=archived
const wikiSections: WikiSection[] = [
  {
    id: "founders",
    title: "Founders",
    items: [
      { label: "Shawn", slug: "people/shawn", color: "bg-[#e0f2f1]" },
      { label: "Mark", slug: "people/mark", color: "bg-[#ffebee]" },
      { label: "Michael", slug: "people/michael", color: "bg-[#f1f5f3]" },
    ],
  },
  {
    id: "partners",
    title: "Active Partners",
    items: [
      { label: "Active Partners", slug: "partners/active", color: "bg-[#e0f2f1]" },
    ],
  },
  {
    id: "operations",
    title: "Operations & Licensing",
    items: [
      { label: "Agent Onboarding", slug: "operations/onboarding", color: "bg-[#e0f2f1]" },
      { label: "Licensing Requirements", slug: "operations/licensing", color: "bg-[#e0f2f1]" },
      { label: "Renewals", slug: "operations/renewals", color: "bg-[#e0f2f1]" },
    ],
  },
  {
    id: "financial",
    title: "Financial Model",
    items: [
      { label: "Projections", slug: "financials/projections", color: "bg-[#e3f2fd]" },
      { label: "Compensation", slug: "financials/compensation", color: "bg-[#e3f2fd]" },
      { label: "Break-Even Analysis", slug: "financials/breakeven", color: "bg-[#e3f2fd]" },
      { label: "Manifesto v2", slug: "financials/manifesto-v2", color: "bg-[#e3f2fd]" },
      { label: "Base Scenario", slug: "financials/base-scenario", color: "bg-[#e3f2fd]" },
      { label: "Founder P&L", slug: "financials/founder-pnl", color: "bg-[#e3f2fd]" },
    ],
  },
  {
    id: "decisions",
    title: "Recent Decisions",
    items: [
      { label: "Group Table", slug: "group-table", color: "bg-[#fffbeb]" },
    ],
  },
  {
    id: "ideas",
    title: "Ideas & Brainstorms",
    items: [
      { label: "Product Expansion", slug: "ideas/expansion", color: "bg-[#fce4ec]" },
      { label: "Technology Wishlist", slug: "ideas/tech", color: "bg-[#fce4ec]" },
      { label: "Market Opportunities", slug: "ideas/market", color: "bg-[#fce4ec]" },
    ],
  },
  {
    id: "tracking",
    title: "Tracking",
    items: [
      { label: "Tasks", slug: "tasks", color: "bg-[#e0f2f1]" },
      { label: "Radar", slug: "radar", color: "bg-[#fffbeb]" },
      { label: "Reimbursements", slug: "reimbursements", color: "bg-[#fff3e0]" },
      { label: "Expenses", slug: "expenses", color: "bg-[#fff3e0]" },
      { label: "Parked Intentions", slug: "parked-intentions", color: "bg-[#f1f5f3]" },
    ],
  },
  {
    id: "reference",
    title: "Reference",
    items: [
      { label: "State of the Business", slug: "state", color: "bg-[#e0f2f1]" },
      { label: "Tools", slug: "tools", color: "bg-[#e3f2fd]" },
    ],
  },
  {
    id: "archived",
    title: "Archived",
    items: [
      { label: "Archived Partners", slug: "partners/archived", color: "bg-[#f5f5f5]" },
    ],
  },
];

export default function WikiPage() {
  const [search, setSearch] = useState("");
  const [meetings, setMeetings] = useState<MeetingSummary[]>([]);
  const [meetingsLoading, setMeetingsLoading] = useState(true);
  const [expandedMeeting, setExpandedMeeting] = useState<string | null>(null);
  const [meetingContent, setMeetingContent] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/meeting/list")
      .then((r) => r.json())
      .then((data) => {
        if (data.meetings) setMeetings(data.meetings);
      })
      .catch(() => {})
      .finally(() => setMeetingsLoading(false));
  }, []);

  const loadMeetingContent = async (path: string) => {
    if (meetingContent[path]) {
      setExpandedMeeting(expandedMeeting === path ? null : path);
      return;
    }
    try {
      const res = await fetch(`/api/meeting/view?file=${encodeURIComponent(path)}`);
      const data = await res.json();
      if (data.content) {
        setMeetingContent((prev) => ({ ...prev, [path]: data.content }));
        setExpandedMeeting(path);
      }
    } catch {}
  };

  const filteredMeetings = meetings.filter(
    (m) =>
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.date.includes(search)
  );

  const filteredSections = wikiSections.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) =>
        item.label.toLowerCase().includes(search.toLowerCase()) ||
        item.slug.toLowerCase().includes(search.toLowerCase())
    ),
  }));

  const allItemsHidden = filteredSections.every((s) => s.items.length === 0);

  return (
    <div className="min-h-screen bg-[#faf7f2]">
      <div className="container-main py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/"
            className="text-[#8a8580] hover:text-[#1a1a1a] transition-colors"
          >
            ← Back
          </Link>
          <h1 className="text-3xl font-bold font-serif text-[#1a1a1a]">Wiki</h1>
        </div>

        {/* Search bar */}
        <input
          type="text"
          placeholder="Search wiki..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 mb-6 border border-[#eae4da] rounded-lg bg-white text-[#1a1a1a] placeholder-[#8a8580] focus:outline-none focus:border-[#2b8a88] focus:ring-2 focus:ring-[#2b8a88] focus:ring-opacity-20 transition-all"
        />

        {/* At a Glance card */}
        <div className="card mb-8 bg-gradient-to-br from-[#ffffff] to-[#faf7f2]">
          <h2 className="serif-heading text-lg mb-3 text-[#1a1a1a]">
            At a Glance
          </h2>
          <ul className="space-y-2 text-sm text-[#1a1a1a]">
            <li className="flex items-start gap-2">
              <span className="text-[#e85d4e] font-bold">•</span>
              <span>Florida Medicare distribution agency launching June 2026</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#2b8a88] font-bold">•</span>
              <span>Three founders with complementary expertise (tech, ops, finance)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#a8b5a0] font-bold">•</span>
              <span>Pod launch strategy with carrier partnerships</span>
            </li>
          </ul>
        </div>

        {/* Contents TOC */}
        <div className="card mb-8">
          <h2 className="serif-heading text-lg mb-4 text-[#1a1a1a]">
            Contents
          </h2>
          <ul className="space-y-2 text-sm">
            <li>
              <a
                href="#meetings"
                className="text-[#2b8a88] hover:text-[#1a5554] transition-colors"
              >
                Meetings
              </a>
            </li>
            {wikiSections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="text-[#2b8a88] hover:text-[#1a5554] transition-colors"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Meetings Section */}
        <div id="meetings" className="mb-8">
          <h2 className="serif-heading text-xl mb-4 text-[#1a1a1a]">
            Meetings
          </h2>
          {meetingsLoading ? (
            <div className="card text-center py-8">
              <p className="text-[#8a8580]">Loading meetings...</p>
            </div>
          ) : filteredMeetings.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-[#8a8580]">
                {search ? `No meetings match "${search}"` : "No meeting notes yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMeetings.map((meeting) => (
                <div key={meeting.path}>
                  <button
                    onClick={() => loadMeetingContent(meeting.path)}
                    className={`w-full text-left p-4 rounded-lg border transition-all hover:shadow-md ${
                      meeting.isBrief
                        ? "border-[#f59e0b] bg-[#fffbeb] hover:border-[#d97706]"
                        : "border-[#eae4da] bg-[#e0f2f1] hover:border-[#2b8a88]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-6 rounded-full ${
                          meeting.isBrief ? "bg-[#f59e0b]" : "bg-[#2b8a88]"
                        }`}
                      />
                      <div className="flex-1">
                        <span className="font-medium text-[#1a1a1a]">
                          {meeting.title}
                        </span>
                        <span className="ml-3 text-xs text-[#8a8580]">
                          {meeting.date}
                        </span>
                      </div>
                      <span className="text-[#8a8580] text-sm">
                        {expandedMeeting === meeting.path ? "▲" : "▼"}
                      </span>
                    </div>
                  </button>
                  {expandedMeeting === meeting.path && meetingContent[meeting.path] && (
                    <div className="mt-2 p-4 rounded-lg border border-[#eae4da] bg-white">
                      <pre className="whitespace-pre-wrap text-sm text-[#1a1a1a] font-sans leading-relaxed">
                        {meetingContent[meeting.path]}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Wiki Sections */}
        {allItemsHidden && search ? (
          <div className="card text-center py-12">
            <p className="text-[#8a8580]">No wiki pages match "{search}"</p>
          </div>
        ) : (
          filteredSections.map((section) =>
            section.items.length > 0 ? (
              <div key={section.id} id={section.id} className="mb-8">
                <h2 className="serif-heading text-xl mb-4 text-[#1a1a1a]">
                  {section.title}
                </h2>
                <div className="space-y-3">
                  {section.items.map((item) => (
                    <Link
                      key={item.slug}
                      href={`/wiki/${item.slug}`}
                      className={`block p-4 rounded-lg border border-[#eae4da] ${item.color} hover:border-[#2b8a88] transition-all hover:shadow-md`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-6 rounded-full ${
                          section.id === "decisions" ? "bg-[#e8a33d]" :
                          section.id === "ideas" ? "bg-[#e85d4e]" :
                          section.id === "archived" ? "bg-[#8a8580]" :
                          "bg-[#2b8a88]"
                        }`} />
                        <span className="font-medium text-[#1a1a1a]">
                          {item.label}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null
          )
        )}
      </div>
    </div>
  );
}
