import { BrandLogo } from "@/components/BrandLogo";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { AdminProductsList } from "@/components/admin/AdminProductsList";
import { requireAdminSession } from "@/server/admin/session";
import {
  getAdminProductCategories,
  getAdminProductsList,
  normalizeAdminProductCategory,
  normalizeAdminProductSearch
} from "@/server/admin/products";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AdminProductsPageProps = {
  searchParams?: Promise<{
    category?: string | string[];
    q?: string | string[];
  }>;
};

export default async function AdminProductsPage({
  searchParams
}: AdminProductsPageProps) {
  await requireAdminSession();

  const params = await searchParams;
  const searchQuery = normalizeAdminProductSearch(params?.q);
  const categories = await getAdminProductCategories();
  const selectedCategoryId = normalizeAdminProductCategory(params?.category, categories);
  const products = await getAdminProductsList({
    categoryId: selectedCategoryId,
    kind: "products",
    search: searchQuery
  });

  return (
    <main className="adminPage">
      <section className="adminShell" aria-labelledby="admin-products-title">
        <header className="adminHeader">
          <BrandLogo compact />
          <div>
            <p className="sectionKicker">Админка</p>
            <h1>Товары</h1>
            <p>Список активных товаров и товаров со статусом нет в наличии.</p>
          </div>
          <AdminLogoutButton />
        </header>

        <AdminProductsList
          categories={categories}
          description="Скрытые товары и черновики не входят в этот список."
          kind="products"
          products={products}
          selectedCategoryId={selectedCategoryId}
          searchQuery={searchQuery}
          title={selectedCategoryId ? "Товары категории" : "Все напитки"}
        />
      </section>
    </main>
  );
}
