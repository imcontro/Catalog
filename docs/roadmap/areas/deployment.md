# Deployment

История работ по Vercel, окружениям, деплою и эксплуатации.

## Записи

### 2026-06-29 - Подготовка деплоя на Vercel

- Work plan: `docs/work-plans/completed/2026-06-29-vercel-deployment-prep.work-plan.md`
- Ветка: `feature/vercel-deployment-prep`
- Pull Request:

Сделано:

- Подтверждено, что текущий чистый Supabase используется как рабочий Supabase первой версии и не переносится в отдельный проект только ради запуска.
- В specs обновлены правила окружений и Vercel: production-деплой подключается к текущему рабочему Supabase через переменные окружения.
- Зафиксирован список переменных окружения для Vercel.
- Зафиксировано правило `PUBLIC_SITE_URL`: сначала используется Vercel-ссылка, позже ее можно заменить на домен.
- Проверены подключение к Supabase Postgres и bucket `product-images`.

Проверено:

- `npm.cmd run build`
- `npm.cmd run db:check`
- `npm.cmd run storage:ensure`
- `git diff --check`
- Локальная HTTP-проверка production server.

Заметки:

- Vercel-проект и домен не настраивались в коде.
- Секреты не добавлялись в репозиторий.
