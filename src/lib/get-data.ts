/**
 * Unified data-fetching module
 * Checks if GITHUB_TOKEN is available and fetches from GitHub,
 * otherwise falls back to hardcoded data from data.ts
 * This module runs server-side only.
 */

import {
  radarItems as fallbackRadarItems,
  groupTableItems as fallbackGroupTableItems,
  laneItems as fallbackLaneItems,
  taskItems as fallbackTaskItems,
  toolItems as fallbackToolItems,
  businessStateSentence as fallbackBusinessState,
} from "./data";
import {
  getRadarItems,
  getGroupTableItems,
  getLaneItems,
  getTaskItems,
  getBusinessStateSentence,
} from "./github-data";
import type {
  RadarItem,
  GroupTableItem,
  LaneItem,
  TaskItem,
  ToolItem,
} from "./data";

export interface HomePageData {
  radarItems: RadarItem[];
  groupTableItems: GroupTableItem[];
  laneItems: Record<string, LaneItem[]>;
  taskItems: TaskItem[];
  toolItems: ToolItem[];
  businessStateSentence: string;
}

/**
 * Fetches all data for the home page
 * If GITHUB_TOKEN is configured, fetches from GitHub
 * Otherwise falls back to hardcoded data
 */
export async function getData(): Promise<HomePageData> {
  const hasGitHubToken = !!process.env.GITHUB_TOKEN;

  if (hasGitHubToken) {
    try {
      // Attempt to fetch from GitHub
      const [radarItems, groupTableItems, laneItems, taskItems, businessState] =
        await Promise.all([
          getRadarItems(),
          getGroupTableItems(),
          getLaneItems(),
          getTaskItems(),
          getBusinessStateSentence(),
        ]);

      return {
        radarItems: radarItems.length > 0 ? radarItems : fallbackRadarItems,
        groupTableItems:
          groupTableItems.length > 0 ? groupTableItems : fallbackGroupTableItems,
        laneItems:
          Object.keys(laneItems).length > 0 ? laneItems : fallbackLaneItems,
        taskItems: taskItems.length > 0 ? taskItems : fallbackTaskItems,
        toolItems: fallbackToolItems,
        businessStateSentence:
          businessState.length > 0
            ? businessState
            : fallbackBusinessState,
      };
    } catch (error) {
      // Log the error but fall back to hardcoded data
      console.error("Error fetching from GitHub, falling back to hardcoded data:", error);
    }
  }

  // Fallback to hardcoded data
  return {
    radarItems: fallbackRadarItems,
    groupTableItems: fallbackGroupTableItems,
    laneItems: fallbackLaneItems,
    taskItems: fallbackTaskItems,
    toolItems: fallbackToolItems,
    businessStateSentence: fallbackBusinessState,
  };
}
