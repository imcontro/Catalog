import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getRequiredServerEnv } from "../env";
import * as schema from "./schema";

export function createDatabaseConnection(databaseUrl = getRequiredServerEnv("DATABASE_URL")) {
  const queryClient = postgres(databaseUrl, {
    max: 5,
    prepare: false
  });

  return {
    db: drizzle(queryClient, { schema }),
    queryClient
  };
}
