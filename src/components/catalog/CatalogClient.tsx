"use client";

import Image from "next/image";
import Link from "next/link";
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
  const [, setCartResolveState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");

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

  function updateCartQuantity(item: CartItemIdentity, quantity: number) {
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

  const cartLines = useMemo(
    () => buildCartLines(cartItems, resolvedCart.items),
    [cartItems, resolvedCart.items]
  );
  const cartQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotalRub = cartLines
    .filter((line) => line.isAvailable)
    .reduce((sum, line) => sum + line.priceRub * line.quantity, 0);

  if (loadState === "loading") {
    return (
      <section className="catalogWorkspace" aria-label="Каталог напитков">
        <CatalogLoadingState />
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
        <div className="paperCatalogHeader">
          <span aria-hidden="true" className="paperHeaderSpacer" />
          <div className="paperBrandTitle">
            <Image
              alt="NapitkiBerkat"
              className="paperBrandLogo"
              height={72}
              priority
              src="/brand/logo-napitki-berkat.jpg"
              width={160}
            />
          </div>
          <CartTopIconButton quantity={cartQuantity} />
          <h1 className="paperCatalogTitle">NapitkiBerkat</h1>
        </div>

        <div className="catalogControls">
          <label className="searchField">
            <span>Поиск</span>
            <svg
              aria-hidden="true"
              className="searchIcon"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle cx="10.8" cy="10.8" r="5.8" />
              <path d="m15.2 15.2 4.1 4.1" strokeLinecap="round" />
            </svg>
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

          <div className="categoryScroller">
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
            <span aria-hidden="true" className="categoryHint">
              ›
            </span>
          </div>
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
        <CartFloatingButton quantity={cartQuantity} totalRub={cartTotalRub} />
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
            sizes="(max-width: 800px) 42vw, 240px"
            src={imageUrl}
            unoptimized
          />
        ) : (
          <div className="productImageFallback">Фото не загрузилось</div>
        )}
        {!isCardOrderable ? <span className="stockBadge">Нет в наличии</span> : null}
      </div>

      <div className="productInfo">
        <div className="productPrice">{formatRub(priceRub)}</div>

        <div className="productTitleRow">
          <h2>
            <ProductNameWithFlavor
              flavorName={selectedFlavor?.name ?? null}
              name={product.name}
            />
          </h2>
          <div className="productMetaLine">
            <span className="productPackQuantity">{product.packQuantity} шт в уп</span>
          </div>
        </div>

        {product.hasFlavorChoice ? (
          <label className="flavorBlock">
            <span>Вкус</span>
            <select
              className="flavorSelect"
              onChange={(event) => onSelectFlavor(event.currentTarget.value)}
              value={selectedFlavor?.id ?? ""}
            >
              {product.flavors.map((flavor) => (
                <option
                  disabled={!flavor.isOrderable}
                  key={flavor.id}
                  value={flavor.id}
                >
                  {capitalizeDisplayName(flavor.name)}
                </option>
              ))}
            </select>
          </label>
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

function ProductNameWithFlavor({
  name,
  flavorName
}: {
  flavorName: string | null;
  name: string;
}) {
  return (
    <>
      {capitalizeDisplayName(name)}
      {flavorName ? (
        <span className="productSelectedFlavor">
          {" "}
          / {capitalizeDisplayName(flavorName)}
        </span>
      ) : null}
    </>
  );
}

function CartTopIconButton({ quantity }: { quantity: number }) {
  return (
    <Link
      aria-label={
        quantity > 0
          ? `Открыть корзину, выбрано ${quantity} уп`
          : "Открыть корзину"
      }
      className="cartTopIconButton"
      href="/cart"
    >
      <CartIcon />
      {quantity > 0 ? (
        <span className="cartFloatingBadge" aria-hidden="true">
          {quantity}
        </span>
      ) : null}
    </Link>
  );
}

function CartFloatingButton({
  quantity,
  totalRub
}: {
  quantity: number;
  totalRub: number;
}) {
  return (
    <Link
      aria-label={`Перейти в корзину, выбрано ${quantity} уп`}
      className="cartFloatingButton"
      href="/cart"
    >
      <CartIcon className="cartFloatingSvg" />
      <span className="cartFloatingText">Корзина</span>
      <span className="cartFloatingQuantity">
        {quantity} уп · {formatRub(totalRub)}
      </span>
    </Link>
  );
}

function CartIcon({ className = "cartSvg" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
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
  );
}

function CatalogLoadingState() {
  return (
    <div className="catalogStateCard catalogStateCardWide" aria-live="polite">
      <div className="catalogStateTopLine">
        <span className="catalogStateBadge">Загрузка</span>
        <span className="catalogStateSpinner" aria-hidden="true" />
      </div>
      <h2>Загружаем каталог</h2>
      <p>Подготавливаем напитки, цены и доступные вкусы.</p>
      <div className="catalogLoadingChips" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="catalogLoadingGrid" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="catalogLoadingProductCard" key={index}>
            <span />
            <strong />
            <em />
            <b />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyCatalog({ title, text }: { title: string; text: string }) {
  return (
    <div className="emptyCatalog catalogStateCard">
      <span className="catalogStateIconMuted" aria-hidden="true">
        0
      </span>
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
