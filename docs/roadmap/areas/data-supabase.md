# Data And Supabase

История работ по базе данных, Supabase, Storage и импорту данных.

## Записи

### 2026-06-06 - Supabase и база данных

- Work plan: `docs/work-plans/completed/2026-06-06-supabase-database.work-plan.md`
- Ветка: `feature/supabase-database`
- Pull Request:

Сделано:

- Зафиксирован Drizzle ORM как инструмент работы с Supabase Postgres.
- Подготовлены схема, конфигурация Drizzle и миграция базы данных.
- Созданы таблицы `categories`, `products`, `product_flavors`, `images` и `admin_sessions`.
- Добавлены стартовые категории.
- Добавлена серверная read-проверка подключения к Supabase Postgres.
- Создан Supabase Storage bucket `product-images`.

Проверено:

- Миграции применены к тестовому Supabase.
- Read-запрос к таблице `categories` вернул `7` категорий.
- Bucket `product-images` создан.
- Локальный `.env` игнорируется Git.
