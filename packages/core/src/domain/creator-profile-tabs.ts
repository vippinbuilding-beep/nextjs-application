import type { CreatorProfileTab } from "../models/user";

export function isCreatorProfileTab(value: string): value is CreatorProfileTab {
  return value === "links" || value === "lessons" || value === "documents";
}
