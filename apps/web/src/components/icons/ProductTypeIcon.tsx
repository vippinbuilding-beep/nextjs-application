import { ProductType } from "@vippin/core/models/product";
import { FileText, Package, PlayCircle } from "lucide-react";

interface ProductTypeIconProps {
    type: ProductType;
}

export default function ProductTypeIcon(
    { type }: ProductTypeIconProps
) {
    const Icon =
        type === "single_lesson" ? PlayCircle : type === "physical" ? Package : FileText;

    return (
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary text-secondary-foreground">
            <Icon className="size-6" />
        </span>

    )

}