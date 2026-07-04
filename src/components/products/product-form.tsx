"use client";

import { ExternalLink, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ProductThumbnail } from "@/components/products/product-thumbnail";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PriceInput } from "@/components/ui/price-input";
import { Textarea } from "@/components/ui/textarea";
import type { Product, ProductType } from "@/core/models/product";
import { formatBRL } from "@/lib/money";
import {
  formatFileSize,
  getProductTypeConfig,
  PRODUCT_LIMITS,
  THUMBNAIL_ACCEPT,
  THUMBNAIL_MAX_SIZE,
  validateProductFile,
  validateThumbnailFile,
} from "@/lib/products";
import { getProductThumbnailUrl } from "@/lib/supabase/storage";
import { productRepository } from "@/services/repository-factory";

interface ProductFormProps {
  type: ProductType;
  /** Present when editing an existing product. */
  product?: Product;
}

const {
  titleMin: TITLE_MIN,
  titleMax: TITLE_MAX,
  descriptionMax: DESCRIPTION_MAX,
  priceMinCents: PRICE_MIN_CENTS,
  priceMaxCents: PRICE_MAX_CENTS,
} = PRODUCT_LIMITS;

export function ProductForm({ type, product }: ProductFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const config = getProductTypeConfig(type);
  const isEdit = Boolean(product);

  const [title, setTitle] = useState(product?.title ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [priceCents, setPriceCents] = useState(product?.priceCents ?? 0);
  const [file, setFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(
    product?.thumbnailPath && product?.id
      ? getProductThumbnailUrl(product.id)
      : null
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showFreeConfirm, setShowFreeConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!thumbnailFile) return;
    const url = URL.createObjectURL(thumbnailFile);
    setThumbnailPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [thumbnailFile]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    if (!selected) {
      setFile(null);
      return;
    }
    const fileError = validateProductFile(type, selected);
    if (fileError) {
      setError(fileError);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setError(null);
    setFile(selected);
  }

  function handleThumbnailChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    if (!selected) {
      setThumbnailFile(null);
      return;
    }
    const thumbnailError = validateThumbnailFile(selected);
    if (thumbnailError) {
      setError(thumbnailError);
      setThumbnailFile(null);
      if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
      return;
    }
    setError(null);
    setThumbnailFile(selected);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void submitProduct();
  }

  async function submitProduct(options?: { confirmedFree?: boolean }) {
    if (!user) return;

    const trimmedTitle = title.trim();
    if (trimmedTitle.length < TITLE_MIN || trimmedTitle.length > TITLE_MAX) {
      setError(
        `O nome precisa ter entre ${TITLE_MIN} e ${TITLE_MAX} caracteres.`
      );
      return;
    }

    const trimmedDescription = description.trim();
    if (trimmedDescription.length > DESCRIPTION_MAX) {
      setError(
        `A descrição pode ter no máximo ${DESCRIPTION_MAX} caracteres.`
      );
      return;
    }

    if (priceCents > PRICE_MAX_CENTS) {
      setError(`O preço máximo é ${formatBRL(PRICE_MAX_CENTS)}.`);
      return;
    }

    if (priceCents > 0 && priceCents < PRICE_MIN_CENTS) {
      setError(`O preço mínimo para produtos pagos é ${formatBRL(PRICE_MIN_CENTS)}.`);
      return;
    }

    if (!isEdit && !file) {
      setError("Envie um arquivo para o seu produto.");
      return;
    }
    if (!user.slug) {
      setError("Seu perfil ainda não tem um link. Conclua o onboarding.");
      return;
    }

    // Ao criar ou ao mudar o preço para grátis na edição, confirmamos antes de
    // salvar. Se o produto já era gratuito, não interrompe de novo.
    const wasAlreadyFree = isEdit && (product?.priceCents ?? 0) <= 0;
    if (priceCents === 0 && !options?.confirmedFree && !wasAlreadyFree) {
      setError(null);
      setShowFreeConfirm(true);
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const description_ = trimmedDescription || undefined;

      if (isEdit && product) {
        await productRepository.update(product.id, {
          title: trimmedTitle,
          description: description_,
          priceCents,
        });
        if (file) {
          const uploaded = await productRepository.uploadFile(product.id, file);
          await productRepository.update(product.id, {
            filePath: uploaded.filePath,
            fileName: uploaded.fileName,
            fileMime: uploaded.fileMime,
            fileSize: uploaded.fileSize,
          });
        }
        if (thumbnailFile) {
          const uploadedThumbnail = await productRepository.uploadThumbnail(
            product.id,
            thumbnailFile
          );
          await productRepository.update(product.id, {
            thumbnailPath: uploadedThumbnail.thumbnailPath,
            thumbnailMime: uploadedThumbnail.thumbnailMime,
          });
        }
        router.push(`/@${user.slug}/${product.slug}`);
        router.refresh();
        return;
      }

      const slug = await productRepository.generateUniqueSlug(trimmedTitle);
      const created = await productRepository.create(user.id, {
        type,
        title: trimmedTitle,
        description: description_,
        priceCents,
        slug,
      });

      const uploaded = await productRepository.uploadFile(created.id, file!);
      await productRepository.update(created.id, {
        filePath: uploaded.filePath,
        fileName: uploaded.fileName,
        fileMime: uploaded.fileMime,
        fileSize: uploaded.fileSize,
      });

      if (thumbnailFile) {
        const uploadedThumbnail = await productRepository.uploadThumbnail(
          created.id,
          thumbnailFile
        );
        await productRepository.update(created.id, {
          thumbnailPath: uploadedThumbnail.thumbnailPath,
          thumbnailMime: uploadedThumbnail.thumbnailMime,
        });
      }

      router.push(`/@${user.slug}/${slug}`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao salvar o produto."
      );
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      <Card className="w-full">
        <CardHeader>
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="rounded-full border-2 border-border bg-primary px-3 py-0.5 text-xs font-bold text-primary-foreground shadow-cartoon-sm">
              {config.label}
            </span>
            {isEdit && product && user?.slug && (
              <Button type="button" variant="outline" size="sm" asChild>
                <a
                  href={`/@${user.slug}/${product.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="size-4" />
                  Ver página
                </a>
              </Button>
            )}
          </div>
          <CardTitle>{isEdit ? "Editar produto" : "Criar produto"}</CardTitle>
          <CardDescription>{config.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="thumbnail">Miniatura do produto (opcional)</Label>
            <div className="flex items-center gap-3">
              <ProductThumbnail
                type={type}
                thumbnailUrl={thumbnailPreview}
                className="size-16"
                iconClassName="size-7"
                sizes="64px"
              />
              <Input
                id="thumbnail"
                ref={thumbnailInputRef}
                type="file"
                accept={THUMBNAIL_ACCEPT}
                onChange={handleThumbnailChange}
                className="flex-1"
              />
            </div>
            <p className="text-muted-foreground text-xs">
              PNG, JPG, WEBP ou GIF. Máx. {formatFileSize(THUMBNAIL_MAX_SIZE)}.
              Se não enviar, usamos um ícone genérico do tipo de produto.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="title">Nome do produto</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
              minLength={TITLE_MIN}
              maxLength={TITLE_MAX}
              placeholder="Ex.: Aula de introdução ao violão"
              required
            />
            <p className="text-muted-foreground text-right text-xs">
              {title.length}/{TITLE_MAX}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) =>
                setDescription(e.target.value.slice(0, DESCRIPTION_MAX))
              }
              maxLength={DESCRIPTION_MAX}
              placeholder="Conte o que sua audiência vai receber."
            />
            <p className="text-muted-foreground text-right text-xs">
              {description.length}/{DESCRIPTION_MAX}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="price">Preço</Label>
            <PriceInput
              id="price"
              valueCents={priceCents}
              onChangeCents={setPriceCents}
              maxCents={PRICE_MAX_CENTS}
            />
            <p className="text-muted-foreground text-xs">
              Grátis ou de {formatBRL(PRICE_MIN_CENTS)} a {formatBRL(PRICE_MAX_CENTS)}.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="file">{config.uploadLabel}</Label>
            <Input
              id="file"
              ref={fileInputRef}
              type="file"
              accept={config.accept}
              onChange={handleFileChange}
            />
            <p className="text-muted-foreground text-xs">
              {config.allowedHint}. Máx. {formatFileSize(config.maxSize)}.
            </p>
            {isEdit && product?.fileName && !file && (
              <p className="flex items-center gap-1.5 text-xs font-medium">
                <UploadCloud className="size-3.5" />
                Arquivo atual: {product.fileName}
              </p>
            )}
          </div>

          {error && (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          )}

          <div className="mt-2 flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => router.back()}
              disabled={submitting}
            >
              Voltar
            </Button>
            <Button type="submit" className="flex-1" disabled={submitting}>
              {submitting
                ? "Salvando..."
                : isEdit
                  ? "Salvar alterações"
                  : "Publicar produto"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showFreeConfirm} onOpenChange={setShowFreeConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Salvar produto gratuito?" : "Publicar produto gratuito?"}
            </DialogTitle>
            <DialogDescription>
              Você não definiu um preço, então este produto ficará disponível de
              graça para quem tiver acesso. Você pode adicionar um preço depois,
              editando o produto.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowFreeConfirm(false)}
            >
              Voltar e definir preço
            </Button>
            <Button
              type="button"
              onClick={() => {
                setShowFreeConfirm(false);
                void submitProduct({ confirmedFree: true });
              }}
            >
              {isEdit ? "Salvar de graça" : "Publicar de graça"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
