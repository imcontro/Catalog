# Data And Supabase

История работ по базе данных, Supabase, Storage и импорту данных.

## Записи

### 2026-06-06 - Подготовка импорта старого каталога

- Work plan: `docs/work-plans/completed/2026-06-06-catalog-import-preparation.work-plan.md`
- Ветка: `feature/catalog-import-preparation`
- Pull Request:

Сделано:

- Добавлен скрипт подготовки импорта старого каталога.
- Добавлены команды `npm.cmd run catalog:import:validate` и `npm.cmd run catalog:import:dry-run`.
- Подготовлена проверка структуры draft JSON, обязательных полей, фото, дублей товаров и дублей вкусов.
- Подготовлен маппинг категорий старого каталога на стартовые категории проекта.
- Сформирован отчет подготовки импорта.

Проверено:

- Валидация draft-данных завершилась без ошибок и предупреждений.
- Dry-run сверился с тестовым Supabase без записи данных.
- По dry-run к созданию подготовлены 82 images, 86 товаров и 108 вкусов.
- 4 товара без основного фото остаются черновиками.

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
