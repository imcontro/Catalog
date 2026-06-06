import { createSupabaseAdminClient, getSupabaseStorageBucketName } from "./admin";

const productImageBucketOptions = {
  public: true,
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  fileSizeLimit: 5 * 1024 * 1024
};

export async function ensureProductImagesBucket() {
  const supabase = createSupabaseAdminClient();
  const bucketName = getSupabaseStorageBucketName();

  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    throw listError;
  }

  const bucketExists = buckets.some((bucket) => bucket.name === bucketName);

  if (!bucketExists) {
    const { error } = await supabase.storage.createBucket(
      bucketName,
      productImageBucketOptions
    );

    if (error) {
      throw error;
    }

    return {
      bucketName,
      created: true
    };
  }

  const { error } = await supabase.storage.updateBucket(
    bucketName,
    productImageBucketOptions
  );

  if (error) {
    throw error;
  }

  return {
    bucketName,
    created: false
  };
}
