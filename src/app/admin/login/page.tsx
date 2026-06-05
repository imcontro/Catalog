import { BrandLogo } from "@/components/BrandLogo";

export default function AdminLoginPage() {
  return (
    <main className="loginPage">
      <section className="loginPanel" aria-labelledby="admin-login-title">
        <BrandLogo compact />
        <div className="loginHeading">
          <p className="sectionKicker">Админка</p>
          <h1 id="admin-login-title">Вход в управление каталогом</h1>
        </div>

        <form className="loginForm">
          <label>
            Логин
            <input name="login" type="text" autoComplete="username" disabled />
          </label>
          <label>
            Пароль
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              disabled
            />
          </label>
          <button type="button" disabled>
            Войти
          </button>
        </form>

        <p className="loginState">Авторизация будет подключена отдельным этапом.</p>
      </section>
    </main>
  );
}
