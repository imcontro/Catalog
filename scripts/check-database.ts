import "dotenv/config";
import { checkDatabaseConnection } from "../src/server/db/health";

async function main() {
  const result = await checkDatabaseConnection();

  console.log(
    `Подключение к Supabase Postgres работает. Категорий: ${result.categoriesCount}.`
  );
}

main().catch((error: unknown) => {
  console.error("Не удалось проверить подключение к Supabase Postgres.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
