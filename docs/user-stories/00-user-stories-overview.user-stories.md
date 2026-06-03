# User Stories Spec: Overview v0.1

## 1. Назначение

Этот документ открывает слой user stories проекта **Каталог NapitkiBerkat**.

User stories нужны, чтобы проверить проект глазами реальных людей:

- клиента, который выбирает напитки и отправляет заказ;
- владельца, который управляет каталогом через админку;
- работника магазина, который получает заказ в WhatsApp.

Этот слой не заменяет global spec, feature specs и technical specs. Он помогает проверить, что путь пользователя понятный, без лишних шагов и без пропущенных случаев.

## 2. Источники

User stories опираются на документы:

- `docs/00-global-spec.md`;
- `docs/features/01-client-catalog.feature-spec.md`;
- `docs/features/02-cart.feature-spec.md`;
- `docs/features/03-checkout-and-whatsapp.feature-spec.md`;
- `docs/features/04-delivery.feature-spec.md`;
- `docs/features/05-admin-auth.feature-spec.md`;
- `docs/features/06-admin-products.feature-spec.md`;
- `docs/features/07-empty-and-error-states.feature-spec.md`;
- `docs/technical/00-technical-overview.technical-spec.md`;
- `docs/technical/01-data-model.technical-spec.md`;
- `docs/technical/02-client-catalog.technical-spec.md`;
- `docs/technical/03-cart-checkout-whatsapp.technical-spec.md`;
- `docs/technical/04-admin-auth.technical-spec.md`;
- `docs/technical/05-admin-products.technical-spec.md`;
- `docs/technical/06-images-and-files.technical-spec.md`;
- `docs/technical/07-deployment-and-operations.technical-spec.md`;
- `docs/technical/08-supabase.technical-spec.md`.

Если user story противоречит feature spec или technical spec, нужно остановиться и уточнить требование.

## 3. Формат истории

Каждая история описывается в формате:

```text
Как [роль],
я хочу [действие],
чтобы [результат].
```

Для каждой истории фиксируются:

- основной сценарий;
- критерии приемки;
- важные нестандартные случаи.

## 4. Роли

### 4.1. Клиент

Клиент получает ссылку на каталог, смотрит ассортимент, цены, фото, выбирает товары, собирает заказ и отправляет его в WhatsApp.

Кафе, рестораны, домашние клиенты и другие покупатели проходят один и тот же сценарий.

### 4.2. Владелец каталога

Владелец входит в админку по общему логину и паролю и управляет товарами, категориями, фото, вкусами, ценами, статусами и сортировкой.

### 4.3. Работник магазина

Работник получает WhatsApp-сообщение с заказом и должен быстро понять, что клиент заказал, куда доставлять и как клиент хочет оплатить.

## 5. Карта user stories

Документы user stories:

- `01-client-order-flow.user-stories.md` - путь клиента от открытия каталога до отправки заказа в WhatsApp;
- `02-admin-catalog-management.user-stories.md` - путь владельца в админке;
- `03-store-worker-whatsapp.user-stories.md` - путь работника магазина после получения заказа;
- `04-nonstandard-user-stories.user-stories.md` - нестандартные ситуации и проверочные сценарии.

## 6. Главные правила слоя user stories

- User stories не добавляют новую функциональность сами по себе.
- Если в истории появляется новая потребность, сначала нужно вернуть ее в feature spec или technical spec.
- Истории должны проверять реальные действия людей, а не внутреннюю технику.
- Если путь пользователя получается слишком сложным, нужно вернуться к specs и упростить требование.
- Если пользователь попадает в тупик, нужно описать понятный следующий шаг.

