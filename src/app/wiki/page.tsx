"use client";

import { useState } from "react";
import Link from "next/link";

interface WikiSection {
  id: string;
  title: string;
  items: { label: string; slug: string; color: string }[];
}

const wikiSections: WikiSection[] = [
  {
    id: "founders",
    title: "Founders",
    items: [
      { label: "Shawn", slug: "founders/shawn", color: "bg-[#e0f2f1]" },
      { label: "Mark", slug: "founders/mark", color: "bg-[#ffebee]" },
      { label: "Michael", slug: "founders/michael", color: "bg-[#f1f5f3]" },
    ],
  },
  {
    id: "operations",
    title: "Operations",
    items: [
      {
        label: "Agent Onboarding",
        slug: "operations/onboarding",
        color: "bg-[#fff3e0]",
      },
      {
        label: "Licensing Requirements",
        slug: "operations/licensing",
        color: "bg-[#f3e5f5]",
      },
      { label: "Renewals", slug: "operations/renewals", color: "bg-[#e8f5e9]" },
    ],
  },
  {
    id: "financial",
    title: "Financial Model",
    items: [
      { label: "Projections", slug: "financial/projections", color: "bg-[#e3f2fd]" },
      {
        label: "Compensation",
        slug: "financial/compensation",
        color: "bg-[#fce4ec]",
      },
      {
        label: "Break-Even Analysis",
        slug: "financial/breakeven",
        color: "bg-[#e0f2f1]",
      },
    ],
  },
  {
    id: "ideas",
    title: "Ideas",
    items: [
      {
        label: "Product Expansion",
        slug: "ideas/expansion",
        color: "bg-[#f1f5f3]",
      },
      {
        label: "Technology Wishlist",
        slug: "ideas/tech",
        color: "bg-[#fff3e0]",
      },
      {
        label: "Market Opportunities",
        slug: "ideas/market",
        color: "bg-[#f3e5f5]",
      },
    ],
  },
];

export default function WikiPage() {
  const [search, setSearch] = useState("");

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
                        <div className="w-2 h-6 rounded-full bg-[#2b8a88]" />
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
