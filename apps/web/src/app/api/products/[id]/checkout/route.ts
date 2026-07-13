import type { NextRequest } from "next/server";

import { createSupabaseAdminClient } from "@vippin/supabase/client/admin";
import { createSupabaseServerClient } from "@vippin/supabase/client/server";
import { splitAmount, validateGrossCoversSaleFees } from "@/lib/payments/split";
import { PRODUCT_LIMITS } from "@/lib/products";
import { getOrderRepository, getPaymentGateway } from "@vippin/supabase/factories/payment-factory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// How long the buyer has to pay the PIX before it expires.
const CHARGE_TTL_SECONDS = 60 * 60;

/**
 * Opens a PIX checkout for a product.
 *
 * The buyer must be authenticated (access is tied to their user id). The amount
 * and the platform/creator split are computed server-side from the product row —
 * never trusted from the client. Returns the QR code artifacts for the browser
 * to render; the payment is confirmed later via webhook/status poll.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const server = await createSupabaseServerClient();
  const {
    data: { user },
  } = await server.auth.getUser();
  if (!user) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const { data: product } = await admin
    .from("products")
    .select("id, creator_id, title, price_cents")
    .eq("id", id)
    .maybeSingle();

  if (!product) {
    return Response.json({ error: "Produto não encontrado." }, { status: 404 });
  }

  const priceCents = product.price_cents ?? 0;
  if (priceCents <= 0) {
    return Response.json(
      { error: "Este produto é gratuito." },
      { status: 400 }
    );
  }
  if (priceCents < PRODUCT_LIMITS.priceMinCents) {
    return Response.json(
      { error: "O preço deste produto está abaixo do mínimo permitido." },
      { status: 400 }
    );
  }
  const splitError = validateGrossCoversSaleFees(priceCents);
  if (splitError) {
    return Response.json({ error: splitError }, { status: 400 });
  }
  if (product.creator_id === user.id) {
    return Response.json(
      { error: "Você não pode comprar o seu próprio produto." },
      { status: 400 }
    );
  }

  // Already owns it?
  const { count: accessCount } = await admin
    .from("product_accesses")
    .select("product_id", { count: "exact", head: true })
    .eq("product_id", id)
    .eq("user_id", user.id);
  if ((accessCount ?? 0) > 0) {
    return Response.json(
      { error: "Você já tem acesso a este produto." },
      { status: 400 }
    );
  }

  // The creator must have a PIX key so we can repass their share.
  const { data: creator } = await admin
    .from("profiles")
    .select("pix_key")
    .eq("id", product.creator_id)
    .maybeSingle();
  if (!creator?.pix_key) {
    return Response.json(
      { error: "O criador ainda não pode receber pagamentos." },
      { status: 400 }
    );
  }

  // Reuse an existing unpaid, unexpired charge instead of opening a new one.
  const { data: existing } = await admin
    .from("orders")
    .select("id, br_code, br_code_base64, expires_at, amount_cents")
    .eq("buyer_id", user.id)
    .eq("product_id", id)
    .eq("status", "pending")
    .not("abacate_charge_id", "is", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.br_code && existing.br_code_base64) {
    return Response.json({
      orderId: existing.id,
      amountCents: existing.amount_cents,
      brCode: existing.br_code,
      brCodeBase64: existing.br_code_base64,
      expiresAt: existing.expires_at,
    });
  }

  const split = splitAmount(priceCents);
  const orders = getOrderRepository();
  const gateway = getPaymentGateway();

  const order = await orders.create({
    productId: id,
    buyerId: user.id,
    creatorId: product.creator_id,
    amountCents: split.amountCents,
    platformFeeCents: split.platformFeeCents,
    creatorAmountCents: split.creatorAmountCents,
  });

  try {
    const charge = await gateway.createPixCharge({
      amountCents: split.amountCents,
      description: product.title,
      expiresInSeconds: CHARGE_TTL_SECONDS,
    });

    const updated = await orders.update(order.id, {
      abacateChargeId: charge.id,
      brCode: charge.brCode,
      brCodeBase64: charge.brCodeBase64,
      expiresAt: charge.expiresAt ?? null,
    });

    return Response.json({
      orderId: order.id,
      amountCents: split.amountCents,
      brCode: charge.brCode,
      brCodeBase64: charge.brCodeBase64,
      expiresAt: (updated?.expiresAt ?? charge.expiresAt)?.toISOString() ?? null,
    });
  } catch (err) {
    await orders.update(order.id, { status: "failed" });
    const message =
      err instanceof Error ? err.message : "Falha ao gerar a cobrança PIX.";
    return Response.json({ error: message }, { status: 502 });
  }
}
