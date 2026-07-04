import type { PixKeyType, UserSocials } from "@/core/models/user";

export interface OnboardingFormData {
  name: string;
  birthDate: string;
  pixKey: string;
  pixKeyType: PixKeyType | "";
  creatorName: string;
  socials: Partial<UserSocials>;
}

export const INITIAL_ONBOARDING_FORM: OnboardingFormData = {
  name: "",
  birthDate: "",
  pixKey: "",
  pixKeyType: "",
  creatorName: "",
  socials: {},
};

export interface OnboardingDraft {
  step: number;
  form: OnboardingFormData;
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
