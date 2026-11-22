import { requireRouteUser } from "@/lib/auth/route-auth";
import { listBuyerOrderViews } from "@/lib/shipping/views";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Buyer's physical orders with status and tracking ("Meus pedidos"). */
export async function GET() {
  const auth = await requireRouteUser();
  if (auth.error) return auth.error;

  const items = await listBuyerOrderViews(auth.user.id);
  return Response.json({ items });
}
