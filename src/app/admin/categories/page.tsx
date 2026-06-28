import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { AdminCategoriesManager } from "@/components/admin/AdminCategoriesManager";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { AdminSortableList } from "@/components/admin/AdminSortableList";
import { requireAdminSession } from "@/server/admin/session";
import { getAdminCategories } from "@/server/admin/categories";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminCategoriesPage() {
  await requireAdminSession();

  const categories = await getAdminCategories();

  return (
    <main className="adminPage">
      <section className="adminShell" aria-labelledby="admin-categories-title">
        <header className="adminHeader">
          <BrandLogo compact />
          <div>
            <p className="sectionKicker">Админка</p>
            <h1 id="admin-categories-title">Категории</h1>
            <p>Управление разделами каталога, которые клиент видит после фильтра Все напитки.</p>
          </div>
          <AdminLogoutButton />
        </header>

        <nav className="adminTabs" aria-label="Разделы каталога">
          <Link href="/admin/products">Товары</Link>
          <Link href="/admin/drafts">Черновики</Link>
          <Link href="/admin/hidden">Скрытые</Link>
          <Link className="adminTabActive" href="/admin/categories">
            Категории
          </Link>
          <Link href="/admin/sorting/all">Сортировка</Link>
        </nav>

        <AdminCategoriesManager categories={categories} />

        <AdminSortableList
          description="Перетащите реальные категории в нужном порядке. Все напитки остается системным фильтром и всегда показывается первым."
          emptyText="Добавьте категории, чтобы настроить их порядок в клиентском каталоге."
          emptyTitle="Категорий пока нет"
          endpoint="/api/admin/categories/reorder"
          items={categories.map((category) => ({
            id: category.id,
            title: capitalizeDisplayName(category.name),
            subtitle: formatProductCount(category.productCount),
            meta: `Позиция ${category.sortOrder + 1}`
          }))}
          successMessage="Порядок категорий сохранен."
          title="Порядок категорий"
        />
      </section>
    </main>
  );
}

function formatProductCount(value: number) {
  const lastTwoDigits = value % 100;
  const lastDigit = value % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return `${value} товаров`;
  }

  if (lastDigit === 1) {
    return `${value} товар`;
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return `${value} товара`;
  }

  return `${value} товаров`;
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
