import { BrandLogo } from "@/components/BrandLogo";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { AdminProductsList } from "@/components/admin/AdminProductsList";
import { requireAdminSession } from "@/server/admin/session";
import {
  getAdminProductsList,
  normalizeAdminProductSearch
} from "@/server/admin/products";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AdminProductsPageProps = {
  searchParams?: Promise<{
    q?: string | string[];
  }>;
};

export default async function AdminProductsPage({
  searchParams
}: AdminProductsPageProps) {
  await requireAdminSession();

  const params = await searchParams;
  const searchQuery = normalizeAdminProductSearch(params?.q);
  const products = await getAdminProductsList({
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
          description="Скрытые товары и черновики не входят в этот список."
          kind="products"
          products={products}
          searchQuery={searchQuery}
          title="Список товаров"
        />
      </section>
    </main>
  );
}
