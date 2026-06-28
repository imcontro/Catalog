import { BrandLogo } from "@/components/BrandLogo";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  return (
    <main className="loginPage">
      <section className="loginPanel" aria-labelledby="admin-login-title">
        <BrandLogo compact />
        <div className="loginHeading">
          <p className="sectionKicker">Админка</p>
          <h1 id="admin-login-title">Вход в управление каталогом</h1>
          <p>После входа откроется рабочая панель для товаров, категорий и сортировки.</p>
        </div>

        <AdminLoginForm />

        <p className="loginState">Клиенты не видят эту страницу и не имеют доступа к управлению каталогом.</p>
      </section>
    </main>
  );
}
