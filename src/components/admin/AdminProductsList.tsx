import Image from "next/image";
import Link from "next/link";
import type { AdminProductListItem, AdminProductListKind } from "@/server/admin/products";

type AdminProductsListProps = {
  title: string;
  description: string;
  kind: AdminProductListKind;
  products: AdminProductListItem[];
  searchQuery?: string;
};

const statusLabels: Record<AdminProductListItem["status"], string> = {
  active: "Доступен",
  out_of_stock: "Нет в наличии",
  hidden: "Скрыт",
  draft: "Черновик"
};

export function AdminProductsList({
  title,
  description,
  kind,
  products,
  searchQuery = ""
}: AdminProductsListProps) {
  const showSearch = kind === "products";
  const emptyTitle = searchQuery
    ? "По этому запросу ничего не найдено"
    : getEmptyTitle(kind);

  return (
    <section className="adminListSection" aria-labelledby="admin-products-title">
      <div className="adminListHeader">
        <div>
          <p className="sectionKicker">Управление каталогом</p>
          <h1 id="admin-products-title">{title}</h1>
          <p>{description}</p>
        </div>
        <span className="adminCountBadge">{products.length} поз.</span>
      </div>

      <nav className="adminTabs" aria-label="Разделы товаров">
        <Link className={kind === "products" ? "adminTabActive" : ""} href="/admin/products">
          Товары
        </Link>
        <Link className={kind === "drafts" ? "adminTabActive" : ""} href="/admin/drafts">
          Черновики
        </Link>
        <Link className={kind === "hidden" ? "adminTabActive" : ""} href="/admin/hidden">
          Скрытые
        </Link>
      </nav>

      {showSearch ? (
        <form action="/admin/products" className="adminSearchForm">
          <label>
            <span>Поиск товара</span>
            <input
              defaultValue={searchQuery}
              maxLength={120}
              name="q"
              placeholder="Например: кола"
              type="search"
            />
          </label>
          <button type="submit">Найти</button>
          {searchQuery ? (
            <Link className="adminResetSearch" href="/admin/products">
              Сбросить
            </Link>
          ) : null}
        </form>
      ) : null}

      {products.length > 0 ? (
        <div className="adminProductList">
          {products.map((product) => (
            <article className="adminProductRow" key={product.id}>
              <div className="adminProductImageFrame">
                {product.imageUrl ? (
                  <Image
                    alt={product.name}
                    className="adminProductImage"
                    height={72}
                    src={product.imageUrl}
                    width={72}
                  />
                ) : (
                  <span>Нет фото</span>
                )}
              </div>

              <div className="adminProductMain">
                <h2>{capitalizeDisplayName(product.name)}</h2>
                <p>{product.categoryName ?? "Категория не выбрана"}</p>
              </div>

              <div className="adminProductMeta">
                <span>{formatNullableRub(product.priceRub)}</span>
                <span>{formatPackQuantity(product.packQuantity)}</span>
              </div>

              <div className="adminProductFlags">
                <span className={`adminStatus adminStatus-${product.status}`}>
                  {statusLabels[product.status]}
                </span>
                <span>{product.hasFlavorChoice ? "Есть вкусы" : "Без вкусов"}</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="adminEmptyState">
          <h2>{emptyTitle}</h2>
          <p>{getEmptyDescription(kind, searchQuery)}</p>
        </div>
      )}
    </section>
  );
}

function getEmptyTitle(kind: AdminProductListKind) {
  if (kind === "drafts") {
    return "Черновиков нет";
  }

  if (kind === "hidden") {
    return "Скрытых товаров нет";
  }

  return "Товаров пока нет";
}

function getEmptyDescription(kind: AdminProductListKind, searchQuery: string) {
  if (searchQuery) {
    return "Проверьте название или сбросьте поиск, чтобы увидеть весь список товаров.";
  }

  if (kind === "drafts") {
    return "Здесь появятся товары, которые сохранены как черновики.";
  }

  if (kind === "hidden") {
    return "Здесь появятся товары, которые скрыты из клиентского каталога.";
  }

  return "Обычный список показывает только активные товары и товары нет в наличии.";
}

function formatNullableRub(value: number | null) {
  return value ? `${value.toLocaleString("ru-RU")} руб.` : "Цена не указана";
}

function formatPackQuantity(value: number | null) {
  return value ? `${value} шт в уп` : "Упаковка не указана";
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
