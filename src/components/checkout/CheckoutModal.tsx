"use client";

import { useEffect, useMemo, useState } from "react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { RemovedCartItem, StoredCartItem } from "@/types/cart";
import {
  buildCartLines,
  capitalizeDisplayName,
  emptyResolvedCart,
  formatRub,
  getCheckoutDeliveryText,
  removeResolvedDeletedItems,
  resolveStoredCartItems
} from "@/components/cart/cart-utils";

const maxWhatsAppUrlLength = 4000;

type PaymentMethod = "cash" | "transfer";
type ResolveState = "idle" | "loading" | "ready" | "error";
type SubmitState = "idle" | "submitting" | "sent";

type CheckoutModalProps = {
  freeDeliveryThresholdRub: number;
  onClose: () => void;
  setStoredItems: Dispatch<SetStateAction<StoredCartItem[]>>;
  storedItems: StoredCartItem[];
  whatsAppPhone: string;
};

export function CheckoutModal({
  freeDeliveryThresholdRub,
  onClose,
  setStoredItems,
  storedItems,
  whatsAppPhone
}: CheckoutModalProps) {
  const [resolvedCart, setResolvedCart] = useState(emptyResolvedCart);
  const [removedItems, setRemovedItems] = useState<RemovedCartItem[]>([]);
  const [resolveState, setResolveState] = useState<ResolveState>("idle");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [whatsAppError, setWhatsAppError] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");

  useEffect(() => {
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
  }, [setStoredItems, storedItems]);

  const lines = useMemo(
    () => buildCartLines(storedItems, resolvedCart.items),
    [storedItems, resolvedCart.items]
  );
  const availableLines = lines.filter((line) => line.isAvailable);
  const totalRub = availableLines.reduce(
    (sum, line) => sum + line.priceRub * line.quantity,
    0
  );
  const hasUnavailableItems = lines.some((line) => !line.isAvailable);
  const hasPriceChanges = lines.some((line) => line.priceChanged);
  const canSubmit =
    storedItems.length > 0 &&
    availableLines.length > 0 &&
    resolveState !== "loading" &&
    submitState !== "submitting";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedAddress = address.trim();

    setFormError(null);
    setWhatsAppError(null);

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
      const latestLines = buildCartLines(
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
    <div className="checkoutModalOverlay" onClick={onClose}>
      <section
        aria-label="Оформление заказа"
        aria-modal="true"
        className="checkoutModal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="checkoutModalHeader">
          <div>
            <h2>Оформление заказа</h2>
            <p>Проверьте данные перед отправкой</p>
          </div>
          <button className="checkoutModalClose" onClick={onClose} type="button">
            ×
          </button>
        </div>

        <div className="checkoutModalBody">
          <form className="checkoutForm" noValidate onSubmit={handleSubmit}>
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

            {lines.length === 0 ? (
              <p className="checkoutAlert">
                {submitState === "sent"
                  ? "Заказ открыт в WhatsApp. Корзина очищена."
                  : "Товары пока не выбраны. Добавьте товары из каталога."}
              </p>
            ) : null}

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

            <div className="checkoutTotals">
              <div>
                <span>Сумма товаров</span>
                <strong>{formatRub(totalRub)}</strong>
              </div>
            </div>

            {formError ? <p className="checkoutError">{formError}</p> : null}
            {whatsAppError ? <p className="checkoutError">{whatsAppError}</p> : null}

            <button className="sendWhatsAppButton" disabled={!canSubmit} type="submit">
              <svg
                aria-hidden="true"
                className="whatsappIcon"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path d="M5.1 19.1 6 15.8a7.2 7.2 0 1 1 2.6 2.5l-3.5.8Z" />
                <path d="M9.15 8.45c.18-.38.36-.39.53-.39h.45c.14 0 .36.05.55.42.18.36.62 1.46.67 1.57.05.12.08.25.02.4-.07.15-.1.24-.22.37l-.32.38c-.11.12-.23.25-.1.49.13.24.58.95 1.24 1.54.85.76 1.56.99 1.8 1.1.24.13.38.1.52-.06.14-.16.6-.7.76-.94.16-.24.32-.2.54-.12.22.08 1.4.66 1.64.78.24.12.4.18.46.28.05.1.05.59-.14 1.16-.2.56-1.12 1.08-1.56 1.12-.4.04-.9.06-1.46-.09-.34-.1-.77-.25-1.33-.49-2.34-1.01-3.87-3.36-3.99-3.52-.12-.16-.95-1.26-.95-2.4 0-1.15.6-1.7.82-1.93Z" />
              </svg>
              {submitState === "submitting"
                ? "Обновляем заказ"
                : "Отправить в WhatsApp"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

function buildWhatsAppMessage({
  lines,
  totalRub,
  deliveryText,
  address,
  paymentMethod
}: {
  address: string;
  deliveryText: string;
  lines: ReturnType<typeof buildCartLines>;
  paymentMethod: PaymentMethod;
  totalRub: number;
}) {
  const productLines = lines
    .map((line) => {
      const name = capitalizeDisplayName(line.name);
      const formattedFlavorName = line.flavorName
        ? ` ${capitalizeDisplayName(line.flavorName)}`
        : "";

      return `${name}${formattedFlavorName} - ${line.quantity}уп`;
    })
    .join("\n");

  return [
    "*Добрый день! Хочу сделать заказ!*",
    "",
    "*Товары:*",
    productLines,
    "",
    `*Сумма товаров:* ${formatRub(totalRub)}`,
    `*Доставка:* ${getDeliveryMessageValue(deliveryText)}`,
    `*Адрес:* ${address}`,
    `*Оплата:* ${getPaymentMethodLabel(paymentMethod)}`
  ].join("\n");
}

function getDeliveryMessageValue(deliveryText: string) {
  return deliveryText.replace(/^Доставка:\s*/, "");
}

function buildWhatsAppUrl(phone: string, message: string) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function getPaymentMethodLabel(paymentMethod: PaymentMethod) {
  return paymentMethod === "cash" ? "наличные" : "перевод";
}
