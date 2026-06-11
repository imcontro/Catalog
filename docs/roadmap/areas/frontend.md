# Frontend

История работ по клиентскому frontend и общим frontend-частям.

## Записи

### 2026-06-06 - Клиентский каталог на данных Supabase

- Work plan: `docs/work-plans/completed/2026-06-06-client-catalog.work-plan.md`
- Ветка: `feature/client-catalog`
- Pull Request:

Сделано:

- Добавлен клиентский React-компонент каталога с фильтрами, поиском, состояниями загрузки и ошибками.
- Добавлена загрузка каталога через `GET /api/catalog`.
- Реализован выбор вкуса в карточке товара.
- Добавлены пустые состояния для пустого каталога, пустой категории и пустого поиска.
- Добавлена поддержка параметров `?category=` и `?search=` без отдельных страниц категорий.

Проверено:

- `npm.cmd run lint`
- `npm.cmd run typecheck`
- `npm.cmd run build`
- HTTP 200 для `/` и `/api/catalog`.

### 2026-06-05 - Подготовка приложения

- Work plan: `docs/work-plans/completed/2026-06-05-application-foundation.work-plan.md`
- Ветка: `feature/application-foundation`
- Pull Request:

Сделано:

- Создана основа frontend-приложения на Next.js / React / TypeScript.
- Добавлены базовая клиентская страница `/` и общие стили.
- Настроены команды `dev`, `build`, `lint`, `typecheck` и `start`.

Проверено:

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- HTTP 200 для `/`.
