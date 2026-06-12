"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type {
  ClientCatalogData,
  ClientCatalogFlavor,
  ClientCatalogProduct
} from "@/types/client-catalog";
import type {
  CartResolveResponse,
  ResolvedCartItem,
  StoredCartItem
} from "@/types/cart";

const allDrinksId = "all";
const cartStorageKey = "napitki_berkat_cart";
const freeDeliveryThresholdRub = 8000;
const emptyCatalogData: ClientCatalogData = {
  categories: [],
  products: []
};
const emptyResolvedCart: CartResolveResponse = {
  items: [],
  removedItems: []
};

type CatalogClientProps = {
  catalog?: ClientCatalogData;
};

type CartItemIdentity = {
  productId: string;
  flavorId: string | null;
};

type CartLine = CartItemIdentity & {
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

export function CatalogClient({ catalog: initialCatalog }: CatalogClientProps) {
  const [catalog, setCatalog] = useState<ClientCatalogData>(
    initialCatalog ?? emptyCatalogData
  );
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    initialCatalog ? "ready" : "loading"
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState(allDrinksId);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFlavorByProductId, setSelectedFlavorByProductId] = useState<
    Record<string, string>
  >({});
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [cartHydrated, setCartHydrated] = useState(false);
  const [cartItems, setCartItems] = useState<StoredCartItem[]>([]);
  const [resolvedCart, setResolvedCart] =
    useState<CartResolveResponse>(emptyResolvedCart);
  const [cartResolveState, setCartResolveState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    if (initialCatalog) {
      return;
    }

    const controller = new AbortController();

    async function loadCatalog() {
      try {
        const response = await fetch("/api/catalog", {
          cache: "no-store",
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error("Catalog request failed");
        }

        const nextCatalog = (await response.json()) as ClientCatalogData;

        setCatalog(nextCatalog);
        setLoadState("ready");
      } catch {
        if (!controller.signal.aborted) {
          setLoadState("error");
        }
      }
    }

    loadCatalog();

    return () => controller.abort();
  }, [initialCatalog]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const categoryId = params.get("category");
    const search = params.get("search") ?? "";
    const categoryExists = catalog.categories.some((category) => category.id === categoryId);

    setSelectedCategoryId(categoryId && categoryExists ? categoryId : allDrinksId);
    setSearchQuery(search);
  }, [catalog.categories]);

  useEffect(() => {
    setCartItems(readStoredCartItems());
    setCartHydrated(true);
  }, []);

  useEffect(() => {
    if (!cartHydrated) {
      return;
    }

    if (cartItems.length === 0) {
      window.localStorage.removeItem(cartStorageKey);
      return;
    }

    window.localStorage.setItem(cartStorageKey, JSON.stringify(cartItems));
  }, [cartHydrated, cartItems]);

  useEffect(() => {
    if (!cartHydrated) {
      return;
    }

    if (cartItems.length === 0) {
      setResolvedCart(emptyResolvedCart);
      setCartResolveState("idle");
      return;
    }

    const controller = new AbortController();

    async function resolveCart() {
      setCartResolveState("loading");

      try {
        const response = await fetch("/api/cart/resolve", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            items: cartItems
          }),
          cache: "no-store",
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error("Cart resolve failed");
        }

        const nextResolvedCart = (await response.json()) as CartResolveResponse;

        setResolvedCart(nextResolvedCart);
        setCartResolveState("ready");

        if (nextResolvedCart.removedItems.length > 0) {
          setCartItems((currentItems) =>
            currentItems.filter(
              (item) =>
                !nextResolvedCart.removedItems.some(
                  (removedItem) => getCartItemKey(removedItem) === getCartItemKey(item)
                )
            )
          );
        }
      } catch {
        if (!controller.signal.aborted) {
          setCartResolveState("error");
        }
      }
    }

    resolveCart();

    return () => controller.abort();
  }, [cartHydrated, cartItems]);

  const selectedCategory = catalog.categories.find(
    (category) => category.id === selectedCategoryId
  );
  const visibleProducts = useMemo(
    () => filterAndSortProducts(catalog.products, selectedCategoryId, searchQuery),
    [catalog.products, selectedCategoryId, searchQuery]
  );
  const emptyState = getEmptyState({
    totalProducts: catalog.products.length,
    selectedCategoryName: selectedCategory
      ? capitalizeDisplayName(selectedCategory.name)
      : undefined,
    searchQuery
  });

  function updateCatalogState(nextCategoryId: string, nextSearchQuery: string) {
    setSelectedCategoryId(nextCategoryId);
    setSearchQuery(nextSearchQuery);
    updateCatalogUrl(nextCategoryId, nextSearchQuery);
  }

  function addProductToCart(
    product: ClientCatalogProduct,
    selectedFlavor: ClientCatalogFlavor | undefined
  ) {
    const priceRub = selectedFlavor?.priceRub ?? product.priceRub;
    const flavorId = selectedFlavor?.id ?? null;
    const nextSnapshot: Omit<StoredCartItem, "quantity" | "addedAt"> = {
      productId: product.id,
      flavorId,
      snapshotName: product.name,
      snapshotFlavorName: selectedFlavor?.name ?? null,
      snapshotPriceRub: priceRub
    };

    setCartItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => getCartItemKey(item) === getCartItemKey(nextSnapshot)
      );

      if (existingItem) {
        return currentItems.map((item) =>
          getCartItemKey(item) === getCartItemKey(nextSnapshot)
            ? {
                ...item,
                ...nextSnapshot,
                quantity: item.quantity + 1
              }
            : item
        );
      }

      return [
        ...currentItems,
        {
          ...nextSnapshot,
          quantity: 1,
          addedAt: new Date().toISOString()
        }
      ];
    });
  }

  function updateCartQuantity(item: StoredCartItem | ResolvedCartItem, quantity: number) {
    setCartItems((currentItems) => {
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

  function removeCartItem(item: StoredCartItem | ResolvedCartItem) {
    setCartItems((currentItems) =>
      currentItems.filter(
        (currentItem) => getCartItemKey(currentItem) !== getCartItemKey(item)
      )
    );
  }

  const cartLines = useMemo(
    () => buildCartLines(cartItems, resolvedCart.items),
    [cartItems, resolvedCart.items]
  );
  const cartQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  if (loadState === "loading") {
    return (
      <section className="catalogWorkspace" aria-label="Каталог напитков">
        <EmptyCatalog
          title="Каталог загружается"
          text="Товары появятся через несколько секунд."
        />
      </section>
    );
  }

  if (loadState === "error") {
    return (
      <section className="catalogWorkspace" aria-label="Каталог напитков">
        <EmptyCatalog
          title="Каталог не загрузился"
          text="Попробуйте обновить страницу позже."
        />
      </section>
    );
  }

  return (
    <section className="catalogWorkspace" aria-label="Каталог напитков">
      <div className="catalogMain">
        <div className="catalogControls">
          <div className="categoryRail" aria-label="Категории напитков">
            <button
              className={
                selectedCategoryId === allDrinksId
                  ? "categoryChip categoryChipActive"
                  : "categoryChip"
              }
              onClick={() => updateCatalogState(allDrinksId, searchQuery)}
              type="button"
            >
              Все напитки
            </button>
            {catalog.categories.map((category) => (
              <button
                className={
                  selectedCategoryId === category.id
                    ? "categoryChip categoryChipActive"
                    : "categoryChip"
                }
                key={category.id}
                onClick={() => updateCatalogState(category.id, searchQuery)}
                type="button"
              >
                {capitalizeDisplayName(category.name)}
              </button>
            ))}
          </div>

          <label className="searchField">
            <span>Поиск</span>
            <input
              autoComplete="off"
              onChange={(event) =>
                updateCatalogState(selectedCategoryId, event.currentTarget.value)
              }
              placeholder="Найти напиток"
              type="search"
              value={searchQuery}
            />
          </label>
        </div>

        <div className="catalogMeta" aria-live="polite">
          <strong>
            {selectedCategoryId === allDrinksId
              ? "Все напитки"
              : selectedCategory
                ? capitalizeDisplayName(selectedCategory.name)
                : "Категория"}
          </strong>
          {cartQuantity > 0 ? <span>В корзине {cartQuantity} уп</span> : null}
        </div>

        {visibleProducts.length > 0 ? (
          <div className="productGrid">
            {visibleProducts.map((product) => {
              const selectedFlavor = getSelectedFlavor(
                product,
                selectedFlavorByProductId[product.id]
              );
              const cartLine = cartLines.find(
                (line) =>
                  line.productId === product.id &&
                  line.flavorId === (selectedFlavor?.id ?? null)
              );

              return (
                <ProductCard
                  cartLine={cartLine}
                  failedImages={failedImages}
                  key={product.id}
                  onAddToCart={addProductToCart}
                  onDecreaseCartLine={(line) =>
                    updateCartQuantity(line, line.quantity - 1)
                  }
                  onImageError={(imageUrl) =>
                    setFailedImages((current) => ({
                      ...current,
                      [imageUrl]: true
                    }))
                  }
                  onIncreaseCartLine={(line) =>
                    updateCartQuantity(line, line.quantity + 1)
                  }
                  onSelectFlavor={(flavorId) =>
                    setSelectedFlavorByProductId((current) => ({
                      ...current,
                      [product.id]: flavorId
                    }))
                  }
                  product={product}
                  selectedFlavorId={selectedFlavorByProductId[product.id]}
                />
              );
            })}
          </div>
        ) : (
          <EmptyCatalog title={emptyState.title} text={emptyState.text} />
        )}
      </div>

      {cartQuantity > 0 ? (
        <CartFloatingButton
          quantity={cartQuantity}
          onClick={() => setIsCartOpen(true)}
        />
      ) : null}

      {isCartOpen ? (
        <div className="cartOverlay" onClick={() => setIsCartOpen(false)}>
          <CartPanel
            cartHydrated={cartHydrated}
            lines={cartLines}
            onClearCart={() => setCartItems([])}
            onClose={() => setIsCartOpen(false)}
            onDecrease={(line) => updateCartQuantity(line, line.quantity - 1)}
            onIncrease={(line) => updateCartQuantity(line, line.quantity + 1)}
            onRemove={removeCartItem}
            resolveState={cartResolveState}
          />
        </div>
      ) : null}
    </section>
  );
}

function ProductCard({
  product,
  selectedFlavorId,
  cartLine,
  failedImages,
  onSelectFlavor,
  onImageError,
  onAddToCart,
  onIncreaseCartLine,
  onDecreaseCartLine
}: {
  product: ClientCatalogProduct;
  selectedFlavorId: string | undefined;
  cartLine: CartLine | undefined;
  failedImages: Record<string, boolean>;
  onSelectFlavor: (flavorId: string) => void;
  onImageError: (imageUrl: string) => void;
  onAddToCart: (
    product: ClientCatalogProduct,
    selectedFlavor: ClientCatalogFlavor | undefined
  ) => void;
  onIncreaseCartLine: (line: CartLine) => void;
  onDecreaseCartLine: (line: CartLine) => void;
}) {
  const selectedFlavor = getSelectedFlavor(product, selectedFlavorId);
  const imageUrl = selectedFlavor?.imageUrl ?? product.imageUrl;
  const failedImage = failedImages[imageUrl] ?? false;
  const priceRub = selectedFlavor?.priceRub ?? product.priceRub;
  const isSelectedFlavorOrderable = selectedFlavor?.isOrderable ?? product.isOrderable;
  const isCardOrderable = product.isOrderable && isSelectedFlavorOrderable;

  return (
    <article className={isCardOrderable ? "productCard" : "productCard productCardMuted"}>
      <div className="productImageFrame">
        {!failedImage ? (
          <Image
            alt={capitalizeDisplayName(product.name)}
            className="productImage"
            fill
            key={imageUrl}
            loading="lazy"
            onError={() => onImageError(imageUrl)}
            sizes="(max-width: 800px) calc(100vw - 28px), 280px"
            src={imageUrl}
            unoptimized
          />
        ) : (
          <div className="productImageFallback">Фото не загрузилось</div>
        )}
        {!isCardOrderable ? <span className="stockBadge">Нет в наличии</span> : null}
      </div>

      <div className="productInfo">
        <div className="productTitleRow">
          <h2>
            {capitalizeDisplayName(product.name)}
            {selectedFlavor ? (
              <span className="productSelectedFlavor">
                {" "}
                / {capitalizeDisplayName(selectedFlavor.name)}
              </span>
            ) : null}
          </h2>
          <span className="productPackQuantity">{product.packQuantity} шт в уп</span>
        </div>

        <div className="productPrice">{formatRub(priceRub)}</div>

        {product.hasFlavorChoice ? (
          <div className="flavorBlock">
            <span>Вкус</span>
            <div className="flavorList">
              {product.flavors.map((flavor) => (
                <button
                  aria-pressed={selectedFlavor?.id === flavor.id}
                  className={
                    selectedFlavor?.id === flavor.id
                      ? "flavorChip flavorChipActive"
                      : "flavorChip"
                  }
                  disabled={!flavor.isOrderable}
                  key={flavor.id}
                  onClick={() => onSelectFlavor(flavor.id)}
                  type="button"
                >
                  {capitalizeDisplayName(flavor.name)}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="productActions">
          <span>
            {cartLine
              ? "Выбрано в заказ"
              : isCardOrderable
                ? "Доступен для заказа"
                : "Временно нет в наличии"}
          </span>
          {cartLine ? (
            <div className="productQuantityControl" aria-label="Количество в заказе">
              <button
                aria-label="Уменьшить количество"
                onClick={() => onDecreaseCartLine(cartLine)}
                type="button"
              >
                -
              </button>
              <strong>{cartLine.quantity} уп</strong>
              <button
                aria-label="Увеличить количество"
                disabled={!cartLine.isAvailable}
                onClick={() => onIncreaseCartLine(cartLine)}
                type="button"
              >
                +
              </button>
            </div>
          ) : (
            <button
              className="addToCartButton"
              disabled={!isCardOrderable}
              onClick={() => onAddToCart(product, selectedFlavor)}
              type="button"
            >
              {isCardOrderable ? "В корзину" : "Нет в наличии"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function CartFloatingButton({
  quantity,
  onClick
}: {
  quantity: number;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={`Открыть корзину, выбрано ${quantity} уп`}
      className="cartFloatingButton"
      onClick={onClick}
      type="button"
    >
      <span className="cartFloatingIcon" aria-hidden="true" />
      <span className="cartFloatingBadge" aria-hidden="true">
        {quantity}
      </span>
    </button>
  );
}

function CartPanel({
  cartHydrated,
  lines,
  resolveState,
  onIncrease,
  onDecrease,
  onRemove,
  onClearCart,
  onClose
}: {
  cartHydrated: boolean;
  lines: CartLine[];
  resolveState: "idle" | "loading" | "ready" | "error";
  onIncrease: (line: CartLine) => void;
  onDecrease: (line: CartLine) => void;
  onRemove: (line: CartLine) => void;
  onClearCart: () => void;
  onClose: () => void;
}) {
  const availableLines = lines.filter((line) => line.isAvailable);
  const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);
  const totalRub = availableLines.reduce(
    (sum, line) => sum + line.priceRub * line.quantity,
    0
  );
  const hasUnavailableItems = lines.some((line) => !line.isAvailable);
  const hasPriceChanges = lines.some((line) => line.priceChanged);

  return (
    <aside
      aria-label="Корзина"
      aria-modal="true"
      className="cartPanel"
      onClick={(event) => event.stopPropagation()}
      role="dialog"
    >
      <div className="cartHeader">
        <div>
          <span>Заказ</span>
          <h2>Корзина</h2>
        </div>
        <div className="cartHeaderActions">
          <strong>{totalQuantity} уп</strong>
          <button className="cartCloseButton" onClick={onClose} type="button">
            Закрыть
          </button>
        </div>
      </div>

      {resolveState === "loading" && lines.length > 0 ? (
        <p className="cartSyncState">Обновляем корзину.</p>
      ) : null}

      {resolveState === "error" ? (
        <p className="cartAlert">Не удалось обновить корзину. Попробуйте позже.</p>
      ) : null}

      {hasPriceChanges ? (
        <p className="cartAlert">Цены в корзине обновлены до актуальных.</p>
      ) : null}

      {hasUnavailableItems ? (
        <p className="cartAlert">
          Недоступные позиции не входят в сумму товаров.
        </p>
      ) : null}

      {!cartHydrated ? (
        <div className="cartEmpty">
          <h3>Корзина загружается</h3>
          <p>Товары появятся через несколько секунд.</p>
        </div>
      ) : lines.length === 0 ? (
        <div className="cartEmpty">
          <h3>Товары пока не выбраны</h3>
          <p>Добавьте товары из каталога.</p>
        </div>
      ) : (
        <>
          <div className="cartList">
            {lines.map((line) => {
              const displayName = getCartLineDisplayName(line);

              return (
                <article
                  className={
                    line.isAvailable ? "cartItem" : "cartItem cartItemUnavailable"
                  }
                  key={getCartItemKey(line)}
                >
                  <div className="cartItemTitleRow">
                    <h3>{displayName}</h3>
                    <button
                      aria-label={`Удалить ${displayName}`}
                      className="cartRemoveButton"
                      onClick={() => onRemove(line)}
                      type="button"
                    >
                      Удалить
                    </button>
                  </div>

                  <div className="cartItemMeta">
                    <span>{formatRub(line.priceRub)} за уп</span>
                    {line.priceChanged && line.previousPriceRub ? (
                      <span>Было {formatRub(line.previousPriceRub)}</span>
                    ) : null}
                  </div>

                  {line.unavailableReason ? (
                    <p className="cartItemWarning">{line.unavailableReason}</p>
                  ) : null}

                  <div className="cartItemBottom">
                    <div className="quantityStepper" aria-label={`Количество ${displayName}`}>
                      <button
                        aria-label={`Уменьшить ${displayName}`}
                        onClick={() => onDecrease(line)}
                        type="button"
                      >
                        -
                      </button>
                      <span>{line.quantity} уп</span>
                      <button
                        aria-label={`Увеличить ${displayName}`}
                        onClick={() => onIncrease(line)}
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
                </article>
              );
            })}
          </div>

          <div className="cartTotals">
            <div>
              <span>Сумма товаров</span>
              <strong>{formatRub(totalRub)}</strong>
            </div>
            {availableLines.length > 0 ? (
              <p>{getDeliveryHint(totalRub)}</p>
            ) : null}
          </div>

          <button className="clearCartButton" onClick={onClearCart} type="button">
            Очистить корзину
          </button>
        </>
      )}
    </aside>
  );
}

function EmptyCatalog({ title, text }: { title: string; text: string }) {
  return (
    <div className="emptyCatalog">
      <span className="emptyMarker" aria-hidden="true" />
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}

function filterAndSortProducts(
  products: ClientCatalogProduct[],
  selectedCategoryId: string,
  searchQuery: string
) {
  const normalizedQuery = normalizeSearchText(searchQuery);
  const isAllDrinks = selectedCategoryId === allDrinksId;

  return products
    .filter((product) => isAllDrinks || product.categoryId === selectedCategoryId)
    .filter((product) => {
      if (!normalizedQuery) {
        return true;
      }

      return normalizeSearchText(product.name).includes(normalizedQuery);
    })
    .sort((first, second) => {
      const firstOrder = isAllDrinks
        ? first.allDrinksSortOrder
        : first.categorySortOrder;
      const secondOrder = isAllDrinks
        ? second.allDrinksSortOrder
        : second.categorySortOrder;

      return firstOrder - secondOrder || first.name.localeCompare(second.name);
    });
}

function getSelectedFlavor(
  product: ClientCatalogProduct,
  selectedFlavorId: string | undefined
): ClientCatalogFlavor | undefined {
  if (!product.hasFlavorChoice) {
    return undefined;
  }

  return (
    product.flavors.find((flavor) => flavor.id === selectedFlavorId) ??
    product.flavors[0]
  );
}

function buildCartLines(
  storedItems: StoredCartItem[],
  resolvedItems: ResolvedCartItem[]
): CartLine[] {
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

function getCartItemKey(item: CartItemIdentity) {
  return `${item.productId}:${item.flavorId ?? ""}`;
}

function getCartLineDisplayName(line: CartLine) {
  const name = capitalizeDisplayName(line.name);
  const flavorName = line.flavorName ? capitalizeDisplayName(line.flavorName) : "";

  return flavorName ? `${name} / ${flavorName}` : name;
}

function getDeliveryHint(totalRub: number) {
  if (totalRub >= freeDeliveryThresholdRub) {
    return "Доставка: бесплатно по г. Грозный";
  }

  return `До бесплатной доставки по г. Грозный осталось ${formatRub(
    freeDeliveryThresholdRub - totalRub
  )}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function normalizeSearchText(value: string) {
  return value.trim().toLocaleLowerCase("ru-RU");
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

function updateCatalogUrl(categoryId: string, searchQuery: string) {
  const params = new URLSearchParams();
  const normalizedSearchQuery = searchQuery.trim();

  if (categoryId !== allDrinksId) {
    params.set("category", categoryId);
  }

  if (normalizedSearchQuery) {
    params.set("search", normalizedSearchQuery);
  }

  const queryString = params.toString();
  const nextUrl = queryString ? `/?${queryString}` : "/";

  window.history.replaceState(null, "", nextUrl);
}

function formatRub(value: number) {
  return `${value.toLocaleString("ru-RU")} руб.`;
}

function getEmptyState({
  totalProducts,
  selectedCategoryName,
  searchQuery
}: {
  totalProducts: number;
  selectedCategoryName: string | undefined;
  searchQuery: string;
}) {
  if (totalProducts === 0) {
    return {
      title: "Товаров пока нет",
      text: "Владелец может добавить товары через админку."
    };
  }

  if (searchQuery.trim()) {
    return {
      title: "По этому названию ничего не найдено",
      text: "Можно изменить запрос или выбрать другую категорию."
    };
  }

  return {
    title: "В этой категории пока нет товаров",
    text: selectedCategoryName
      ? `Категория ${selectedCategoryName} пока пустая.`
      : "Можно вернуться к другим категориям."
  };
}
