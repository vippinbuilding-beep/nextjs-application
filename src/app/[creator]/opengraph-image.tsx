import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const alt = "Perfil do criador no Vippin";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface CreatorOpenGraphImageProps {
  params: Promise<{ creator: string }>;
}

export default async function CreatorOpenGraphImage({
  params,
}: CreatorOpenGraphImageProps) {
  const { creator } = await params;
  const creatorSlug = decodeURIComponent(creator).replace(/^@/, "");

  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("public_profiles")
    .select("creator_name, slug")
    .eq("slug", creatorSlug)
    .maybeSingle();

  if (!profile) notFound();

  const handle = profile.creator_name ?? profile.slug;
  const initial = handle.charAt(0).toUpperCase();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 40,
          background: "#fafffa",
          backgroundImage:
            "radial-gradient(circle at 1px 1px, #00000014 1px, transparent 0)",
          backgroundSize: "24px 24px",
          padding: 80,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 180,
            height: 180,
            borderRadius: 48,
            background: "#ffe502",
            border: "8px solid #000000",
            fontSize: 96,
            fontWeight: 700,
            color: "#000000",
          }}
        >
          {initial}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: "#000000",
            }}
          >
            @{handle}
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 500,
              color: "#4b4b4b",
            }}
          >
            Vitrine no Vippin
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
