"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type {
  ClientCatalogData,
  ClientCatalogFlavor,
  ClientCatalogProduct
} from "@/types/client-catalog";

const allDrinksId = "all";
const emptyCatalogData: ClientCatalogData = {
  categories: [],
  products: []
};

type CatalogClientProps = {
  catalog?: ClientCatalogData;
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
      </div>

      {visibleProducts.length > 0 ? (
        <div className="productGrid">
          {visibleProducts.map((product) => (
            <ProductCard
              failedImages={failedImages}
              key={product.id}
              onImageError={(imageUrl) =>
                setFailedImages((current) => ({
                  ...current,
                  [imageUrl]: true
                }))
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
          ))}
        </div>
      ) : (
        <EmptyCatalog title={emptyState.title} text={emptyState.text} />
      )}
    </section>
  );
}

function ProductCard({
  product,
  selectedFlavorId,
  failedImages,
  onSelectFlavor,
  onImageError
}: {
  product: ClientCatalogProduct;
  selectedFlavorId: string | undefined;
  failedImages: Record<string, boolean>;
  onSelectFlavor: (flavorId: string) => void;
  onImageError: (imageUrl: string) => void;
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

        <div className="productState">
          {isCardOrderable ? "Доступен для заказа" : "Временно нет в наличии"}
        </div>
      </div>
    </article>
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
