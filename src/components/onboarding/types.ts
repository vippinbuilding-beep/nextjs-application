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
