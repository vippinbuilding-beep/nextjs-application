import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";

import { formatBRL } from "@/lib/money";
import type { ProductType } from "@/core/models/product";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const alt = "Produto no Vippin";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface ProductOpenGraphImageProps {
  params: Promise<{ creator: string; product: string }>;
}

export default async function ProductOpenGraphImage({
  params,
}: ProductOpenGraphImageProps) {
  const { creator, product } = await params;
  const creatorSlug = decodeURIComponent(creator).replace(/^@/, "");
  const productSlug = decodeURIComponent(product);

  const supabase = await createSupabaseServerClient();

  const { data: profile } = await supabase
    .from("public_profiles")
    .select("id, creator_name, slug")
    .eq("slug", creatorSlug)
    .maybeSingle();

  if (!profile) notFound();

  const { data: row } = await supabase
    .from("products")
    .select("title, price_cents, type")
    .eq("creator_id", profile.id)
    .eq("slug", productSlug)
    .maybeSingle();

  if (!row) notFound();

  const handle = profile.creator_name ?? profile.slug;
  const type = row.type as ProductType;
  const typeLabel = type === "single_lesson" ? "Aula" : "Material";
  const priceLabel =
    row.price_cents === 0 ? "Grátis" : formatBRL(row.price_cents ?? 0);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#fafffa",
          border: "8px solid #000000",
          padding: 64,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 28,
            fontWeight: 700,
            color: "#000000",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "#ffe502",
              border: "4px solid #000000",
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            V
          </div>
          Vippin
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: "#000000",
              lineHeight: 1.1,
              maxWidth: 980,
            }}
          >
            {row.title}
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 600,
              color: "#4b4b4b",
            }}
          >
            {typeLabel} · {priceLabel} · @{handle}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
