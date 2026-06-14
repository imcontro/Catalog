"use client";

import { useEffect, useMemo, useState } from "react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { RemovedCartItem, StoredCartItem } from "@/types/cart";
import {
  buildCartLines,
  capitalizeDisplayName,
  emptyResolvedCart,
  formatRub,
  getCartLineDisplayName,
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
            <span>Оформление заказа</span>
            <h2>Адрес, оплата и WhatsApp</h2>
          </div>
          <button className="checkoutModalClose" onClick={onClose} type="button">
            Закрыть
          </button>
        </div>

        <div className="checkoutModalBody">
          <aside className="checkoutModalSummary" aria-label="Состав заказа">
            <div className="checkoutBlockHeader">
              <span>Состав</span>
              <h3>Ваш заказ</h3>
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

            {lines.length === 0 ? (
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
                      key={`${line.productId}:${line.flavorId ?? ""}`}
                    >
                      <div>
                        <h4>{getCartLineDisplayName(line)}</h4>
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
                    В корзине нет доступных позиций. Удалите недоступные товары
                    или добавьте другие.
                  </p>
                ) : null}
              </>
            )}
          </aside>

          <form className="checkoutForm" noValidate onSubmit={handleSubmit}>
            <div className="checkoutBlockHeader">
              <span>Данные заказа</span>
              <h3>Куда доставить</h3>
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
                {availableLines.length > 0
                  ? deliveryText
                  : "Доставка недоступна без товаров"}
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
    </div>
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
