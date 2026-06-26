import { BrandLogo } from "@/components/BrandLogo";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { AdminProductForm } from "@/components/admin/AdminProductForm";
import { getAdminProductCategories } from "@/server/admin/products";
import { requireAdminSession } from "@/server/admin/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminNewProductPage() {
  await requireAdminSession();

  const categories = await getAdminProductCategories();

  return (
    <main className="adminPage">
      <section className="adminShell" aria-labelledby="admin-product-form-title">
        <header className="adminHeader">
          <BrandLogo compact />
          <div>
            <p className="sectionKicker">Админка</p>
            <h1>Добавить товар</h1>
            <p>Новый товар сохраняется как черновик, пока не заполнены обязательные данные.</p>
          </div>
          <AdminLogoutButton />
        </header>

        <AdminProductForm categories={categories} mode="new" />
      </section>
    </main>
  );
}
