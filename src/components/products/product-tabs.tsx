import { FileText, PlayCircle } from "lucide-react";

import { AnimatedHeight } from "@/components/ui/animated-height";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ProductType } from "@/core/models/product";
import ProductCard from "./product-card";

interface ProductListItem {
    id: string;
    title: string;
    description?: string;
    thumbnailPath?: string;
    thumbnailWidth?: number | null;
    thumbnailHeight?: number | null;
    mediaWidth?: number | null;
    mediaHeight?: number | null;
    slug: string;
    type: ProductType;
}

interface ProductTabsProps {
    products: ProductListItem[];
    profile: {
        slug: string;
        id: string;
    };
    /**
     * `public` links each card to its public sales page. `manage` links to
     * the creator's edit page instead, for use in the creator's own
     * dashboard.
     */
    mode?: "public" | "manage";
    emptyLessonsLabel?: string;
    emptyDocumentsLabel?: string;
    emptyAllLabel?: string;
}

/**
 * Splits a creator's products into "aulas" (single lessons) and
 * "documentos" tabs. Lessons render as a grid of banner cards, documents
 * render as a compact list.
 */
export function ProductTabs({
    products,
    profile,
    mode = "public",
    emptyLessonsLabel = "Nenhuma aula publicada ainda.",
    emptyDocumentsLabel = "Nenhum documento publicado ainda.",
    emptyAllLabel = "Nenhum aula ou documento publicado ainda.",
}: ProductTabsProps) {
    const lessons = products.filter((product) => product.type === "single_lesson");
    const documents = products.filter((product) => product.type === "document");

    const defaultTab = lessons.length > 0 ? "lessons" : "documents";

    if (!lessons.length && !documents.length) {
        return <EmptyTabState label={emptyAllLabel} />;
    }

    return (
        <Tabs defaultValue={defaultTab}>
            {lessons.length && documents.length ? (
                <TabsList className="sm:max-w-80 max-w-none">
                    <TabsTrigger value="lessons">
                        <PlayCircle className="size-4" />
                        Aulas
                    </TabsTrigger>
                    <TabsTrigger value="documents">
                        <FileText className="size-4" />
                        Vips
                    </TabsTrigger>
                </TabsList>
            ) : (
                <></>
            )}

            <AnimatedHeight>

                <TabsContent value="lessons">
                    {lessons.length === 0 ? (
                        <EmptyTabState label={emptyLessonsLabel} />
                    ) : (
                        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {lessons.map((product) => (
                                <li key={product.id}>
                                    <ProductCard
                                        product={product}
                                        profile={profile}
                                        type={product.type}
                                        mode={mode}
                                    />
                                </li>
                            ))}
                        </ul>
                    )}
                </TabsContent>

                <TabsContent value="documents">
                    {documents.length === 0 ? (
                        <EmptyTabState label={emptyDocumentsLabel} />
                    ) : (
                        <ul className="flex flex-col gap-3">
                            {documents.map((product) => (
                                <li key={product.id}>
                                    <ProductCard
                                        product={product}
                                        profile={profile}
                                        type={product.type}
                                        mode={mode}
                                    />
                                </li>
                            ))}
                        </ul>
                    )}
                </TabsContent>
            </AnimatedHeight>
        </Tabs>
    );
}

function EmptyTabState({ label }: { label: string }) {
    return (
        <div className="flex flex-col items-center gap-2 py-6 text-center justify-center h-full">
            <span className="flex size-12 items-center justify-center rounded-xl border-2 border-border bg-muted">
                <FileText className="size-6" />
            </span>
            <p className="text-muted-foreground text-sm">{label}</p>
        </div>
    );
}
