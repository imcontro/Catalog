import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { AdminSortableList } from "@/components/admin/AdminSortableList";
import { requireAdminSession } from "@/server/admin/session";
import {
  getAdminProductCategories,
  getAdminProductsForAllDrinksSorting
} from "@/server/admin/products";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const statusLabels = {
  active: "Доступен",
  out_of_stock: "Нет в наличии",
  hidden: "Скрыт",
  draft: "Черновик"
} as const;

export default async function AdminAllDrinksSortingPage() {
  await requireAdminSession();

  const [categories, products] = await Promise.all([
    getAdminProductCategories(),
    getAdminProductsForAllDrinksSorting()
  ]);

  return (
    <main className="adminPage">
      <section className="adminShell" aria-labelledby="admin-sorting-title">
        <header className="adminHeader">
          <BrandLogo compact />
          <div>
            <p className="sectionKicker">Админка</p>
            <h1 id="admin-sorting-title">Сортировка</h1>
            <p>Настройте порядок показа товаров. Общий список и категории сохраняются отдельно.</p>
          </div>
          <AdminLogoutButton />
        </header>

        <nav className="adminTabs" aria-label="Разделы каталога">
          <Link href="/admin/products">Товары</Link>
          <Link href="/admin/drafts">Черновики</Link>
          <Link href="/admin/hidden">Скрытые</Link>
          <Link href="/admin/categories">Категории</Link>
          <Link className="adminTabActive" href="/admin/sorting/all">
            Сортировка
          </Link>
        </nav>

        <SortingCategoryLinks categories={categories} selectedCategoryId="" />

        <AdminSortableList
          description="Перетащите товары в порядке, который клиент увидит в фильтре Все напитки. Этот порядок не меняет порядок внутри отдельных категорий."
          emptyText="Добавьте товары, чтобы настроить порядок в общем фильтре."
          emptyTitle="Товаров пока нет"
          endpoint="/api/admin/products/reorder-all"
          items={products.map((product) => ({
            id: product.id,
            title: capitalizeDisplayName(product.name),
            subtitle: product.categoryName
              ? `Категория: ${capitalizeDisplayName(product.categoryName)}`
              : "Категория не выбрана",
            badge: statusLabels[product.status],
            imageUrl: product.imageUrl,
            meta: `Позиция ${product.sortOrder + 1}`
          }))}
          successMessage="Порядок товаров в Все напитки сохранен."
          title="Все напитки"
        />
      </section>
    </main>
  );
}

function SortingCategoryLinks({
  categories,
  selectedCategoryId
}: {
  categories: Awaited<ReturnType<typeof getAdminProductCategories>>;
  selectedCategoryId: string;
}) {
  return (
    <nav className="adminCategoryTabs" aria-label="Режимы сортировки">
      <Link className="adminCategoryChip" href="/admin/categories">
        Порядок категорий
      </Link>
      <Link
        className={
          selectedCategoryId
            ? "adminCategoryChip"
            : "adminCategoryChip adminCategoryChipActive"
        }
        href="/admin/sorting/all"
      >
        Все напитки
      </Link>
      {categories.map((category) => (
        <Link
          className={
            selectedCategoryId === category.id
              ? "adminCategoryChip adminCategoryChipActive"
              : "adminCategoryChip"
          }
          href={`/admin/sorting/category/${category.id}`}
          key={category.id}
        >
          {capitalizeDisplayName(category.name)}
        </Link>
      ))}
    </nav>
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
