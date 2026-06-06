# Общая Хронология Работ

Этот файл хранит хронологическую историю завершенных work plans.

Новые записи добавляются сверху, чтобы последние изменения были видны первыми.

## Записи

### 2026-06-06 - Загрузка данных старого каталога в Supabase

- Work plan: `docs/work-plans/completed/2026-06-06-catalog-data-import.work-plan.md`
- Ветка: `feature/catalog-data-import`
- Pull Request:
- Области: data-supabase

Сделано:

- В подтвержденный тестовый Supabase загружены реальные данные старого каталога.
- В Supabase Postgres записаны 86 товаров и 108 вкусов.
- В Supabase Storage bucket `product-images` загружены 82 фото в папку `old-catalog/`.
- Добавлена команда проверки результата импорта `npm.cmd run catalog:import:check`.
- Подготовлен отчет `data/import/old-catalog-import-result-report.md`.
- Обновлен preparation-report после повторного dry-run: повторный запуск обновляет существующие записи, а не создает дубли.

Проверено:

- `npm.cmd run lint`
- `npm.cmd run typecheck`
- `npm.cmd run build`
- `npm.cmd run storage:ensure`
- `npm.cmd run catalog:import:validate`
- `npm.cmd run catalog:import:dry-run`
- `npm.cmd run db:check`
- `npm.cmd run catalog:import:check`
- `git diff --check`
- Владелец проверил результат и попросил сделать push.

Заметки:

- `npm.cmd run catalog:import:check` подтвердил 7 категорий, 86 товаров, 108 вкусов, 82 images и 82 файла в Storage.
- Публичные ссылки открываются для 82 из 82 импортированных фото.
- 4 товара остались черновиками из-за отсутствующего основного фото: `горная 5л`, `К-13`, `родники 0,5л`, `южания 0.2 детский`.
- Боевой Supabase не использовался в рамках этого work plan.

### 2026-06-06 - Подготовка импорта старого каталога

- Work plan: `docs/work-plans/completed/2026-06-06-catalog-import-preparation.work-plan.md`
- Ветка: `feature/catalog-import-preparation`
- Pull Request:
- Области: data-supabase

Сделано:

- Добавлена валидация draft-данных старого каталога.
- Добавлен dry-run импорта без записи в Supabase.
- Подготовлен маппинг категорий старого каталога на категории проекта.
- Добавлена проверка фото, черновиков, дублей товаров и дублей вкусов.
- Подготовлен отчет `data/import/old-catalog-import-preparation-report.md`.
- Реальная запись в Supabase защищена отдельным confirm-флагом и не запускалась в рамках этого plan.

Проверено:

- `npm.cmd run lint`
- `npm.cmd run typecheck`
- `npm.cmd run build`
- `npm.cmd run catalog:import:validate`
- `npm.cmd run catalog:import:dry-run`
- `git diff --check`
- Владелец проверил результат и попросил сделать push.

Заметки:

- Dry-run показал 7 найденных категорий, 82 images к созданию, 86 товаров к созданию и 108 вкусов к созданию.
- 82 товара готовы к клиентскому каталогу, 4 товара останутся черновиками из-за отсутствующего основного фото.
- Финальная загрузка реальных товаров и фото в Supabase остается отдельным следующим work plan.

### 2026-06-06 - Supabase и база данных

- Work plan: `docs/work-plans/completed/2026-06-06-supabase-database.work-plan.md`
- Ветка: `feature/supabase-database`
- Pull Request:
- Области: data-supabase

Сделано:

- Выбран и зафиксирован Drizzle ORM для работы с Supabase Postgres.
- Добавлены зависимости, конфигурация Drizzle и серверные модули подключения к базе.
- Подготовлены схема и миграция для таблиц `categories`, `products`, `product_flavors`, `images` и `admin_sessions`.
- Добавлены стартовые категории каталога.
- Добавлена серверная проверка чтения из базы.
- Подготовлен Supabase Storage bucket `product-images`.
- Обновлен `.env.example` без реальных секретов.

Проверено:

- `npm.cmd run lint`
- `npm.cmd run typecheck`
- `npm.cmd run build`
- `npm.cmd run db:migrate`
- `npm.cmd run db:check`
- `npm.cmd run storage:ensure`
- `git diff --check`
- Проверено, что локальный `.env` игнорируется Git.

Заметки:

- Реальные товары и фото старого каталога не загружались.
- Клиентский каталог, корзина, WhatsApp-заказ и админка управления товарами не входили в этот work plan.
- Pull Request и merge владелец делает сам на GitHub.

### 2026-06-05 - Подготовка приложения

- Work plan: `docs/work-plans/completed/2026-06-05-application-foundation.work-plan.md`
- Ветка: `feature/application-foundation`
- Pull Request:
- Области: frontend, design, admin, catalog, docs-process

Сделано:

- Создана основа Next.js / React / TypeScript приложения.
- Добавлены базовые страницы `/` и `/admin/login`.
- Добавлены общие стили, использование логотипа и русские тексты интерфейса.
- Добавлены `.env.example`, `.gitignore`, TypeScript, ESLint и Next.js конфиги.
- Настроен `npm run dev` через Turbopack, чтобы локальный dev-сервер стабильно запускался на этой машине.

Проверено:

- Владелец открыл сайт в браузере и подтвердил, что все нормально.
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm audit --audit-level=high`
- HTTP 200 для `/` и `/admin/login`.
- `git diff --check`

Заметки:

- Supabase, реальные товары, корзина, WhatsApp и настоящая авторизация админки не входят в этот work plan.

## Шаблон записи

```text
### YYYY-MM-DD - Название work plan

- Work plan: `docs/work-plans/completed/file-name.work-plan.md`
- Ветка: `branch-name`
- Pull Request: `PR link or empty`
- Области: frontend, design, admin

Сделано:

- ...

Проверено:

- ...

Заметки:

- ...
```
