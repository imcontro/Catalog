import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { AdminProductForm } from "@/components/admin/AdminProductForm";
import {
  getAdminProductCategories,
  getAdminProductForEdit
} from "@/server/admin/products";
import { requireAdminSession } from "@/server/admin/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AdminEditProductPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminEditProductPage({
  params
}: AdminEditProductPageProps) {
  await requireAdminSession();

  const { id } = await params;
  const [categories, product] = await Promise.all([
    getAdminProductCategories(),
    getAdminProductForEdit(id)
  ]);

  return (
    <main className="adminPage">
      <section className="adminShell" aria-labelledby="admin-product-form-title">
        <header className="adminHeader">
          <BrandLogo compact />
          <div>
            <p className="sectionKicker">Админка</p>
            <h1>Редактировать товар</h1>
            <p>Базовые данные товара и статус.</p>
          </div>
          <AdminLogoutButton />
        </header>

        {product ? (
          <AdminProductForm categories={categories} mode="edit" product={product} />
        ) : (
          <section className="adminStatePanel">
            <h2>Товар не найден</h2>
            <p>Товар был удален или больше не доступен для редактирования.</p>
            <Link className="adminFormBackLink" href="/admin/products">
              Вернуться к товарам
            </Link>
          </section>
        )}
      </section>
    </main>
  );
}
