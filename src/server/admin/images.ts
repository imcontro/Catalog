import { randomUUID } from "crypto";
import { createDatabaseConnection } from "../db/client";
import { images } from "../db/schema";
import {
  createSupabaseAdminClient,
  getSupabaseStorageBucketName
} from "../supabase/admin";

export type AdminImageUploadResult = {
  imageId: string;
  imageUrl: string;
};

export class AdminImageUploadError extends Error {
  constructor(
    message: string,
    public readonly status = 400
  ) {
    super(message);
  }
}

const ALLOWED_IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"]
]);
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export async function uploadAdminImage(file: File): Promise<AdminImageUploadResult> {
  validateImageFile(file);

  const extension = ALLOWED_IMAGE_TYPES.get(file.type);

  if (!extension) {
    throw new AdminImageUploadError("Выберите фото в формате JPG, PNG или WebP.");
  }

  const bucketName = getSupabaseStorageBucketName();
  const storagePath = createProductImageStoragePath(extension);
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const supabase = createSupabaseAdminClient();

  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(storagePath, fileBuffer, {
      contentType: file.type,
      upsert: false
    });

  if (uploadError) {
    throw new AdminImageUploadError("Не удалось загрузить фото. Попробуйте еще раз.", 500);
  }

  const publicUrl = supabase.storage.from(bucketName).getPublicUrl(storagePath).data.publicUrl;
  const { db, queryClient } = createDatabaseConnection();

  try {
    const [image] = await db
      .insert(images)
      .values({
        storagePath,
        publicUrl,
        originalName: file.name || "product-image",
        mimeType: file.type,
        sizeBytes: file.size,
        width: null,
        height: null
      })
      .returning({
        id: images.id,
        publicUrl: images.publicUrl
      });

    if (!image) {
      throw new AdminImageUploadError("Не удалось сохранить данные фото.", 500);
    }

    return {
      imageId: image.id,
      imageUrl: image.publicUrl
    };
  } finally {
    await queryClient.end({ timeout: 5 });
  }
}

function validateImageFile(file: File) {
  if (!(file instanceof File) || file.size === 0) {
    throw new AdminImageUploadError("Выберите файл фото.");
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new AdminImageUploadError("Выберите фото в формате JPG, PNG или WebP.");
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new AdminImageUploadError("Фото должно быть не больше 5 МБ.");
  }
}

function createProductImageStoragePath(extension: string) {
  const date = new Date();
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");

  return `admin-products/${year}/${month}/${randomUUID()}.${extension}`;
}
