# Frontend

История работ по клиентскому frontend и общим frontend-частям.

## Записи

### 2026-06-12 - Оформление заказа и WhatsApp

- Work plan: `docs/work-plans/completed/2026-06-12-checkout-whatsapp.work-plan.md`
- Ветка: `feature/checkout-whatsapp`
- Pull Request:

Сделано:

- Добавлена клиентская страница `/checkout`.
- Добавлена React-логика чтения корзины из `localStorage`, актуализации позиций и отправки WhatsApp-ссылки.
- В корзину добавлена кнопка перехода **Оформить заказ**.
- Добавлены русские ошибки для пустой корзины, отсутствующего адреса, отсутствующего способа оплаты и ошибки открытия WhatsApp.
- Добавлена очистка локальной корзины после открытия WhatsApp.

Проверено:

- `npm.cmd run lint`
- `npm.cmd run typecheck`
- `npm.cmd run build`
- HTTP 200 для `/checkout`.
- Владелец проверил локальный сценарий оформления.

### 2026-06-12 - Корзина клиента

- Work plan: `docs/work-plans/completed/2026-06-11-cart.work-plan.md`
- Ветка: `feature/cart`
- Pull Request:

Сделано:

- Расширен клиентский React-компонент каталога состоянием корзины, сохранением в `localStorage` и актуализацией через API.
- На карточки товаров добавлены кнопка **В корзину** и управление количеством после добавления.
- Добавлено отдельное окно корзины и мобильная нижняя панель.
- Добавлены состояния загрузки и ошибки актуализации корзины.
- Добавлены русские тексты для корзины, предупреждений и подсказки по доставке.

Проверено:

- `npm.cmd run lint`
- `npm.cmd run typecheck`
- `npm.cmd run build`
- Владелец проверил локальную корзину.

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
