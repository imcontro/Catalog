# Data And Supabase

История работ по базе данных, Supabase, Storage и импорту данных.

## Записи

### 2026-06-06 - Загрузка данных старого каталога в Supabase

- Work plan: `docs/work-plans/completed/2026-06-06-catalog-data-import.work-plan.md`
- Ветка: `feature/catalog-data-import`
- Pull Request:

Сделано:

- Старый каталог загружен в подтвержденный тестовый Supabase.
- В базе появились 86 товаров, 108 вкусов и 82 записи images с путями `old-catalog/`.
- В Storage bucket `product-images` загружены 82 файла.
- Добавлен скрипт `scripts/check-catalog-import.ts` для проверки результата импорта.
- Добавлен отчет результата импорта.

Проверено:

- Повторный dry-run показывает `0` записей к созданию и обновление существующих записей.
- `npm.cmd run catalog:import:check` подтвердил counts базы, Storage и публичное чтение фото.
- Публичные ссылки открываются для 82 из 82 импортированных фото.
- 4 товара без основного фото остались в статусе `draft`.

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
