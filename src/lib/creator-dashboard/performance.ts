import "server-only";

import { addDays, format, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

import { getAskMeStatusLabel } from "@/lib/ask-me";
import type { CreatorPerformancePeriod } from "@/lib/creator-dashboard/performance-period";
import { getPerformancePeriodBounds } from "@/lib/creator-dashboard/performance-period";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export interface CreatorPerformanceDayPoint {
  date: string;
  label: string;
  productCents: number;
  askMeCents: number;
  totalCents: number;
}

export interface CreatorPerformanceTopProduct {
  productId: string;
  title: string;
  salesCount: number;
  earningsCents: number;
}

export interface CreatorPerformanceAskMeStatus {
  status: string;
  label: string;
  count: number;
}

export interface CreatorPerformanceSnapshot {
  periodDays: number;
  periodKind: CreatorPerformancePeriod["kind"];
  periodLabel: string;
  fromDate: string;
  toDate: string;
  summary: {
    creatorEarningsCents: number;
    productSalesCount: number;
    askMePaidCount: number;
    freeClaimsCount: number;
    askMeAnsweredCount: number;
    askMeResponseRatePercent: number | null;
  };
  earningsByDay: CreatorPerformanceDayPoint[];
  topProducts: CreatorPerformanceTopProduct[];
  askMeByStatus: CreatorPerformanceAskMeStatus[];
}

type PaidOrderRow = {
  product_id: string;
  creator_amount_cents: number;
  paid_at: string | null;
};

type AskMeRow = {
  status: string;
  creator_amount_cents: number;
  paid_at: string | null;
  answered_at: string | null;
};

type ProductRow = {
  id: string;
  title: string;
};

type FreeAccessRow = {
  product_id: string;
  granted_at: string | null;
};

function buildDayBuckets(
  fromDate: Date,
  toDate: Date
): CreatorPerformanceDayPoint[] {
  const buckets: CreatorPerformanceDayPoint[] = [];
  let current = startOfDay(fromDate);
  const end = startOfDay(toDate);

  while (current <= end) {
    buckets.push({
      date: format(current, "yyyy-MM-dd"),
      label: format(current, "dd/MM", { locale: ptBR }),
      productCents: 0,
      askMeCents: 0,
      totalCents: 0,
    });
    current = addDays(current, 1);
  }

  return buckets;
}

function bucketIndexForDate(
  buckets: CreatorPerformanceDayPoint[],
  isoDate: string | null | undefined
): number | null {
  if (!isoDate) return null;
  const key = format(startOfDay(new Date(isoDate)), "yyyy-MM-dd");
  const index = buckets.findIndex((bucket) => bucket.date === key);
  return index >= 0 ? index : null;
}

function addToBucket(
  buckets: CreatorPerformanceDayPoint[],
  index: number,
  field: "productCents" | "askMeCents",
  cents: number
) {
  buckets[index][field] += cents;
  buckets[index].totalCents += cents;
}

export async function getCreatorPerformance(
  creatorId: string,
  period: CreatorPerformancePeriod
): Promise<CreatorPerformanceSnapshot> {
  const admin = createSupabaseAdminClient();
  const { since, until } = getPerformancePeriodBounds(period);

  const [ordersResult, askMeResult, productsResult] = await Promise.all([
    admin
      .from("orders")
      .select("product_id, creator_amount_cents, paid_at")
      .eq("creator_id", creatorId)
      .eq("status", "paid")
      .gte("paid_at", since)
      .lte("paid_at", until),
    admin
      .from("ask_me_questions")
      .select("status, creator_amount_cents, paid_at, answered_at")
      .eq("creator_id", creatorId)
      .not("paid_at", "is", null)
      .gte("paid_at", since)
      .lte("paid_at", until),
    admin.from("products").select("id, title").eq("creator_id", creatorId),
  ]);

  if (ordersResult.error) {
    throw new Error(ordersResult.error.message);
  }
  if (askMeResult.error) {
    throw new Error(askMeResult.error.message);
  }
  if (productsResult.error) {
    throw new Error(productsResult.error.message);
  }

  const orders = (ordersResult.data ?? []) as PaidOrderRow[];
  const askMe = (askMeResult.data ?? []) as AskMeRow[];
  const products = (productsResult.data ?? []) as ProductRow[];
  const productTitleById = new Map(products.map((row) => [row.id, row.title]));

  const productIds = products.map((row) => row.id);
  let freeClaims: FreeAccessRow[] = [];

  if (productIds.length > 0) {
    const { data, error } = await admin
      .from("product_accesses")
      .select("product_id, granted_at")
      .in("product_id", productIds)
      .eq("source", "free")
      .gte("granted_at", since)
      .lte("granted_at", until);

    if (error) throw new Error(error.message);
    freeClaims = (data ?? []) as FreeAccessRow[];
  }

  const earningsByDay = buildDayBuckets(period.fromDate, period.toDate);
  const topProductMap = new Map<
    string,
    { salesCount: number; earningsCents: number }
  >();
  const askMeStatusMap = new Map<string, number>();

  let productSalesCount = 0;
  let productEarningsCents = 0;

  for (const order of orders) {
    productSalesCount += 1;
    productEarningsCents += order.creator_amount_cents ?? 0;

    const bucketIndex = bucketIndexForDate(earningsByDay, order.paid_at);
    if (bucketIndex != null) {
      addToBucket(
        earningsByDay,
        bucketIndex,
        "productCents",
        order.creator_amount_cents ?? 0
      );
    }

    const current = topProductMap.get(order.product_id) ?? {
      salesCount: 0,
      earningsCents: 0,
    };
    current.salesCount += 1;
    current.earningsCents += order.creator_amount_cents ?? 0;
    topProductMap.set(order.product_id, current);
  }

  let askMePaidCount = 0;
  let askMeEarningsCents = 0;
  let askMeAnsweredCount = 0;
  let askMeResolvedCount = 0;
  let askMeAnsweredResolvedCount = 0;

  for (const question of askMe) {
    askMePaidCount += 1;
    askMeStatusMap.set(question.status, (askMeStatusMap.get(question.status) ?? 0) + 1);

    if (question.status === "answered") {
      askMeAnsweredCount += 1;
      askMeEarningsCents += question.creator_amount_cents ?? 0;

      const bucketIndex = bucketIndexForDate(earningsByDay, question.answered_at);
      if (bucketIndex != null) {
        addToBucket(
          earningsByDay,
          bucketIndex,
          "askMeCents",
          question.creator_amount_cents ?? 0
        );
      }
    }

    if (["answered", "declined", "expired"].includes(question.status)) {
      askMeResolvedCount += 1;
      if (question.status === "answered") {
        askMeAnsweredResolvedCount += 1;
      }
    }
  }

  const topProducts = [...topProductMap.entries()]
    .map(([productId, stats]) => ({
      productId,
      title: productTitleById.get(productId) ?? "Produto",
      salesCount: stats.salesCount,
      earningsCents: stats.earningsCents,
    }))
    .sort((a, b) => b.earningsCents - a.earningsCents || b.salesCount - a.salesCount)
    .slice(0, 5);

  const askMeByStatus = [...askMeStatusMap.entries()]
    .map(([status, count]) => ({
      status,
      label: getAskMeStatusLabel(status),
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const askMeResponseRatePercent =
    askMeResolvedCount > 0
      ? Math.round((askMeAnsweredResolvedCount / askMeResolvedCount) * 100)
      : null;

  return {
    periodDays: period.days,
    periodKind: period.kind,
    periodLabel: period.label,
    fromDate: period.from,
    toDate: period.to,
    summary: {
      creatorEarningsCents: productEarningsCents + askMeEarningsCents,
      productSalesCount,
      askMePaidCount,
      freeClaimsCount: freeClaims.length,
      askMeAnsweredCount,
      askMeResponseRatePercent,
    },
    earningsByDay,
    topProducts,
    askMeByStatus,
  };
}
