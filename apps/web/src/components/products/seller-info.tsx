import { Store } from "lucide-react";

import {
  isSellerProfile,
  SELLER_PROFILE_LABELS,
} from "@vippin/core/domain/seller-profile";

export interface PublicSellerInfo {
  name: string;
  /** Already masked by the database (never the full CPF/CNPJ). */
  maskedDocument: string | null;
  city: string | null;
  state: string | null;
  profile: string | null;
}

const SUPPORT_EMAIL = "suporte@vippin.com.br";

/**
 * "Vendido por": seller identification required for e-commerce (Decreto
 * 7.962/2013) plus the Vippin as intermediary. Never shows the sender address.
 */
export function SellerInfo({
  seller,
  creatorSlug,
}: {
  seller: PublicSellerInfo | null;
  creatorSlug: string;
}) {
  const location = [seller?.city, seller?.state].filter(Boolean).join("/");
  const documentLabel = seller?.maskedDocument
    ? seller.maskedDocument.length > 14
      ? "CNPJ"
      : "CPF"
    : null;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/40 p-3 text-xs">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Store className="size-4" /> Vendido por
      </p>
      {seller ? (
        <div className="flex flex-col gap-0.5">
          <p className="font-semibold">{seller.name}</p>
          {documentLabel && (
            <p className="text-muted-foreground">
              {documentLabel} {seller.maskedDocument}
              {isSellerProfile(seller.profile) ? ` · ${SELLER_PROFILE_LABELS[seller.profile]}` : ""}
            </p>
          )}
          {location && <p className="text-muted-foreground">Envio de {location}</p>}
          <p className="text-muted-foreground">
            Contato: pelo perfil{" "}
            <a href={`/@${creatorSlug}`} className="underline">
              @{creatorSlug}
            </a>{" "}
            ou{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">
              {SUPPORT_EMAIL}
            </a>
          </p>
        </div>
      ) : (
        <p className="text-muted-foreground">@{creatorSlug}</p>
      )}
      <p className="text-muted-foreground border-t border-border/40 pt-2">
        A Vippin intermedeia o pagamento e o envio: o valor fica retido até a entrega e você
        pode desistir da compra em até 7 dias após receber o produto.
      </p>
    </div>
  );
}
