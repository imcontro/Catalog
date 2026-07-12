---
name: napitkiberkat-spec-workflow
description: Навигатор по docs/ проекта Каталог NapitkiBerkat. Используй, когда после анализа задачи неясно, какие specs, user stories, work plans или roadmap читать. Для задачи по коду используй только для выбора документов до реализации. Не используй как руководство по коду, Git/GitHub, проверкам или общему процессу.
---

# Карта документации

Читать только относящиеся к задаче документы.

## Куда идти

- Общее понимание проекта, роли, крупный scope и границы первой версии: `docs/00-global-spec.md`.
- Поведение конкретных функций продукта: `docs/features/`.
- Визуальный стиль, логотип, цвета, UI-принципы и дизайн-макеты: `docs/design/`.
- База данных, API, архитектура, хранение, авторизация и деплой: `docs/technical/`.
- Проверка реальных пользовательских путей: `docs/user-stories/`.
- План конкретной ветки разработки: `docs/work-plans/`.
- История уже завершенных работ: `docs/roadmap/`.

## Feature Specs

- Клиентский каталог, категории, карточки, вкусы, поиск и видимость товаров: `docs/features/01-client-catalog.feature-spec.md`.
- Корзина, количество упаковок, суммы, недоступные позиции и удаление: `docs/features/02-cart.feature-spec.md`.
- Оформление заказа и WhatsApp-сообщение: `docs/features/03-checkout-and-whatsapp.feature-spec.md`.
- Правила доставки: `docs/features/04-delivery.feature-spec.md`.
- Вход в админку: `docs/features/05-admin-auth.feature-spec.md`.
- Управление товарами, категориями, вкусами, статусами, фото, ценами и сортировкой: `docs/features/06-admin-products.feature-spec.md`.
- Пустые, ошибочные и нестандартные состояния: `docs/features/07-empty-and-error-states.feature-spec.md`.

## Technical Specs

- Общая техническая картина: `docs/technical/00-technical-overview.technical-spec.md`.
- Модель данных: `docs/technical/01-data-model.technical-spec.md`.
- Техническая реализация клиентского каталога: `docs/technical/02-client-catalog.technical-spec.md`.
- Корзина, оформление заказа и WhatsApp технически: `docs/technical/03-cart-checkout-whatsapp.technical-spec.md`.
- Авторизация админки: `docs/technical/04-admin-auth.technical-spec.md`.
- Админка товаров технически: `docs/technical/05-admin-products.technical-spec.md`.
- Изображения и файлы: `docs/technical/06-images-and-files.technical-spec.md`.
- Деплой и эксплуатация: `docs/technical/07-deployment-and-operations.technical-spec.md`.
- Supabase: `docs/technical/08-supabase.technical-spec.md`.

## User Stories

- Общая карта user stories: `docs/user-stories/00-user-stories-overview.user-stories.md`.
- Путь клиента при заказе: `docs/user-stories/01-client-order-flow.user-stories.md`.
- Управление каталогом в админке: `docs/user-stories/02-admin-catalog-management.user-stories.md`.
- Получение заказа работником в WhatsApp: `docs/user-stories/03-store-worker-whatsapp.user-stories.md`.
- Нестандартные пользовательские сценарии: `docs/user-stories/04-nonstandard-user-stories.user-stories.md`.

## Как выбирать слой

- Если вопрос про цель, аудиторию или границы проекта - читать global spec.
- Если вопрос про то, как функция должна вести себя для пользователя - читать feature spec.
- Если вопрос про внешний вид или дизайн-процесс - читать design spec.
- Если вопрос про реализацию, данные, API, storage, auth или deploy - читать technical spec.
- Если вопрос про пользовательский путь или проверку сценария - читать user stories.
- Если вопрос про будущую работу в ветке - читать work plans.
- Если вопрос про то, что уже сделано - читать roadmap.
