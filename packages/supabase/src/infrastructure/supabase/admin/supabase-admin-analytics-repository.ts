import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AdminAnalyticsRepository,
  AdminOverviewStats,
  AskMeOverview,
  DateRange,
  OrdersByStatusCount,
  ProductsByTypeCount,
  ProductWithoutSales,
  RevenueByDayPoint,
  TopProduct,
  UserGrowthByDayPoint,
} from "@vippin/core/repositories/admin-analytics-repository";

/**
 * Implementação de {@link AdminAnalyticsRepository} sobre as RPCs
 * `admin_*` (ver migration 20260814). Construída com um client service role,
 * que bypassa RLS e tem execute nas funções.
 */
export class SupabaseAdminAnalyticsRepository implements AdminAnalyticsRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getOverviewStats(range: DateRange): Promise<AdminOverviewStats> {
    const { data, error } = await this.client
      .rpc("admin_overview_stats", {
        from_ts: range.from.toISOString(),
        to_ts: range.to.toISOString(),
      })
      .single();

    if (error) throw new Error(error.message);

    const row = data as {
      total_users: number;
      total_creators: number;
      total_consumers: number;
      total_products: number;
      gmv_cents: number;
      platform_revenue_cents: number;
      orders_total: number;
      orders_paid: number;
      ask_me_answered: number;
      ask_me_awaiting_response: number;
    };

    const ordersTotal = Number(row.orders_total);
    const ordersPaid = Number(row.orders_paid);

    return {
      totalUsers: Number(row.total_users),
      totalCreators: Number(row.total_creators),
      totalConsumers: Number(row.total_consumers),
      totalProducts: Number(row.total_products),
      gmvCents: Number(row.gmv_cents),
      platformRevenueCents: Number(row.platform_revenue_cents),
      ordersTotal,
      ordersPaid,
      checkoutConversionRate: ordersTotal > 0 ? ordersPaid / ordersTotal : 0,
      askMeAnswered: Number(row.ask_me_answered),
      askMeAwaitingResponse: Number(row.ask_me_awaiting_response),
    };
  }

  async getRevenueByDay(range: DateRange): Promise<RevenueByDayPoint[]> {
    const { data, error } = await this.client.rpc("admin_revenue_by_day", {
      from_ts: range.from.toISOString(),
      to_ts: range.to.toISOString(),
    });

    if (error) throw new Error(error.message);

    return (data ?? []).map((row: {
      day: string;
      gmv_cents: number;
      platform_fee_cents: number;
      orders_count: number;
    }) => ({
      date: row.day,
      gmvCents: Number(row.gmv_cents),
      platformFeeCents: Number(row.platform_fee_cents),
      ordersCount: Number(row.orders_count),
    }));
  }

  async getUserGrowthByDay(range: DateRange): Promise<UserGrowthByDayPoint[]> {
    const { data, error } = await this.client.rpc("admin_user_growth_by_day", {
      from_ts: range.from.toISOString(),
      to_ts: range.to.toISOString(),
    });

    if (error) throw new Error(error.message);

    return (data ?? []).map((row: {
      day: string;
      creators: number;
      consumers: number;
    }) => ({
      date: row.day,
      creators: Number(row.creators),
      consumers: Number(row.consumers),
    }));
  }

  async getTopProducts(limit: number): Promise<TopProduct[]> {
    const { data, error } = await this.client.rpc("admin_top_products", {
      lim: limit,
    });

    if (error) throw new Error(error.message);

    return (data ?? []).map((row: {
      product_id: string;
      title: string;
      creator_id: string;
      creator_name: string | null;
      sales_count: number;
      gross_cents: number;
    }) => ({
      productId: row.product_id,
      title: row.title,
      creatorId: row.creator_id,
      creatorName: row.creator_name,
      salesCount: Number(row.sales_count),
      grossCents: Number(row.gross_cents),
    }));
  }

  async getProductsWithoutSales(limit: number): Promise<ProductWithoutSales[]> {
    const { data, error } = await this.client.rpc("admin_products_without_sales", {
      lim: limit,
    });

    if (error) throw new Error(error.message);

    return (data ?? []).map((row: {
      product_id: string;
      title: string;
      creator_id: string;
      creator_name: string | null;
      created_at: string;
    }) => ({
      productId: row.product_id,
      title: row.title,
      creatorId: row.creator_id,
      creatorName: row.creator_name,
      createdAt: new Date(row.created_at),
    }));
  }

  async getProductsByType(): Promise<ProductsByTypeCount[]> {
    const { data, error } = await this.client.rpc("admin_products_by_type");
    if (error) throw new Error(error.message);

    return (data ?? []).map((row: { type: string; count: number }) => ({
      type: row.type,
      count: Number(row.count),
    }));
  }

  async getOrdersByStatus(): Promise<OrdersByStatusCount[]> {
    const { data, error } = await this.client.rpc("admin_orders_by_status");
    if (error) throw new Error(error.message);

    return (data ?? []).map((row: {
      status: string;
      count: number;
      amount_cents: number;
    }) => ({
      status: row.status,
      count: Number(row.count),
      amountCents: Number(row.amount_cents),
    }));
  }

  async getAskMeOverview(): Promise<AskMeOverview> {
    const { data, error } = await this.client
      .rpc("admin_ask_me_overview")
      .single();

    if (error) throw new Error(error.message);

    const row = data as {
      total: number;
      answered: number;
      declined: number;
      expired: number;
      awaiting_response: number;
      pending_payment: number;
      avg_response_seconds: number | null;
    };

    return {
      total: Number(row.total),
      answered: Number(row.answered),
      declined: Number(row.declined),
      expired: Number(row.expired),
      awaitingResponse: Number(row.awaiting_response),
      pendingPayment: Number(row.pending_payment),
      avgResponseSeconds:
        row.avg_response_seconds === null ? null : Number(row.avg_response_seconds),
    };
  }
}
