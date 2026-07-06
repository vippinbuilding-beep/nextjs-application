import { supabase } from "@/lib/supabase/client";
import { PRODUCTS_BUCKET } from "@/lib/supabase/storage";
import type { Product, ProductType } from "@/core/models/product";
import type {
  ExploreProductsParams,
  ExploreProductsResult,
  ProductFileMetadata,
  ProductInput,
  ProductRepository,
  ProductWithCreator,
  ThumbnailMetadata,
} from "@/core/repositories/product-repository";

const TABLE = "products";

type ProductRow = {
  id: string;
  creator_id: string;
  type: string;
  title: string;
  description: string | null;
  price_cents: number;
  slug: string;
  file_path: string | null;
  file_name: string | null;
  file_mime: string | null;
  file_size: number | null;
  thumbnail_path: string | null;
  thumbnail_mime: string | null;
  thumbnail_width: number | null;
  thumbnail_height: number | null;
  media_width: number | null;
  media_height: number | null;
  created_at: string | null;
  updated_at: string | null;
};

/**
 * Maps a Postgres unique-violation (code 23505) to a friendly message. The only
 * unique constraint on products is (creator_id, slug).
 */
function mapWriteError(error: { code?: string; message: string }): Error {
  if (error.code === "23505") {
    return new Error("Você já tem um produto com esse link. Tente outro nome.");
  }
  return new Error(error.message);
}

function mapStorageError(error: { message: string }): Error {
  const msg = error.message.toLowerCase();
  if (msg.includes("maximum allowed size") || msg.includes("entity too large")) {
    return new Error(
      "O arquivo passou do limite do Supabase Storage. No Dashboard do projeto, vá em " +
        "Project Settings → Storage e aumente o \"Global file size limit\" " +
        "(plano Free: máx. 50 MB; Pro: até 500 MB ou mais). Depois rode " +
        "`supabase db push` para aplicar a migration do bucket."
    );
  }
  return new Error(error.message);
}

type UploadKind = "file" | "thumbnail";

/**
 * Requests a presigned upload URL from the server (which validates ownership
 * and size) and uploads the file straight to Storage with the single-use
 * token. Returns the stored path.
 */
async function uploadViaSignedUrl(
  productId: string,
  file: File,
  kind: UploadKind
): Promise<string> {
  const response = await fetch(`/api/products/${productId}/upload-url`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      kind,
      fileName: file.name,
      contentType: file.type || undefined,
      size: file.size,
    }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw mapStorageError({
      message: body?.error ?? "Falha ao preparar o upload.",
    });
  }

  const { path, token } = (await response.json()) as {
    path: string;
    token: string;
  };

  const { error } = await supabase.storage
    .from(PRODUCTS_BUCKET)
    .uploadToSignedUrl(path, token, file, {
      contentType: file.type || undefined,
    });
  if (error) throw mapStorageError(error);

  return path;
}

/**
 * Supabase (Postgres + Storage) implementation of {@link ProductRepository}.
 */
export class SupabaseProductRepository implements ProductRepository {
  async create(creatorId: string, data: ProductInput): Promise<Product> {
    const { data: row, error } = await supabase
      .from(TABLE)
      .insert({
        creator_id: creatorId,
        type: data.type,
        title: data.title,
        description: data.description ?? null,
        price_cents: data.priceCents,
        slug: data.slug,
      })
      .select("*")
      .single();
    if (error) throw mapWriteError(error);
    return toProduct(row as ProductRow);
  }

  async update(
    id: string,
    data: Partial<ProductInput & ProductFileMetadata & ThumbnailMetadata>
  ): Promise<void> {
    const row: Partial<ProductRow> = {};
    if (data.type !== undefined) row.type = data.type;
    if (data.title !== undefined) row.title = data.title;
    if (data.description !== undefined) row.description = data.description ?? null;
    if (data.priceCents !== undefined) row.price_cents = data.priceCents;
    if (data.slug !== undefined) row.slug = data.slug;
    if (data.filePath !== undefined) row.file_path = data.filePath;
    if (data.fileName !== undefined) row.file_name = data.fileName;
    if (data.fileMime !== undefined) row.file_mime = data.fileMime;
    if (data.fileSize !== undefined) row.file_size = data.fileSize;
    if (data.thumbnailPath !== undefined) row.thumbnail_path = data.thumbnailPath;
    if (data.thumbnailMime !== undefined) row.thumbnail_mime = data.thumbnailMime;
    if (data.thumbnailWidth !== undefined) row.thumbnail_width = data.thumbnailWidth;
    if (data.thumbnailHeight !== undefined) row.thumbnail_height = data.thumbnailHeight;
    if (data.mediaWidth !== undefined) row.media_width = data.mediaWidth;
    if (data.mediaHeight !== undefined) row.media_height = data.mediaHeight;

    const { error } = await supabase.from(TABLE).update(row).eq("id", id);
    if (error) throw mapWriteError(error);
  }

  async getById(id: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return toProduct(data as ProductRow);
  }

  async getByCreatorAndSlug(
    creatorId: string,
    slug: string
  ): Promise<Product | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("creator_id", creatorId)
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return toProduct(data as ProductRow);
  }

  async listByCreator(creatorId: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("creator_id", creatorId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data as ProductRow[]).map(toProduct);
  }

  async searchExplore(
    params: ExploreProductsParams = {}
  ): Promise<ExploreProductsResult> {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(48, Math.max(1, params.pageSize ?? 12));
    const query = params.query?.trim() ?? "";
    const offset = (page - 1) * pageSize;

    let matchingCreatorIds: string[] = [];
    if (query) {
      const pattern = toIlikePattern(query);
      const { data: profiles, error: profilesError } = await supabase
        .from("public_profiles")
        .select("id")
        .or(`creator_name.ilike.${pattern},slug.ilike.${pattern}`);

      if (profilesError) throw new Error(profilesError.message);
      matchingCreatorIds = ((profiles ?? []) as { id: string }[]).map(
        (profile) => profile.id
      );
    }

    let builder = supabase
      .from(TABLE)
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (query) {
      const pattern = toIlikePattern(query);
      const filters = [
        `title.ilike.${pattern}`,
        `description.ilike.${pattern}`,
      ];
      if (matchingCreatorIds.length > 0) {
        filters.push(`creator_id.in.(${matchingCreatorIds.join(",")})`);
      }
      builder = builder.or(filters.join(","));
    }

    const { data, error, count } = await builder.range(
      offset,
      offset + pageSize - 1
    );
    if (error) throw new Error(error.message);

    const items = await attachCreators((data ?? []) as ProductRow[]);
    const total = count ?? 0;

    return { items, total, page, pageSize };
  }

  async listByIds(ids: string[]): Promise<ProductWithCreator[]> {
    if (!ids.length) return [];

    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .in("id", ids)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return attachCreators(data as ProductRow[]);
  }

  async delete(id: string): Promise<void> {
    const response = await fetch(`/api/products/${id}`, { method: "DELETE" });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      throw new Error(body?.error ?? "Falha ao excluir o produto.");
    }
  }

  async generateUniqueSlug(base: string): Promise<string> {
    const response = await fetch("/api/products/claim-slug", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ desired: base }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      throw new Error(body?.error ?? "Falha ao gerar slug.");
    }
    const { slug } = (await response.json()) as { slug: string };
    return slug;
  }

  async uploadFile(
    productId: string,
    file: File
  ): Promise<ProductFileMetadata> {
    const filePath = await uploadViaSignedUrl(productId, file, "file");
    return {
      filePath,
      fileName: file.name,
      fileMime: file.type || "application/octet-stream",
      fileSize: file.size,
    };
  }

  async uploadThumbnail(
    productId: string,
    file: File
  ): Promise<ThumbnailMetadata> {
    const thumbnailPath = await uploadViaSignedUrl(productId, file, "thumbnail");
    return {
      thumbnailPath,
      thumbnailMime: file.type || "application/octet-stream",
    };
  }
}

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    creatorId: row.creator_id,
    type: row.type as ProductType,
    title: row.title,
    description: row.description ?? undefined,
    priceCents: row.price_cents ?? 0,
    slug: row.slug,
    filePath: row.file_path ?? undefined,
    fileName: row.file_name ?? undefined,
    fileMime: row.file_mime ?? undefined,
    fileSize: row.file_size ?? undefined,
    thumbnailPath: row.thumbnail_path ?? undefined,
    thumbnailMime: row.thumbnail_mime ?? undefined,
    thumbnailWidth: row.thumbnail_width ?? undefined,
    thumbnailHeight: row.thumbnail_height ?? undefined,
    mediaWidth: row.media_width ?? undefined,
    mediaHeight: row.media_height ?? undefined,
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
  };
}

type PublicProfileRow = {
  id: string;
  slug: string;
  creator_name: string | null;
};

/** Escapes user input for safe use inside a PostgREST `ilike` filter. */
function toIlikePattern(query: string): string {
  const escaped = query
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/"/g, '""');
  return `"%${escaped}%"`;
}

async function attachCreators(rows: ProductRow[]): Promise<ProductWithCreator[]> {
  if (!rows.length) return [];

  const creatorIds = [...new Set(rows.map((row) => row.creator_id))];
  const { data, error } = await supabase
    .from("public_profiles")
    .select("id, slug, creator_name")
    .in("id", creatorIds);

  if (error) throw new Error(error.message);

  const creatorsById = new Map(
    ((data ?? []) as PublicProfileRow[]).map((profile) => [
      profile.id,
      {
        id: profile.id,
        slug: profile.slug,
        handle: profile.creator_name ?? profile.slug,
      },
    ])
  );

  return rows
    .filter((row) => creatorsById.has(row.creator_id))
    .map((row) => ({
      ...toProduct(row),
      creator: creatorsById.get(row.creator_id)!,
    }));
}
