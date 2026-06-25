import { BrandLogo } from "@/components/BrandLogo";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { AdminProductsList } from "@/components/admin/AdminProductsList";
import { requireAdminSession } from "@/server/admin/session";
import { getAdminProductsList } from "@/server/admin/products";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminDraftsPage() {
  await requireAdminSession();

  const products = await getAdminProductsList({
    kind: "drafts"
  });

  return (
    <main className="adminPage">
      <section className="adminShell" aria-labelledby="admin-products-title">
        <header className="adminHeader">
          <BrandLogo compact />
          <div>
            <p className="sectionKicker">Админка</p>
            <h1>Черновики</h1>
            <p>Товары, которые не показываются клиентам.</p>
          </div>
          <AdminLogoutButton />
        </header>

        <AdminProductsList
          description="Черновики видны только владельцу и не попадают в клиентский каталог."
          kind="drafts"
          products={products}
          title="Черновики"
        />
      </section>
    </main>
  );
}
