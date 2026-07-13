import type { PixKeyType, UserSocials } from "@vippin/core/models/user";

export interface CreatorOnboardingFormData {
  name: string;
  birthDate: string;
  pixKey: string;
  pixKeyType: PixKeyType | "";
  creatorName: string;
  bio: string;
  socials: Partial<UserSocials>;
}

/** @deprecated Use CreatorOnboardingFormData */
export type OnboardingFormData = CreatorOnboardingFormData;

export const INITIAL_ONBOARDING_FORM: CreatorOnboardingFormData = {
  name: "",
  birthDate: "",
  pixKey: "",
  pixKeyType: "",
  creatorName: "",
  bio: "",
  socials: {},
};

export interface OnboardingDraft {
  step: number;
  form: CreatorOnboardingFormData;
  slug: string;
}

const DRAFT_KEY_PREFIX = "vippin:onboarding-draft:";

export function onboardingDraftKey(userId: string): string {
  return `${DRAFT_KEY_PREFIX}${userId}`;
}

export function readOnboardingDraft(userId: string): OnboardingDraft | null {
  try {
    const raw = sessionStorage.getItem(onboardingDraftKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as OnboardingDraft;
  } catch {
    return null;
  }
}

export function writeOnboardingDraft(userId: string, draft: OnboardingDraft): void {
  sessionStorage.setItem(onboardingDraftKey(userId), JSON.stringify(draft));
}

export function clearOnboardingDraft(userId: string): void {
  sessionStorage.removeItem(onboardingDraftKey(userId));
}
