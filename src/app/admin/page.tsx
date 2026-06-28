import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { requireAdminSession } from "@/server/admin/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminPage() {
  await requireAdminSession();

  return (
    <main className="adminPage">
      <section className="adminShell" aria-labelledby="admin-title">
        <header className="adminHeader">
          <BrandLogo compact />
          <div>
            <p className="sectionKicker">Админка</p>
            <h1 id="admin-title">Управление каталогом</h1>
            <p>Выберите раздел для работы с товарами каталога.</p>
          </div>
          <AdminLogoutButton />
        </header>

        <div className="adminSectionGrid">
          <Link className="adminSectionCard" href="/admin/products">
            <span>Товары</span>
            <strong>Активные и нет в наличии</strong>
            <p>Обычный список товаров, которые видны владельцу для контроля каталога.</p>
          </Link>
          <Link className="adminSectionCard" href="/admin/drafts">
            <span>Черновики</span>
            <strong>Незаполненные товары</strong>
            <p>Товары, которым не хватает данных для клиентского каталога.</p>
          </Link>
          <Link className="adminSectionCard" href="/admin/hidden">
            <span>Скрытые</span>
            <strong>Убраны от клиентов</strong>
            <p>Товары, которые сохранены в базе, но не показываются в каталоге.</p>
          </Link>
          <Link className="adminSectionCard" href="/admin/categories">
            <span>Категории</span>
            <strong>Разделы каталога</strong>
            <p>Добавить, переименовать или удалить пустую категорию без изменения товаров.</p>
          </Link>
        </div>
      </section>
    </main>
  );
}
