import { BrandLogo } from "@/components/BrandLogo";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { AdminProductsList } from "@/components/admin/AdminProductsList";
import { requireAdminSession } from "@/server/admin/session";
import { getAdminProductsList } from "@/server/admin/products";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminHiddenPage() {
  await requireAdminSession();

  const products = await getAdminProductsList({
    kind: "hidden"
  });

  return (
    <main className="adminPage">
      <section className="adminShell" aria-labelledby="admin-products-title">
        <header className="adminHeader">
          <BrandLogo compact />
          <div>
            <p className="sectionKicker">Админка</p>
            <h1>Скрытые товары</h1>
            <p>Товары, которые сохранены в базе, но не видны клиентам.</p>
          </div>
          <AdminLogoutButton />
        </header>

        <AdminProductsList
          description="Скрытые товары не отображаются в клиентском каталоге."
          kind="hidden"
          products={products}
          title="Скрытые товары"
        />
      </section>
    </main>
  );
}
