import { requireRouteCreator } from "@/lib/auth/route-auth";
import { listCreatorShipmentViews } from "@/lib/shipping/views";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Creator's physical sales with shipment state (painel "Envios"). */
export async function GET() {
  const auth = await requireRouteCreator();
  if (auth.error) return auth.error;

  const items = await listCreatorShipmentViews(auth.user.id);
  return Response.json({ items });
}
