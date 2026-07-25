/**
 * Repositório de leituras agregadas para o painel administrativo.
 *
 * Implementações rodam SOMENTE no servidor com a service role (bypassam RLS),
 * já que agregam dados de todos os usuários. Nunca instanciar no cliente.
 */

export interface DateRange {
  from: Date;
  to: Date;
}

export interface AdminOverviewStats {
  totalUsers: number;
  totalCreators: number;
  totalConsumers: number;
  totalProducts: number;
  /** GMV no período: soma dos pagamentos recebidos (orders + ask_me), em centavos. */
  gmvCents: number;
  /** Receita da plataforma no período (taxas retidas), em centavos. */
  platformRevenueCents: number;
  /** Pedidos criados no período (qualquer status). */
  ordersTotal: number;
  /** Pedidos pagos no período. */
  ordersPaid: number;
  /** Taxa de conversão de checkout no período (ordersPaid / ordersTotal), 0..1. */
  checkoutConversionRate: number;
  askMeAnswered: number;
  askMeAwaitingResponse: number;
}

export interface RevenueByDayPoint {
  /** Dia no formato ISO (YYYY-MM-DD), fuso America/Sao_Paulo. */
  date: string;
  gmvCents: number;
  platformFeeCents: number;
  ordersCount: number;
}

export interface UserGrowthByDayPoint {
  date: string;
  creators: number;
  consumers: number;
}

export interface TopProduct {
  productId: string;
  title: string;
  creatorId: string;
  creatorName: string | null;
  salesCount: number;
  grossCents: number;
}

export interface ProductWithoutSales {
  productId: string;
  title: string;
  creatorId: string;
  creatorName: string | null;
  createdAt: Date;
}

export interface ProductsByTypeCount {
  type: string;
  count: number;
}

export interface VisitsOverview {
  /** Soma de todas as visitas de perfil (contagem exata por navegador). */
  totalProfileVisits: number;
  /** Quantos perfis já receberam ao menos uma visita. */
  visitedProfiles: number;
  /** Soma de todas as visitas de produto. */
  totalProductVisits: number;
  /** Quantos produtos já receberam ao menos uma visita. */
  visitedProducts: number;
}

export interface TopVisitedProduct {
  productId: string;
  title: string;
  creatorId: string;
  creatorName: string | null;
  visitCount: number;
}

export interface TopVisitedCreator {
  creatorId: string;
  creatorName: string | null;
  slug: string | null;
  visitCount: number;
}

export interface OrdersByStatusCount {
  status: string;
  count: number;
  amountCents: number;
}

export interface AskMeOverview {
  total: number;
  answered: number;
  declined: number;
  expired: number;
  awaitingResponse: number;
  pendingPayment: number;
  /** Tempo médio de resposta (paid_at → answered_at), em segundos; null se não há respostas. */
  avgResponseSeconds: number | null;
}

export interface AdminAnalyticsRepository {
  getOverviewStats(range: DateRange): Promise<AdminOverviewStats>;
  getRevenueByDay(range: DateRange): Promise<RevenueByDayPoint[]>;
  getUserGrowthByDay(range: DateRange): Promise<UserGrowthByDayPoint[]>;
  getTopProducts(limit: number): Promise<TopProduct[]>;
  getProductsWithoutSales(limit: number): Promise<ProductWithoutSales[]>;
  getProductsByType(): Promise<ProductsByTypeCount[]>;
  getOrdersByStatus(): Promise<OrdersByStatusCount[]>;
  getAskMeOverview(): Promise<AskMeOverview>;
  getVisitsOverview(): Promise<VisitsOverview>;
  getTopVisitedProducts(limit: number): Promise<TopVisitedProduct[]>;
  getTopVisitedCreators(limit: number): Promise<TopVisitedCreator[]>;
}
