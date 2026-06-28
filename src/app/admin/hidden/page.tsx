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
        <AdminProductsList
          description="Скрытые товары сохранены в админке, но не показываются клиентам."
          kind="hidden"
          products={products}
          title="Скрытые товары"
        />
      </section>
    </main>
  );
}
