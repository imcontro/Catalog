import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { AdminCategoriesManager } from "@/components/admin/AdminCategoriesManager";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
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
        </nav>

        <AdminCategoriesManager categories={categories} />
      </section>
    </main>
  );
}
