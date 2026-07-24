import { MessageSquare } from "lucide-react";



import { ProductCommentsPanel } from "@/components/products/product-comments-panel";

import {

  Card,

  CardContent,

  CardHeader,

  CardTitle,

} from "@vippin/ui/card";

import { cn } from "@vippin/ui/lib/utils";



interface ProductCommentsCardProps {
  productId: string;
  isOwner: boolean;
  viewerUserId?: string;
  className?: string;
  formId?: string;
  /** `sidebar` = docked chat column (Twitch-style). */
  variant?: "card" | "sidebar";
}

export function ProductCommentsCard({
  productId,
  isOwner,
  viewerUserId,
  className,
  formId = "comment-body",
  variant = "card",
}: ProductCommentsCardProps) {

  if (variant === "sidebar") {

    return (

      <div className={cn("flex min-h-0 flex-col", className)}>

        <div className="flex shrink-0 items-center gap-2 border-b-2 border-border px-3 py-2.5">

          <MessageSquare className="size-4 shrink-0" />

          <span className="text-sm font-bold">Comentários</span>

        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">

          <ProductCommentsPanel
            productId={productId}
            isOwner={isOwner}
            viewerUserId={viewerUserId}
            formId={formId}
          />

        </div>

      </div>

    );

  }



  return (

    <Card className={cn("min-w-0 h-full", className)}>

      <CardHeader className="pb-0">

        <CardTitle className="flex items-center gap-2 text-lg">

          <MessageSquare className="size-5" />

          Comentários

        </CardTitle>

      </CardHeader>

      <CardContent className="h-full overflow-y-auto px-3 py-3">

        <ProductCommentsPanel
          productId={productId}
          isOwner={isOwner}
          viewerUserId={viewerUserId}
          formId={formId}
        />

      </CardContent>

    </Card>

  );

}


