import type { CreatorProfileTab } from "@vippin/core/models/user";
import { isCreatorProfileTab } from "@vippin/core/domain/creator-profile-tabs";

export type { CreatorProfileTab };
export { isCreatorProfileTab };

export const CREATOR_PROFILE_TAB_OPTIONS: {
  value: CreatorProfileTab;
  label: string;
}[] = [
  { value: "lessons", label: "Aulas" },
  { value: "documents", label: "Vips" },
  { value: "links", label: "Links" },
];

/** Picks the initial tab, honoring the creator preference when that tab has content. */
export function resolveCreatorDefaultTab(
  preferred: CreatorProfileTab | null | undefined,
  available: CreatorProfileTab[]
): CreatorProfileTab | undefined {
  if (available.length === 0) return undefined;
  if (preferred && available.includes(preferred)) return preferred;
  return available[0];
}

export function getAvailableCreatorTabs(input: {
  hasLinks: boolean;
  hasLessons: boolean;
  hasDocuments: boolean;
}): CreatorProfileTab[] {
  const tabs: CreatorProfileTab[] = [];
  if (input.hasLessons) tabs.push("lessons");
  if (input.hasDocuments) tabs.push("documents");
  if (input.hasLinks) tabs.push("links");
  return tabs;
}
