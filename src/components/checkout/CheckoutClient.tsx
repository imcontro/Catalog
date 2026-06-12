"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type {
  CartResolveResponse,
  RemovedCartItem,
  ResolvedCartItem,
  StoredCartItem
} from "@/types/cart";

const cartStorageKey = "napitki_berkat_cart";
const maxWhatsAppUrlLength = 4000;
const emptyResolvedCart: CartResolveResponse = {
  items: [],
  removedItems: []
};

type PaymentMethod = "cash" | "transfer";
type ResolveState = "idle" | "loading" | "ready" | "error";
type SubmitState = "idle" | "submitting" | "sent";

type CheckoutClientProps = {
  whatsAppPhone: string;
  freeDeliveryThresholdRub: number;
};

type CartItemIdentity = {
  productId: string;
  flavorId: string | null;
};

type CheckoutLine = CartItemIdentity & {
  quantity: number;
  name: string;
  flavorName: string | null;
  priceRub: number;
  previousPriceRub: number | null;
  priceChanged: boolean;
  isAvailable: boolean;
  unavailableReason: string | null;
  isResolved: boolean;
};

export function CheckoutClient({
  whatsAppPhone,
  freeDeliveryThresholdRub
}: CheckoutClientProps) {
  const [cartHydrated, setCartHydrated] = useState(false);
  const [storedItems, setStoredItems] = useState<StoredCartItem[]>([]);
  const [resolvedCart, setResolvedCart] =
    useState<CartResolveResponse>(emptyResolvedCart);
  const [removedItems, setRemovedItems] = useState<RemovedCartItem[]>([]);
  const [resolveState, setResolveState] = useState<ResolveState>("idle");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [whatsAppError, setWhatsAppError] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");

  useEffect(() => {
    setStoredItems(readStoredCartItems());
    setCartHydrated(true);
  }, []);

  useEffect(() => {
    if (!cartHydrated) {
      return;
    }

    if (storedItems.length === 0) {
      window.localStorage.removeItem(cartStorageKey);
      return;
    }

    window.localStorage.setItem(cartStorageKey, JSON.stringify(storedItems));
  }, [cartHydrated, storedItems]);

  useEffect(() => {
    if (!cartHydrated) {
      return;
    }

    if (storedItems.length === 0) {
      setResolvedCart(emptyResolvedCart);
      setRemovedItems([]);
      setResolveState("idle");
      return;
    }

    const controller = new AbortController();

    async function resolveCart() {
      setResolveState("loading");

      try {
        const nextResolvedCart = await resolveStoredCartItems(
          storedItems,
          controller.signal
        );

        setResolvedCart(nextResolvedCart);
        setRemovedItems(nextResolvedCart.removedItems);
        setResolveState("ready");

        if (nextResolvedCart.removedItems.length > 0) {
          setStoredItems((currentItems) =>
            removeResolvedDeletedItems(currentItems, nextResolvedCart.removedItems)
          );
        }
      } catch {
        if (!controller.signal.aborted) {
          setResolveState("error");
        }
      }
    }

    resolveCart();

    return () => controller.abort();
  }, [cartHydrated, storedItems]);

  const lines = useMemo(
    () => buildCheckoutLines(storedItems, resolvedCart.items),
    [storedItems, resolvedCart.items]
  );
  const availableLines = lines.filter((line) => line.isAvailable);
  const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);
  const totalRub = availableLines.reduce(
    (sum, line) => sum + line.priceRub * line.quantity,
    0
  );
  const deliveryText = getCheckoutDeliveryText(
    totalRub,
    freeDeliveryThresholdRub
  );
  const hasUnavailableItems = lines.some((line) => !line.isAvailable);
  const hasPriceChanges = lines.some((line) => line.priceChanged);
  const canSubmit =
    cartHydrated &&
    storedItems.length > 0 &&
    availableLines.length > 0 &&
    resolveState !== "loading" &&
    submitState !== "submitting";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedAddress = address.trim();

    setFormError(null);
    setWhatsAppError(null);

    if (!cartHydrated) {
      setFormError("Заказ еще загружается. Попробуйте через несколько секунд.");
      return;
    }

    if (storedItems.length === 0) {
      setFormError("Товары пока не выбраны. Добавьте товары из каталога.");
      return;
    }

    if (!normalizedAddress) {
      setFormError("Укажите адрес доставки перед отправкой заказа.");
      return;
    }

    if (!paymentMethod) {
      setFormError("Выберите способ оплаты: наличные или перевод.");
      return;
    }

    setSubmitState("submitting");

    try {
      const latestResolvedCart = await resolveStoredCartItems(storedItems);
      const latestStoredItems = removeResolvedDeletedItems(
        storedItems,
        latestResolvedCart.removedItems
      );
      const latestLines = buildCheckoutLines(
        latestStoredItems,
        latestResolvedCart.items
      );
      const latestAvailableLines = latestLines.filter((line) => line.isAvailable);
      const latestTotalRub = latestAvailableLines.reduce(
        (sum, line) => sum + line.priceRub * line.quantity,
        0
      );

      setResolvedCart(latestResolvedCart);
      setRemovedItems(latestResolvedCart.removedItems);
      setResolveState("ready");
      setStoredItems(latestStoredItems);

      if (latestStoredItems.length === 0) {
        setFormError("Товары пока не выбраны. Добавьте товары из каталога.");
        setSubmitState("idle");
        return;
      }

      if (latestAvailableLines.length === 0) {
        setFormError(
          "В корзине нет доступных позиций. Удалите недоступные товары или добавьте другие."
        );
        setSubmitState("idle");
        return;
      }

      const message = buildWhatsAppMessage({
        address: normalizedAddress,
        deliveryText: getCheckoutDeliveryText(
          latestTotalRub,
          freeDeliveryThresholdRub
        ),
        lines: latestAvailableLines,
        paymentMethod,
        totalRub: latestTotalRub
      });
      const whatsAppUrl = buildWhatsAppUrl(whatsAppPhone, message);

      if (whatsAppUrl.length > maxWhatsAppUrlLength) {
        setFormError(
          "Сообщение получилось слишком длинным. Уменьшите заказ и отправьте его повторно."
        );
        setSubmitState("idle");
        return;
      }

      const openedWindow = window.open(whatsAppUrl, "_blank");

      if (!openedWindow) {
        setWhatsAppError(
          "WhatsApp не открылся. Проверьте приложение WhatsApp и попробуйте еще раз."
        );
        setSubmitState("idle");
        return;
      }

      openedWindow.opener = null;
      window.localStorage.removeItem(cartStorageKey);
      setStoredItems([]);
      setResolvedCart(emptyResolvedCart);
      setRemovedItems([]);
      setSubmitState("sent");
    } catch {
      setFormError("Не удалось обновить корзину. Попробуйте отправить заказ позже.");
      setSubmitState("idle");
    }
  }

  return (
    <section className="checkoutWorkspace" aria-label="Оформление заказа">
      <div className="checkoutGrid">
        <aside className="checkoutSummary" aria-label="Состав заказа">
          <div className="checkoutBlockHeader">
            <span>Состав</span>
            <h2>Ваш заказ</h2>
          </div>

          {resolveState === "loading" && storedItems.length > 0 ? (
            <p className="checkoutNotice">Обновляем заказ.</p>
          ) : null}

          {resolveState === "error" ? (
            <p className="checkoutAlert">
              Не удалось обновить заказ. Попробуйте еще раз перед отправкой.
            </p>
          ) : null}

          {removedItems.length > 0 ? (
            <p className="checkoutAlert">
              Некоторые позиции больше не доступны в каталоге и удалены из заказа.
            </p>
          ) : null}

          {hasPriceChanges ? (
            <p className="checkoutAlert">Цены в заказе обновлены до актуальных.</p>
          ) : null}

          {hasUnavailableItems ? (
            <p className="checkoutAlert">
              Недоступные позиции не попадут в WhatsApp.
            </p>
          ) : null}

          {!cartHydrated ? (
            <CheckoutEmpty
              title="Заказ загружается"
              text="Позиции появятся через несколько секунд."
            />
          ) : lines.length === 0 ? (
            <CheckoutEmpty
              title={
                submitState === "sent"
                  ? "Заказ открыт в WhatsApp"
                  : "Товары пока не выбраны"
              }
              text={
                submitState === "sent"
                  ? "Корзина очищена. Новый заказ можно собрать в каталоге."
                  : "Добавьте товары из каталога."
              }
            />
          ) : (
            <>
              <div className="checkoutList">
                {lines.map((line) => (
                  <article
                    className={
                      line.isAvailable
                        ? "checkoutItem"
                        : "checkoutItem checkoutItemUnavailable"
                    }
                    key={getCartItemKey(line)}
                  >
                    <div>
                      <h3>{getCheckoutLineDisplayName(line)}</h3>
                      <p>
                        {line.quantity} уп x {formatRub(line.priceRub)}
                      </p>
                      {line.priceChanged && line.previousPriceRub ? (
                        <p>Было {formatRub(line.previousPriceRub)} за уп</p>
                      ) : null}
                      {line.unavailableReason ? (
                        <p className="checkoutItemWarning">
                          {line.unavailableReason}
                        </p>
                      ) : null}
                    </div>
                    <strong>
                      {line.isAvailable
                        ? formatRub(line.priceRub * line.quantity)
                        : "Не отправляется"}
                    </strong>
                  </article>
                ))}
              </div>

              <div className="checkoutTotals">
                <div>
                  <span>Всего упаковок</span>
                  <strong>{totalQuantity} уп</strong>
                </div>
                <div>
                  <span>Сумма товаров</span>
                  <strong>{formatRub(totalRub)}</strong>
                </div>
                {availableLines.length > 0 ? <p>{deliveryText}</p> : null}
              </div>

              {availableLines.length === 0 && resolveState !== "loading" ? (
                <p className="checkoutAlert">
                  В корзине нет доступных позиций. Удалите недоступные товары или
                  добавьте другие.
                </p>
              ) : null}
            </>
          )}

          <Link className="checkoutBackLink" href="/">
            Вернуться к каталогу
          </Link>
        </aside>

        <form className="checkoutForm" noValidate onSubmit={handleSubmit}>
          <div className="checkoutBlockHeader">
            <span>Данные заказа</span>
            <h2>Куда доставить</h2>
          </div>

          <label className="checkoutField">
            <span>Адрес доставки</span>
            <textarea
              autoComplete="street-address"
              onChange={(event) => setAddress(event.currentTarget.value)}
              placeholder="Грозный ул. Назабраева 92"
              rows={3}
              value={address}
            />
          </label>

          <fieldset className="paymentGroup">
            <legend>Способ оплаты</legend>
            <div className="paymentOptions">
              <button
                aria-pressed={paymentMethod === "cash"}
                className={
                  paymentMethod === "cash"
                    ? "paymentOption paymentOptionActive"
                    : "paymentOption"
                }
                onClick={() => setPaymentMethod("cash")}
                type="button"
              >
                Наличные
              </button>
              <button
                aria-pressed={paymentMethod === "transfer"}
                className={
                  paymentMethod === "transfer"
                    ? "paymentOption paymentOptionActive"
                    : "paymentOption"
                }
                onClick={() => setPaymentMethod("transfer")}
                type="button"
              >
                Перевод
              </button>
            </div>
          </fieldset>

          <div className="checkoutDeliveryBox">
            <span>Доставка</span>
            <strong>
              {availableLines.length > 0 ? deliveryText : "Доставка недоступна без товаров"}
            </strong>
          </div>

          {formError ? <p className="checkoutError">{formError}</p> : null}
          {whatsAppError ? <p className="checkoutError">{whatsAppError}</p> : null}

          <button className="sendWhatsAppButton" disabled={!canSubmit} type="submit">
            {submitState === "submitting"
              ? "Обновляем заказ"
              : "Отправить в WhatsApp"}
          </button>
        </form>
      </div>
    </section>
  );
}

function CheckoutEmpty({ title, text }: { title: string; text: string }) {
  return (
    <div className="checkoutEmpty">
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

async function resolveStoredCartItems(
  items: StoredCartItem[],
  signal?: AbortSignal
) {
  const response = await fetch("/api/cart/resolve", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      items
    }),
    cache: "no-store",
    signal
  });

  if (!response.ok) {
    throw new Error("Cart resolve failed");
  }

  return (await response.json()) as CartResolveResponse;
}

function buildCheckoutLines(
  storedItems: StoredCartItem[],
  resolvedItems: ResolvedCartItem[]
): CheckoutLine[] {
  const resolvedItemsByKey = new Map(
    resolvedItems.map((item) => [getCartItemKey(item), item])
  );

  return storedItems.map((storedItem) => {
    const resolvedItem = resolvedItemsByKey.get(getCartItemKey(storedItem));

    if (resolvedItem) {
      return {
        productId: resolvedItem.productId,
        flavorId: resolvedItem.flavorId,
        quantity: storedItem.quantity,
        name: resolvedItem.name,
        flavorName: resolvedItem.flavorName,
        priceRub: resolvedItem.priceRub,
        previousPriceRub: resolvedItem.previousPriceRub,
        priceChanged: resolvedItem.priceChanged,
        isAvailable: resolvedItem.isAvailable,
        unavailableReason: resolvedItem.unavailableReason,
        isResolved: true
      };
    }

    return {
      productId: storedItem.productId,
      flavorId: storedItem.flavorId,
      quantity: storedItem.quantity,
      name: storedItem.snapshotName,
      flavorName: storedItem.snapshotFlavorName,
      priceRub: storedItem.snapshotPriceRub,
      previousPriceRub: null,
      priceChanged: false,
      isAvailable: true,
      unavailableReason: null,
      isResolved: false
    };
  });
}

function readStoredCartItems(): StoredCartItem[] {
  try {
    const rawItems = window.localStorage.getItem(cartStorageKey);

    if (!rawItems) {
      return [];
    }

    const parsedItems: unknown = JSON.parse(rawItems);

    if (!Array.isArray(parsedItems)) {
      return [];
    }

    return parsedItems.flatMap((item) => {
      if (!isRecord(item)) {
        return [];
      }

      const productId = item.productId;
      const flavorId = item.flavorId;
      const quantity = item.quantity;
      const addedAt = item.addedAt;
      const snapshotName = item.snapshotName;
      const snapshotFlavorName = item.snapshotFlavorName;
      const snapshotPriceRub = item.snapshotPriceRub;
      const quantityValue =
        typeof quantity === "number" && Number.isInteger(quantity) ? quantity : null;
      const snapshotPriceRubValue =
        typeof snapshotPriceRub === "number" && Number.isInteger(snapshotPriceRub)
          ? snapshotPriceRub
          : null;

      if (
        typeof productId !== "string" ||
        !isUuid(productId) ||
        !(flavorId === null || (typeof flavorId === "string" && isUuid(flavorId))) ||
        quantityValue === null ||
        quantityValue < 1 ||
        typeof addedAt !== "string" ||
        typeof snapshotName !== "string" ||
        snapshotName.trim() === "" ||
        !(snapshotFlavorName === null || typeof snapshotFlavorName === "string") ||
        snapshotPriceRubValue === null ||
        snapshotPriceRubValue < 1
      ) {
        return [];
      }

      return [
        {
          productId,
          flavorId,
          quantity: Math.min(quantityValue, 999),
          addedAt,
          snapshotName,
          snapshotFlavorName,
          snapshotPriceRub: snapshotPriceRubValue
        }
      ];
    });
  } catch {
    return [];
  }
}

function removeResolvedDeletedItems(
  items: StoredCartItem[],
  removedItems: RemovedCartItem[]
) {
  if (removedItems.length === 0) {
    return items;
  }

  return items.filter(
    (item) =>
      !removedItems.some(
        (removedItem) => getCartItemKey(removedItem) === getCartItemKey(item)
      )
  );
}

function buildWhatsAppMessage({
  lines,
  totalRub,
  deliveryText,
  address,
  paymentMethod
}: {
  lines: CheckoutLine[];
  totalRub: number;
  deliveryText: string;
  address: string;
  paymentMethod: PaymentMethod;
}) {
  const productLines = lines
    .map((line) => {
      const name = capitalizeDisplayName(line.name);
      const flavorName = line.flavorName
        ? ` ${capitalizeDisplayName(line.flavorName)}`
        : "";

      return `${name}${flavorName} - ${line.quantity}уп`;
    })
    .join("\n");

  return [
    "Добрый день! Хочу сделать заказ!",
    "",
    "Товары:",
    productLines,
    "",
    `Сумма товаров: ${formatRub(totalRub)}`,
    deliveryText,
    `Адрес: ${address}`,
    `Оплата: ${getPaymentMethodLabel(paymentMethod)}`
  ].join("\n");
}

function buildWhatsAppUrl(phone: string, message: string) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function getPaymentMethodLabel(paymentMethod: PaymentMethod) {
  return paymentMethod === "cash" ? "наличные" : "перевод";
}

function getCheckoutDeliveryText(totalRub: number, freeDeliveryThresholdRub: number) {
  if (totalRub >= freeDeliveryThresholdRub) {
    return "Доставка: бесплатно по г. Грозный";
  }

  return "Доставка: стоимость сообщим в WhatsApp по тарифу";
}

function getCartItemKey(item: CartItemIdentity) {
  return `${item.productId}:${item.flavorId ?? ""}`;
}

function getCheckoutLineDisplayName(line: CheckoutLine) {
  const name = capitalizeDisplayName(line.name);
  const flavorName = line.flavorName ? capitalizeDisplayName(line.flavorName) : "";

  return flavorName ? `${name} / ${flavorName}` : name;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function capitalizeDisplayName(value: string) {
  const firstLetterIndex = value.search(/\p{L}/u);

  if (firstLetterIndex === -1) {
    return value;
  }

  return (
    value.slice(0, firstLetterIndex) +
    value[firstLetterIndex].toLocaleUpperCase("ru-RU") +
    value.slice(firstLetterIndex + 1)
  );
}

function formatRub(value: number) {
  return `${value.toLocaleString("ru-RU")} руб.`;
}
