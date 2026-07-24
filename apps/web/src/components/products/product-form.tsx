"use client";

import { ExternalLink, FileText, Film, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { BackButton } from "@/components/navigation/back-button";
import { CreatorPayoutPreview } from "@/components/creator/creator-payout-preview";
import { ProductThumbnail } from "@/components/products/product-thumbnail";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@vippin/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@vippin/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@vippin/ui/dialog";
import {
  FileUploadField,
  ImageUploadField,
} from "@/components/ui/file-upload-field";
import { Input } from "@vippin/ui/input";
import { Label } from "@vippin/ui/label";
import { PriceInput } from "@vippin/ui/price-input";
import { Textarea } from "@vippin/ui/textarea";
import type { Product, ProductType } from "@vippin/core/models/product";
import { formatBRL } from "@vippin/core/domain/money";
import { creatorProductFeeDescription } from "@/lib/payments/platform-fee";
import {
  formatFileSize,
  getProductTypeConfig,
  PRODUCT_LIMITS,
  THUMBNAIL_ACCEPT,
  THUMBNAIL_MAX_SIZE,
  validateProductFile,
  validateThumbnailFile,
} from "@/lib/products";
import { readImageDimensions, readVideoDimensions } from "@/lib/media-dimensions";
import { getProductThumbnailUrl } from "@/lib/supabase/storage";
import { toast } from "@/lib/toast";
import { navigateBack } from "@/lib/navigation/navigate-back";
import { productRepository } from "@vippin/supabase/factories/repository-factory";
import Link from "next/link";

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
      ? getProductThumbnailUrl(product.id, product.thumbnailPath)
      : null
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showFreeConfirm, setShowFreeConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const isCancelled = product?.status === "cancelled";

  useEffect(() => {
    if (!thumbnailFile) return;
    const url = URL.createObjectURL(thumbnailFile);
    setThumbnailPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [thumbnailFile]);

  function handleFileChange(selected: File | null) {
    if (!selected) {
      setFile(null);
      return;
    }
    setError(null);
    setFile(selected);
  }

  function handleThumbnailChange(selected: File | null) {
    if (!selected) {
      setThumbnailFile(null);
      if (!product?.thumbnailPath) {
        setThumbnailPreview(null);
      } else if (product?.id) {
        setThumbnailPreview(
          getProductThumbnailUrl(product.id, product.thumbnailPath)
        );
      }
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
          const mediaDimensions =
            type === "single_lesson"
              ? await readVideoDimensions(file).catch(() => null)
              : null;
          await productRepository.update(product.id, {
            filePath: uploaded.filePath,
            fileName: uploaded.fileName,
            fileMime: uploaded.fileMime,
            fileSize: uploaded.fileSize,
            ...(mediaDimensions
              ? {
                mediaWidth: mediaDimensions.width,
                mediaHeight: mediaDimensions.height,
              }
              : {}),
          });
        }
        if (thumbnailFile) {
          const uploadedThumbnail = await productRepository.uploadThumbnail(
            product.id,
            thumbnailFile
          );
          const thumbnailDimensions = await readImageDimensions(
            thumbnailFile
          ).catch(() => null);
          await productRepository.update(product.id, {
            thumbnailPath: uploadedThumbnail.thumbnailPath,
            thumbnailMime: uploadedThumbnail.thumbnailMime,
            ...(thumbnailDimensions
              ? {
                thumbnailWidth: thumbnailDimensions.width,
                thumbnailHeight: thumbnailDimensions.height,
              }
              : {}),
          });
        }
        toast.saved();
        navigateBack(router, "/");
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
      const mediaDimensions =
        type === "single_lesson"
          ? await readVideoDimensions(file!).catch(() => null)
          : null;
      await productRepository.update(created.id, {
        filePath: uploaded.filePath,
        fileName: uploaded.fileName,
        fileMime: uploaded.fileMime,
        fileSize: uploaded.fileSize,
        ...(mediaDimensions
          ? {
            mediaWidth: mediaDimensions.width,
            mediaHeight: mediaDimensions.height,
          }
          : {}),
      });

      if (thumbnailFile) {
        const uploadedThumbnail = await productRepository.uploadThumbnail(
          created.id,
          thumbnailFile
        );
        const thumbnailDimensions = await readImageDimensions(thumbnailFile).catch(
          () => null
        );
        await productRepository.update(created.id, {
          thumbnailPath: uploadedThumbnail.thumbnailPath,
          thumbnailMime: uploadedThumbnail.thumbnailMime,
          ...(thumbnailDimensions
            ? {
              thumbnailWidth: thumbnailDimensions.width,
              thumbnailHeight: thumbnailDimensions.height,
            }
            : {}),
        });
      }

      toast.published();
      navigateBack(router, "/");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao salvar o produto.";
      setError(message);
      toast.error(message);
      setSubmitting(false);
    }
  }

  async function handleCancelProduct() {
    if (!product) return;

    setError(null);
    setDeleting(true);

    try {
      await productRepository.cancel(product.id);
      setShowDeleteConfirm(false);
      toast.cancelled();
      router.replace("/");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao cancelar o produto.";
      setError(message);
      toast.error(message);
      setDeleting(false);
    }
  }

  async function handleRestoreProduct() {
    if (!product) return;

    setError(null);
    setRestoring(true);

    try {
      await productRepository.restore(product.id);
      toast.restored();
      router.replace("/");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao restaurar o produto.";
      setError(message);
      toast.error(message);
      setRestoring(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <Card className="w-full">
        <CardHeader>
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="rounded-full border-2 border-border bg-primary px-3 py-0.5 text-xs font-bold text-primary-foreground shadow-cartoon-sm">
              {config.label}
            </span>
            {isEdit && product && user?.slug && (
              <Button type="button" variant="outline" size="sm" asChild>
                <Link
                  href={`/@${user.slug}/${product.slug}`}
                >
                  <ExternalLink className="size-4" />
                  Ver página
                </Link>
              </Button>
            )}
          </div>
          <CardTitle>{isEdit ? "Editar produto" : "Criar produto"}</CardTitle>
          <CardDescription>{config.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="thumbnail">Miniatura do produto (opcional)</Label>
            <ImageUploadField
              id="thumbnail"
              accept={THUMBNAIL_ACCEPT}
              file={thumbnailFile}
              onFileChange={handleThumbnailChange}
              validate={validateThumbnailFile}
              onValidationError={setError}
              existingFileName={
                isEdit && product?.thumbnailPath && !thumbnailFile
                  ? "Miniatura atual"
                  : null
              }
              hint={`PNG, JPG, WEBP ou GIF. Máx. ${formatFileSize(THUMBNAIL_MAX_SIZE)}. Se não enviar, usamos um ícone genérico do tipo de produto.`}
            />
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
              className="min-h-96"
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
              Grátis ou de {formatBRL(PRICE_MIN_CENTS)} a {formatBRL(PRICE_MAX_CENTS)}.{" "}
              {creatorProductFeeDescription()}
            </p>
            <CreatorPayoutPreview grossCents={priceCents} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="file">{config.uploadLabel}</Label>
            <FileUploadField
              id="file"
              accept={config.accept}
              file={file}
              onFileChange={handleFileChange}
              validate={(selected) => validateProductFile(type, selected)}
              onValidationError={setError}
              title={
                type === "single_lesson"
                  ? "Escolher vídeo da aula"
                  : "Escolher documento"
              }
              description="Clique ou arraste o arquivo para esta área"
              existingFileName={isEdit && product?.fileName && !file ? product.fileName : null}
              icon={type === "single_lesson" ? Film : FileText}
              hint={`${config.allowedHint}. Máx. ${formatFileSize(config.maxSize)}.`}
            />
          </div>

          {error && (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          )}

          {isEdit && product && isCancelled && (
            <div className="rounded-xl border-2 border-dashed border-border bg-muted/40 p-4">
              <p className="text-sm font-bold">Produto cancelado</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Este produto está fora do ar para novos compradores. Restaure
                para publicá-lo de novo.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-3 w-full sm:w-auto"
                onClick={() => void handleRestoreProduct()}
                disabled={submitting || restoring}
              >
                <RotateCcw className="size-4" />
                {restoring ? "Restaurando..." : "Restaurar produto"}
              </Button>
            </div>
          )}

          {isEdit && product && !isCancelled && (
            <div className="rounded-xl border-2 border-dashed border-destructive/40 bg-destructive/5 p-4">
              <p className="text-sm font-bold text-destructive">Zona de perigo</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Cancelar tira o produto do ar: ele deixa de aparecer para novos
                compradores. Comentários e o acesso de quem já comprou são
                mantidos.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-3 w-full border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive sm:w-auto"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={submitting || deleting}
              >
                <Trash2 className="size-4" />
                Cancelar produto
              </Button>
            </div>
          )}

          <div className="mt-2 flex gap-3">
            <BackButton
              fallback="/"
              className="flex-1"
              disabled={submitting || deleting}
            />
            <Button type="submit" className="flex-1" disabled={submitting || deleting}>
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
              disabled={submitting}
            >
              Voltar e definir preço
            </Button>
            <Button
              type="button"
              disabled={submitting}
              onClick={() => {
                setShowFreeConfirm(false);
                void submitProduct({ confirmedFree: true });
              }}
            >
              {submitting
                ? "Salvando..."
                : isEdit
                  ? "Salvar de graça"
                  : "Publicar de graça"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar produto?</DialogTitle>
            <DialogDescription>
              {product?.title
                ? `"${product.title}" sairá do ar para novos compradores. Quem já comprou mantém o acesso, e os comentários continuam existindo.`
                : "Este produto sairá do ar para novos compradores."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleting}
            >
              Voltar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleCancelProduct()}
              disabled={deleting}
            >
              {deleting ? "Cancelando..." : "Cancelar produto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
