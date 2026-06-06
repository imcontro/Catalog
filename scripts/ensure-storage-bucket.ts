import "dotenv/config";
import { ensureProductImagesBucket } from "../src/server/supabase/storage";

async function main() {
  const result = await ensureProductImagesBucket();
  const action = result.created ? "создан" : "проверен и обновлен";

  console.log(`Bucket ${result.bucketName} ${action}.`);
}

main().catch((error: unknown) => {
  console.error("Не удалось подготовить Supabase Storage bucket.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
