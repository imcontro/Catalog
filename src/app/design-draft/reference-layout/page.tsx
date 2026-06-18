import Image from "next/image";
import styles from "./reference-layout.module.css";

type DraftProduct = {
  id: string;
  name: string;
  flavorName: string | null;
  priceRub: number;
  packQuantity: number;
  photoFile: string;
  quantity: number;
  status: "available" | "out";
};

const products: DraftProduct[] = [
  {
    id: "voda-1",
    name: "Серноводская 0.5л",
    flavorName: null,
    priceRub: 320,
    packQuantity: 12,
    photoFile: "voda-1.jpg",
    quantity: 2,
    status: "available"
  },
  {
    id: "gaz-1",
    name: "Кола ж/б 0.33л",
    flavorName: "классик",
    priceRub: 520,
    packQuantity: 24,
    photoFile: "gaz-1.jpg",
    quantity: 1,
    status: "available"
  },
  {
    id: "lim-1",
    name: "Мохито 0.45л",
    flavorName: "клубника",
    priceRub: 690,
    packQuantity: 12,
    photoFile: "lim-1.jpg",
    quantity: 0,
    status: "available"
  },
  {
    id: "energy-1",
    name: "Энергетик Flash",
    flavorName: null,
    priceRub: 960,
    packQuantity: 12,
    photoFile: "energy-1.jpg",
    quantity: 0,
    status: "available"
  },
  {
    id: "chai-1",
    name: "Чай холодный 0.5л",
    flavorName: "персик",
    priceRub: 540,
    packQuantity: 12,
    photoFile: "chai-1.jpg",
    quantity: 0,
    status: "available"
  },
  {
    id: "nat-1",
    name: "Натуральный напиток",
    flavorName: "груша",
    priceRub: 740,
    packQuantity: 12,
    photoFile: "nat-1.jpg",
    quantity: 0,
    status: "out"
  },
  {
    id: "gaz-5",
    name: "Добрый апельсин 0.5л",
    flavorName: null,
    priceRub: 610,
    packQuantity: 12,
    photoFile: "gaz-5.jpg",
    quantity: 0,
    status: "available"
  },
  {
    id: "nat-4",
    name: "Компот домашний 1л",
    flavorName: "вишня",
    priceRub: 780,
    packQuantity: 6,
    photoFile: "nat-4.jpg",
    quantity: 0,
    status: "available"
  }
];

const cartProducts = products.filter((product) => product.quantity > 0);
const totalQuantity = cartProducts.reduce(
  (sum, product) => sum + product.quantity,
  0
);
const totalRub = cartProducts.reduce(
  (sum, product) => sum + product.priceRub * product.quantity,
  0
);

export const metadata = {
  title: "Черновик дизайна | NapitkiBerkat"
};

export default function ReferenceLayoutDraftPage() {
  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <DraftHeader />

        <section className={styles.controls} aria-label="Поиск и категории">
          <label className={styles.search}>
            <span>Поиск</span>
            <svg
              aria-hidden="true"
              className={styles.searchIcon}
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle cx="10.8" cy="10.8" r="5.8" />
              <path d="m15.2 15.2 4.1 4.1" strokeLinecap="round" />
            </svg>
            <input placeholder="Найти напиток" type="search" />
          </label>

          <div className={styles.categoryScroller}>
            <div className={styles.categoryRail} aria-label="Категории напитков">
              {[
                "Все напитки",
                "Вода",
                "Газировки",
                "Лимонады",
                "Чай",
                "Энергетики"
              ].map((category, index) => (
                  <button
                    className={
                      index === 0
                        ? styles.categoryChipActive
                        : styles.categoryChip
                    }
                    key={category}
                    type="button"
                  >
                    {category}
                  </button>
                ))}
            </div>
            <span aria-hidden="true" className={styles.categoryHint}>
              ›
            </span>
          </div>
        </section>

        <section className={styles.productSection} aria-label="Товары">
          <div className={styles.productGrid}>
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>

        <section className={styles.statesPreview} aria-labelledby="draft-states">
          <div className={styles.previewHeader}>
            <div>
              <span>Служебные экраны</span>
              <h2 id="draft-states">Состояния каталога</h2>
            </div>
          </div>

          <div className={styles.stateGrid}>
            <article className={`${styles.stateCard} ${styles.stateCardWide}`}>
              <div className={styles.stateTopLine}>
                <span className={styles.stateBadge}>Загрузка</span>
                <span className={styles.stateSpinner} aria-hidden="true" />
              </div>
              <h3>Загружаем каталог</h3>
              <p>Подготавливаем напитки, цены и доступные вкусы.</p>
              <div className={styles.loadingChips} aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <div className={styles.loadingGrid} aria-hidden="true">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div className={styles.loadingProductCard} key={index}>
                    <span />
                    <strong />
                    <em />
                    <b />
                  </div>
                ))}
              </div>
            </article>

            <article className={styles.stateCard}>
              <span className={styles.stateIcon} aria-hidden="true">
                !
              </span>
              <h3>Не удалось загрузить</h3>
              <p>Проверьте интернет и попробуйте обновить страницу.</p>
              <button className={styles.stateButton} type="button">
                Обновить
              </button>
            </article>

            <article className={styles.stateCard}>
              <span className={styles.stateIconMuted} aria-hidden="true">
                0
              </span>
              <h3>Ничего не найдено</h3>
              <p>Попробуйте изменить поиск или выбрать другую категорию.</p>
              <button className={styles.stateButtonMuted} type="button">
                Сбросить
              </button>
            </article>

            <article className={styles.stateCard}>
              <div className={styles.stateTopLine}>
                <span className={styles.stateBadgeMuted}>Корзина</span>
                <span className={styles.stateDots} aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
              </div>
              <h3>Обновляем заказ</h3>
              <p>Проверяем цены и наличие перед оформлением.</p>
            </article>
          </div>
        </section>

        <section className={styles.cartPreview} aria-labelledby="draft-cart">
          <div className={styles.previewHeader}>
            <div>
              <span>Проверка состояния</span>
              <h2 id="draft-cart">Корзина</h2>
            </div>
            <button type="button">Очистить</button>
          </div>

          <div className={styles.cartList}>
            {cartProducts.map((product) => (
              <article className={styles.cartItem} key={product.id}>
                <div className={styles.cartImageBox}>
                  <ProductImage product={product} size={96} />
                </div>
                <div className={styles.cartCopy}>
                  <div className={styles.cartTitleRow}>
                    <h3>
                      <ProductName product={product} />
                    </h3>
                    <button aria-label="Удалить позицию" type="button">
                      ×
                    </button>
                  </div>
                  <p>{formatRub(product.priceRub)} за уп</p>
                  <div className={styles.cartFooter}>
                    <strong>{formatRub(product.priceRub * product.quantity)}</strong>
                    <QuantityStepper quantity={product.quantity} compact />
                  </div>
                </div>
              </article>
            ))}
          </div>

          <aside className={styles.cartSummary} aria-label="Итог корзины">
            <div className={styles.cartSummaryRow}>
              <div>
                <span>Сумма товаров</span>
                <p>
                  {cartProducts.length} товара · {totalQuantity} уп
                </p>
              </div>
              <strong>{formatRub(totalRub)}</strong>
            </div>
            <p className={styles.summaryDelivery}>
              Наберите заказ на 8 000 ₽ для бесплатной доставки по г. Грозный
            </p>
            <div className={styles.cartSummaryActions}>
              <button type="button">Продолжить покупки</button>
              <button type="button">Оформить заказ</button>
            </div>
          </aside>
        </section>

        <section className={styles.checkoutPreview} aria-labelledby="draft-checkout">
          <div className={styles.checkoutModal}>
            <div className={styles.modalHeader}>
              <div>
                <h2 id="draft-checkout">Оформление заказа</h2>
              </div>
              <button aria-label="Закрыть" type="button">
                ×
              </button>
            </div>

            <form className={styles.checkoutForm}>
              <label>
                <span>Адрес доставки</span>
                <textarea defaultValue="Грозный ул. Назабраева 92" rows={3} />
              </label>

              <fieldset>
                <legend>Способ оплаты</legend>
                <div className={styles.paymentGrid}>
                  <button type="button">Наличные</button>
                  <button className={styles.paymentActive} type="button">
                    Перевод
                  </button>
                </div>
              </fieldset>

              <div className={styles.checkoutTotal}>
                <span>Сумма товаров</span>
                <strong>{formatRub(totalRub)}</strong>
                <div className={styles.checkoutDeliveryStates}>
                  <p className={styles.checkoutDeliveryFree}>
                    От 8 000 ₽: доставка бесплатно по г. Грозный
                  </p>
                  <p className={styles.checkoutDeliveryTariff}>
                    До 8 000 ₽: доставка по тарифу
                  </p>
                </div>
              </div>

              <button className={styles.whatsappButton} type="button">
                <svg
                  aria-hidden="true"
                  className={styles.whatsappIcon}
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path d="M5.1 19.1 6 15.8a7.2 7.2 0 1 1 2.6 2.5l-3.5.8Z" />
                  <path d="M9.15 8.45c.18-.38.36-.39.53-.39h.45c.14 0 .36.05.55.42.18.36.62 1.46.67 1.57.05.12.08.25.02.4-.07.15-.1.24-.22.37l-.32.38c-.11.12-.23.25-.1.49.13.24.58.95 1.24 1.54.85.76 1.56.99 1.8 1.1.24.13.38.1.52-.06.14-.16.6-.7.76-.94.16-.24.32-.2.54-.12.22.08 1.4.66 1.64.78.24.12.4.18.46.28.05.1.05.59-.14 1.16-.2.56-1.12 1.08-1.56 1.12-.4.04-.9.06-1.46-.09-.34-.1-.77-.25-1.33-.49-2.34-1.01-3.87-3.36-3.99-3.52-.12-.16-.95-1.26-.95-2.4 0-1.15.6-1.7.82-1.93Z" />
                </svg>
                Отправить в WhatsApp
              </button>
            </form>
          </div>
        </section>
      </div>

      <a className={styles.floatingCart} href="#draft-cart">
        <svg
          aria-hidden="true"
          className={styles.floatingCartIcon}
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            d="M6.4 7.6h12.2l-1.05 7.1a2 2 0 0 1-1.98 1.7H9.16a2 2 0 0 1-1.96-1.6L5.35 5.45H3.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M9.1 7.6a3 3 0 0 1 5.8 0" strokeLinecap="round" />
          <circle cx="9.9" cy="19.4" r="1" />
          <circle cx="16.2" cy="19.4" r="1" />
        </svg>
        <span>Корзина</span>
        <strong>
          {totalQuantity} уп · {formatRub(totalRub)}
        </strong>
      </a>
    </main>
  );
}

function DraftHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.topBar}>
        <span aria-hidden="true" className={styles.headerSpacer} />
        <div className={styles.logoWrap}>
          <Image
            alt="NapitkiBerkat"
            className={styles.logo}
            height={90}
            priority
            src="/brand/logo-napitki-berkat.jpg"
            width={260}
          />
        </div>
        <button aria-label="Корзина" className={styles.iconButton} type="button">
          <svg
            aria-hidden="true"
            className={styles.cartSvg}
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              d="M6.4 7.6h12.2l-1.05 7.1a2 2 0 0 1-1.98 1.7H9.16a2 2 0 0 1-1.96-1.6L5.35 5.45H3.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M9.1 7.6a3 3 0 0 1 5.8 0"
              strokeLinecap="round"
            />
            <circle cx="9.9" cy="19.4" r="1" />
            <circle cx="16.2" cy="19.4" r="1" />
          </svg>
        </button>
      </div>
      <h1>NapitkiBerkat</h1>
    </header>
  );
}

function ProductCard({ product }: { product: DraftProduct }) {
  return (
    <article
      className={
        product.status === "available"
          ? styles.productCard
          : `${styles.productCard} ${styles.productCardMuted}`
      }
    >
      <div className={styles.productImageBox}>
        <ProductImage product={product} size={180} />
      </div>
      <strong className={styles.productPrice}>{formatRub(product.priceRub)}</strong>
      <h2>
        <ProductName product={product} />
      </h2>
      <p>
        {product.status === "available"
          ? `${product.packQuantity} шт в уп`
          : "Нет в наличии"}
      </p>

      {product.status === "available" ? (
        product.quantity > 0 ? (
          <QuantityStepper quantity={product.quantity} />
        ) : (
          <button className={styles.addButton} type="button">
            В корзину
          </button>
        )
      ) : (
        <button className={styles.addButton} disabled type="button">
          Нет в наличии
        </button>
      )}
    </article>
  );
}

function ProductImage({
  product,
  size
}: {
  product: DraftProduct;
  size: number;
}) {
  return (
    <Image
      alt={product.name}
      className={styles.productImage}
      height={size}
      src={`/design-draft/reference-layout/photo/${product.photoFile}`}
      width={size}
    />
  );
}

function ProductName({ product }: { product: DraftProduct }) {
  return (
    <>
      {product.name}
      {product.flavorName ? (
        <span> / {capitalize(product.flavorName)}</span>
      ) : null}
    </>
  );
}

function QuantityStepper({
  quantity,
  compact = false
}: {
  compact?: boolean;
  quantity: number;
}) {
  return (
    <div className={compact ? styles.stepperCompact : styles.stepper}>
      <button type="button">−</button>
      <span>{compact ? quantity : `${quantity} уп`}</span>
      <button type="button">+</button>
    </div>
  );
}

function formatRub(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    currency: "RUB",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(value);
}

function capitalize(value: string) {
  return value.charAt(0).toLocaleUpperCase("ru-RU") + value.slice(1);
}
