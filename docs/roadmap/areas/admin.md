# Admin

История работ по админке и управлению каталогом.

## Записи

### 2026-06-24 - Админка: вход

- Work plan: `docs/work-plans/completed/2026-06-24-admin-auth.work-plan.md`
- Ветка: `feature/admin-auth`
- Pull Request:

Сделано:

- Страница `/admin/login` стала рабочей формой входа.
- Добавлены `POST /api/admin/login` и `POST /api/admin/logout`.
- Добавлена серверная сессия администратора через `httpOnly` cookie.
- Токен сессии хранится у владельца в cookie, а в `admin_sessions` записывается только хеш токена.
- `/admin` закрыта серверной проверкой сессии.
- Добавлена кнопка выхода из админки.
- В technical spec описан формат `ADMIN_PASSWORD_HASH`.

Проверено:

- `npm.cmd run lint`
- `npm.cmd run typecheck`
- `npm.cmd run build`
- `npm.cmd run db:check`
- `git diff --check`
- Ручная проверка входа, выхода и защиты `/admin`.

Заметки:

- Управление каталогом в админке остается следующим отдельным этапом.
- Тестовые значения `.env` не коммитятся.

### 2026-06-05 - Подготовка приложения

- Work plan: `docs/work-plans/completed/2026-06-05-application-foundation.work-plan.md`
- Ветка: `feature/application-foundation`
- Pull Request:

Сделано:

- Добавлена заготовка страницы входа в админку `/admin/login`.
- Форма входа пока отключена, потому что реальная авторизация не входит в этот work plan.

Проверено:

- HTTP 200 для `/admin/login`.
- `npm run build`
