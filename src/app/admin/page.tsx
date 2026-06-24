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
            <p>Вход выполнен. Управление товарами будет подключено отдельным этапом.</p>
          </div>
          <AdminLogoutButton />
        </header>

        <div className="adminStatePanel">
          <h2>Раздел защищен</h2>
          <p>
            Эта страница открывается только при действующей админской сессии.
            Следующий work plan сможет добавить сюда управление товарами,
            категориями, вкусами, фото и сортировкой.
          </p>
        </div>
      </section>
    </main>
  );
}
