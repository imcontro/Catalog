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
        <AdminProductsList
          description="Здесь находятся товары, которые пока не видны клиентам."
          kind="drafts"
          products={products}
          title="Черновики"
        />
      </section>
    </main>
  );
}
