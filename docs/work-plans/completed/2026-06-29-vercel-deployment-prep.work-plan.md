# Work Plan: подготовка деплоя на Vercel

## 1. Цель

Подготовить проект к первому деплою на Vercel с текущим рабочим Supabase без переноса базы данных.

## 2. Основание

- `docs/01-development-roadmap.md`, этап 11: подготовка к деплою.
- `docs/technical/07-deployment-and-operations.technical-spec.md`.
- `docs/technical/08-supabase.technical-spec.md`.

Владелец подтвердил:

- текущий Supabase чистый и используется как рабочая база первой версии;
- переносить базу в отдельный Supabase-проект не нужно;
- расхождение контрольного импорта сейчас ожидаемо: `84` товара и `117` вкусов;
- черновой route `/design-draft/reference-layout` нужно удалить перед деплоем;
- рабочие изменения не должны оставаться на `main`.

## 3. Scope

В рамках этого плана:

- зафиксировать в specs, что текущий чистый Supabase используется как рабочий Supabase первой версии;
- удалить устаревшие design artifacts админки;
- удалить production-доступный черновой route `/design-draft/reference-layout`;
- убрать актуальные ссылки на удаленные design artifacts и черновые route из действующих specs, если они больше не являются источником требований;
- проверить обязательные переменные окружения для Vercel;
- объяснить правило `PUBLIC_SITE_URL`: значение берется из Vercel после создания проекта или из подключенного домена;
- выполнить проверки перед деплоем.

## 4. Не входит в scope

- перенос базы данных в другой Supabase-проект;
- изменение товаров, вкусов, цен, фото или категорий;
- изменение схемы базы данных;
- подключение домена;
- создание Pull Request или merge;
- commit и push до ручной проверки владельцем.

## 5. Переменные окружения для Vercel

На Vercel нужно добавить:

```text
DATABASE_URL
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_STORAGE_BUCKET
ADMIN_LOGIN
ADMIN_PASSWORD_HASH
SESSION_SECRET
WHATSAPP_PHONE
DELIVERY_FREE_THRESHOLD_RUB
PUBLIC_SITE_URL
```

`PUBLIC_SITE_URL` берется:

- сначала из Vercel после создания проекта, обычно в формате `https://<project-name>.vercel.app`;
- позже, если будет подключен домен, заменяется на домен.

## 6. Проверки

Перед ручной проверкой владельца выполнить:

- `npm.cmd run lint`;
- `npm.cmd run typecheck`;
- `npm.cmd run build`;
- `npm.cmd run db:check`;
- `npm.cmd run storage:ensure`;
- `npm.cmd run catalog:import:check` с учетом подтвержденного владельцем текущего состояния каталога;
- `git diff --check`;
- локальную HTTP-проверку production server для `/`, `/cart`, `/admin/login`, `/api/catalog`.

## 7. Критерии готовности

- Проект собирается production build.
- Основные публичные и админские маршруты отвечают локально.
- Supabase Postgres доступен.
- Supabase Storage bucket `product-images` доступен.
- Черновой route `/design-draft/reference-layout` больше не попадает в production build.
- В specs нет требования переносить чистую рабочую базу в другой Supabase-проект.
- Владелец понимает, где взять `PUBLIC_SITE_URL` для Vercel.

## 8. Выполнено

- Specs обновлены: текущий чистый Supabase используется как рабочий Supabase первой версии, отдельный перенос базы не требуется.
- Устаревшие design artifacts админки удалены из `docs/design/`.
- Черновой production-доступный route `/design-draft/reference-layout` удален.
- В build больше нет маршрутов `/design-draft/reference-layout` и `/design-draft/reference-layout/photo/[file]`.
- `PUBLIC_SITE_URL` объяснен владельцу: значение берется из Vercel-ссылки после создания проекта или из домена после его подключения.
- Текущее состояние каталога подтверждено владельцем: `84` товара и `117` вкусов считаются правильными.

## 9. Проверено

- `npm.cmd run lint`;
- `npm.cmd run typecheck`;
- `npm.cmd run build`;
- `npm.cmd run db:check`;
- `npm.cmd run storage:ensure`;
- `npm.cmd run catalog:import:check` показал ожидаемое владельцем состояние каталога: `84` товара, `117` вкусов, `82/82` публичных ссылок фото открываются;
- `git diff --check`;
- локальная HTTP-проверка production server:
  - `/` - `HTTP 200`;
  - `/cart` - `HTTP 200`;
  - `/admin/login` - `HTTP 200`;
  - `/api/catalog` - `HTTP 200`;
  - `/design-draft/reference-layout` - `HTTP 404`.

## 10. Заметки

- Домен не подключался.
- Vercel-проект и Pull Request владелец создает сам.
- Commit и push выполнены после просьбы владельца.
