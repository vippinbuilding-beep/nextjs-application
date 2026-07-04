import type { UserSocials } from "@/core/models/user";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { ONBOARDING_LIMITS } from "./validation";

const SOCIAL_FIELDS = [
  { key: "instagram", label: "Instagram", placeholder: "@seuperfil ou link" },
  { key: "tiktok", label: "TikTok", placeholder: "@seuperfil ou link" },
  { key: "youtube", label: "YouTube", placeholder: "@seucanal ou link" },
  { key: "linkedin", label: "LinkedIn", placeholder: "seu-perfil ou link" },
  { key: "x", label: "X (Twitter)", placeholder: "@seuperfil ou link" },
  { key: "twitch", label: "Twitch", placeholder: "seuperfil ou link" },
] as const satisfies ReadonlyArray<{
  key: keyof UserSocials;
  label: string;
  placeholder: string;
}>;

interface SocialsStepFieldsProps {
  socials: Partial<UserSocials>;
  onSocialChange: (key: keyof UserSocials, value: string) => void;
}

export function SocialsStepFields({ socials, onSocialChange }: SocialsStepFieldsProps) {
  return (
    <>
      {SOCIAL_FIELDS.map(({ key, label, placeholder }) => (
        <div key={key} className="flex flex-col gap-2">
          <Label htmlFor={key}>{label}</Label>
          <Input
            id={key}
            type="text"
            placeholder={placeholder}
            value={socials[key] ?? ""}
            onChange={(e) => onSocialChange(key, e.target.value)}
            minLength={ONBOARDING_LIMITS.social.min}
            maxLength={ONBOARDING_LIMITS.social.max}
            autoComplete="off"
          />
        </div>
      ))}
    </>
  );
}
