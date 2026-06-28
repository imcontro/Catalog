import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { AdminSortableList } from "@/components/admin/AdminSortableList";
import { requireAdminSession } from "@/server/admin/session";
import {
  getAdminProductCategories,
  getAdminProductsForCategorySorting
} from "@/server/admin/products";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const statusLabels = {
  active: "Доступен",
  out_of_stock: "Нет в наличии",
  hidden: "Скрыт",
  draft: "Черновик"
} as const;

type AdminCategorySortingPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminCategorySortingPage({
  params
}: AdminCategorySortingPageProps) {
  await requireAdminSession();

  const { id } = await params;
  const categories = await getAdminProductCategories();
  const selectedCategory = categories.find((category) => category.id === id);

  if (!selectedCategory) {
    notFound();
  }

  const products = await getAdminProductsForCategorySorting(id);
  const categoryName = capitalizeDisplayName(selectedCategory.name);

  return (
    <main className="adminPage">
      <section className="adminShell" aria-labelledby="admin-sorting-title">
        <header className="adminHeader">
          <BrandLogo compact />
          <div>
            <p className="sectionKicker">Админка</p>
            <h1 id="admin-sorting-title">Сортировка</h1>
            <p>Настройте порядок товаров внутри выбранной категории. Это не меняет общий список Все напитки.</p>
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

        <SortingCategoryLinks categories={categories} selectedCategoryId={id} />

        <AdminSortableList
          description={`Перетащите товары в порядке, который клиент увидит внутри категории ${categoryName}. Этот порядок не меняет общий порядок Все напитки.`}
          emptyText="Добавьте или перенесите товары в эту категорию, чтобы настроить их порядок."
          emptyTitle="В этой категории нет товаров"
          endpoint={`/api/admin/categories/${id}/products/reorder`}
          items={products.map((product) => ({
            id: product.id,
            title: capitalizeDisplayName(product.name),
            subtitle: `Категория: ${categoryName}`,
            badge: statusLabels[product.status],
            imageUrl: product.imageUrl,
            meta: `Позиция ${product.sortOrder + 1}`
          }))}
          successMessage={`Порядок товаров в категории ${categoryName} сохранен.`}
          title={`Категория: ${categoryName}`}
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
