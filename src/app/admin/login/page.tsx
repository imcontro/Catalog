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
        </div>

        <AdminLoginForm />

        <p className="loginState">Вход доступен только владельцу каталога.</p>
      </section>
    </main>
  );
}
