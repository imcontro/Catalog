# Frontend

История работ по клиентскому frontend и общим frontend-частям.

## Записи

### 2026-06-18 - Редизайн клиентского интерфейса

- Work plans:
  - `docs/work-plans/completed/2026-06-17-client-interface-paper-design.work-plan.md`
  - `docs/work-plans/completed/2026-06-17-reference-layout-draft.work-plan.md`
  - `docs/work-plans/completed/2026-06-18-client-interface-reference-layout-transfer.work-plan.md`
- Ветка: `feature/client-interface-redesign`
- Pull Request:

Сделано:

- Добавлен маршрут `/design-draft/reference-layout` для чернового визуального макета.
- Обновлены React-разметка и CSS основного каталога, страницы корзины и `CheckoutModal`.
- Каталог получил новый центрированный контейнер, обновленную шапку, поиск, категории, карточки товаров и нижнюю кнопку корзины.
- Корзина и оформление заказа приведены к утвержденному визуальному стилю без изменения бизнес-логики.

Проверено:

- `npm.cmd run lint`
- `npm.cmd run typecheck`
- `npm.cmd run build`
- Владелец проверил локальный интерфейс.

### 2026-06-14 - Страница корзины и окно оформления заказа

- Work plan: `docs/work-plans/completed/2026-06-14-cart-page-checkout-modal.work-plan.md`
- Ветка: `feature/cart-page-checkout-modal`
- Pull Request:

Сделано:

- Добавлена клиентская страница `/cart`.
- Добавлен клиентский компонент страницы корзины с чтением `localStorage`, актуализацией позиций и управлением количеством.
- Оформление заказа перенесено в компонент `CheckoutModal`.
- Удалена отдельная клиентская страница `/checkout`.
- В каталоге переход к корзине ведет на `/cart`, а корзина больше не открывается как модальное окно или нижняя панель.
- Добавлены русские состояния загрузки, пустой корзины, предупреждений по недоступным позициям и измененным ценам.

Проверено:

- `npm.cmd run lint`
- `npm.cmd run typecheck`
- `npm.cmd run build`
- Владелец проверил локальный frontend-сценарий.

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
