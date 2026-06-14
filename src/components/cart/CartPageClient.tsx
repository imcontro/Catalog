"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { StoredCartItem } from "@/types/cart";
import { CheckoutModal } from "@/components/checkout/CheckoutModal";
import {
  buildCartLines,
  cartStorageKey,
  emptyResolvedCart,
  formatRub,
  getCartItemKey,
  getCartLineDisplayName,
  getDeliveryHint,
  readStoredCartItems,
  removeResolvedDeletedItems,
  resolveStoredCartItems
} from "./cart-utils";

type ResolveState = "idle" | "loading" | "ready" | "error";

type CartPageClientProps = {
  freeDeliveryThresholdRub: number;
  whatsAppPhone: string;
};

export function CartPageClient({
  freeDeliveryThresholdRub,
  whatsAppPhone
}: CartPageClientProps) {
  const [cartHydrated, setCartHydrated] = useState(false);
  const [storedItems, setStoredItems] = useState<StoredCartItem[]>([]);
  const [resolvedCart, setResolvedCart] = useState(emptyResolvedCart);
  const [resolveState, setResolveState] = useState<ResolveState>("idle");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

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
    () => buildCartLines(storedItems, resolvedCart.items),
    [storedItems, resolvedCart.items]
  );
  const availableLines = lines.filter((line) => line.isAvailable);
  const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);
  const totalRub = availableLines.reduce(
    (sum, line) => sum + line.priceRub * line.quantity,
    0
  );
  const hasUnavailableItems = lines.some((line) => !line.isAvailable);
  const hasPriceChanges = lines.some((line) => line.priceChanged);
  const canOpenCheckout = availableLines.length > 0 && resolveState !== "loading";

  function updateCartQuantity(item: StoredCartItem | { productId: string; flavorId: string | null }, quantity: number) {
    setStoredItems((currentItems) => {
      if (quantity < 1) {
        return currentItems.filter(
          (currentItem) => getCartItemKey(currentItem) !== getCartItemKey(item)
        );
      }

      return currentItems.map((currentItem) =>
        getCartItemKey(currentItem) === getCartItemKey(item)
          ? {
              ...currentItem,
              quantity
            }
          : currentItem
      );
    });
  }

  function removeCartItem(item: { productId: string; flavorId: string | null }) {
    setStoredItems((currentItems) =>
      currentItems.filter(
        (currentItem) => getCartItemKey(currentItem) !== getCartItemKey(item)
      )
    );
  }

  if (!cartHydrated) {
    return (
      <section className="cartPageWorkspace" aria-label="Корзина">
        <CartEmptyState
          text="Товары появятся через несколько секунд."
          title="Корзина загружается"
        />
      </section>
    );
  }

  return (
    <section className="cartPageWorkspace" aria-label="Корзина">
      {resolveState === "loading" && lines.length > 0 ? (
        <p className="cartPageNotice">Обновляем корзину.</p>
      ) : null}

      {resolveState === "error" ? (
        <p className="cartPageAlert">
          Не удалось обновить корзину. Попробуйте обновить страницу позже.
        </p>
      ) : null}

      {resolvedCart.removedItems.length > 0 ? (
        <p className="cartPageAlert">
          Некоторые позиции больше не доступны в каталоге и удалены из корзины.
        </p>
      ) : null}

      {hasPriceChanges ? (
        <p className="cartPageAlert">Цены в корзине обновлены до актуальных.</p>
      ) : null}

      {hasUnavailableItems ? (
        <p className="cartPageAlert">
          Недоступные позиции не входят в сумму и не попадут в WhatsApp.
        </p>
      ) : null}

      {lines.length === 0 ? (
        <CartEmptyState
          text="Добавьте напитки из каталога, чтобы оформить заказ."
          title="Товары пока не выбраны"
        />
      ) : (
        <div className="cartPageGrid">
          <div className="cartPageItems" aria-label="Позиции корзины">
            <div className="cartPageToolbar">
              <div>
                <span>В корзине</span>
                <strong>{totalQuantity} уп</strong>
              </div>
              <button
                className="cartTextButton"
                onClick={() => setStoredItems([])}
                type="button"
              >
                Очистить
              </button>
            </div>

            <div className="cartPageList">
              {lines.map((line) => {
                const displayName = getCartLineDisplayName(line);
                const imageFailed = line.imageUrl
                  ? failedImages[line.imageUrl] ?? false
                  : false;

                return (
                  <article
                    className={
                      line.isAvailable
                        ? "cartPageItem"
                        : "cartPageItem cartPageItemUnavailable"
                    }
                    key={getCartItemKey(line)}
                  >
                    <div className="cartPageImageFrame">
                      {line.imageUrl && !imageFailed ? (
                        <Image
                          alt={displayName}
                          className="cartPageImage"
                          fill
                          onError={() =>
                            setFailedImages((current) =>
                              line.imageUrl
                                ? {
                                    ...current,
                                    [line.imageUrl]: true
                                  }
                                : current
                            )
                          }
                          sizes="96px"
                          src={line.imageUrl}
                          unoptimized
                        />
                      ) : (
                        <div className="cartPageImageFallback">Фото</div>
                      )}
                    </div>

                    <div className="cartPageItemInfo">
                      <div className="cartPageItemTitleRow">
                        <div>
                          <h2>{displayName}</h2>
                          <p>
                            {formatRub(line.priceRub)} за уп
                            {line.priceChanged && line.previousPriceRub
                              ? `, было ${formatRub(line.previousPriceRub)}`
                              : ""}
                          </p>
                        </div>
                        <button
                          aria-label={`Удалить ${displayName}`}
                          className="cartIconButton"
                          onClick={() => removeCartItem(line)}
                          type="button"
                        >
                          ×
                        </button>
                      </div>

                      {line.unavailableReason ? (
                        <p className="cartPageWarning">{line.unavailableReason}</p>
                      ) : null}

                      <div className="cartPageItemBottom">
                        <div
                          aria-label={`Количество ${displayName}`}
                          className="quantityStepper"
                        >
                          <button
                            aria-label={`Уменьшить ${displayName}`}
                            onClick={() => updateCartQuantity(line, line.quantity - 1)}
                            type="button"
                          >
                            -
                          </button>
                          <span>{line.quantity} уп</span>
                          <button
                            aria-label={`Увеличить ${displayName}`}
                            onClick={() => updateCartQuantity(line, line.quantity + 1)}
                            type="button"
                          >
                            +
                          </button>
                        </div>

                        <strong>
                          {line.isAvailable
                            ? formatRub(line.priceRub * line.quantity)
                            : "Не входит в сумму"}
                        </strong>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <aside className="cartPageSummary" aria-label="Итоги корзины">
            <div>
              <span>Итого к оплате</span>
              <strong>{formatRub(totalRub)}</strong>
            </div>
            <p>
              {availableLines.length > 0
                ? getDeliveryHint(totalRub, freeDeliveryThresholdRub)
                : "В корзине нет доступных позиций."}
            </p>

            <button
              className="checkoutButton"
              disabled={!canOpenCheckout}
              onClick={() => setIsCheckoutOpen(true)}
              type="button"
            >
              Оформить заказ
            </button>

            <Link className="continueShoppingButton" href="/">
              Продолжить покупки
            </Link>
          </aside>
        </div>
      )}

      {isCheckoutOpen ? (
        <CheckoutModal
          freeDeliveryThresholdRub={freeDeliveryThresholdRub}
          onClose={() => setIsCheckoutOpen(false)}
          setStoredItems={setStoredItems}
          storedItems={storedItems}
          whatsAppPhone={whatsAppPhone}
        />
      ) : null}
    </section>
  );
}

function CartEmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="cartPageEmpty">
      <h2>{title}</h2>
      <p>{text}</p>
      <Link className="continueShoppingButton" href="/">
        Вернуться к каталогу
      </Link>
    </div>
  );
}
