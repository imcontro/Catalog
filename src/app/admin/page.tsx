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
            <p>Быстрый вход в товары, черновики, скрытые позиции, категории и сортировку.</p>
          </div>
          <AdminLogoutButton />
        </header>

        <div className="adminSectionGrid">
          <Link className="adminSectionCard" href="/admin/products">
            <span>01</span>
            <strong>Товары</strong>
            <p>Активные товары и позиции нет в наличии.</p>
          </Link>
          <Link className="adminSectionCard" href="/admin/drafts">
            <span>02</span>
            <strong>Черновики</strong>
            <p>Товары без обязательных данных для каталога.</p>
          </Link>
          <Link className="adminSectionCard" href="/admin/hidden">
            <span>03</span>
            <strong>Скрытые</strong>
            <p>Позиции, которые клиент сейчас не видит.</p>
          </Link>
          <Link className="adminSectionCard" href="/admin/categories">
            <span>04</span>
            <strong>Категории</strong>
            <p>Разделы каталога и порядок их показа.</p>
          </Link>
          <Link className="adminSectionCard" href="/admin/sorting/all">
            <span>05</span>
            <strong>Сортировка</strong>
            <p>Порядок товаров во всех напитках и категориях.</p>
          </Link>
        </div>
      </section>
    </main>
  );
}
