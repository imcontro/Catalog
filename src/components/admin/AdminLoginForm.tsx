"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function AdminLoginForm() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedLogin = login.trim();

    if (!normalizedLogin) {
      setError("Введите логин.");
      return;
    }

    if (!password) {
      setError("Введите пароль.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          login: normalizedLogin,
          password
        })
      });

      if (!response.ok) {
        setError(await getResponseMessage(response));
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Не удалось выполнить вход. Проверьте соединение и попробуйте еще раз.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="loginForm" noValidate onSubmit={handleSubmit}>
      <label>
        Логин
        <input
          autoComplete="username"
          maxLength={120}
          name="login"
          onChange={(event) => setLogin(event.target.value)}
          type="text"
          value={login}
        />
      </label>
      <label>
        Пароль
        <input
          autoComplete="current-password"
          maxLength={300}
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          value={password}
        />
      </label>

      {error ? <p className="loginError">{error}</p> : null}

      <button disabled={isSubmitting} type="submit">
        {isSubmitting ? "Проверяем..." : "Войти"}
      </button>
    </form>
  );
}

async function getResponseMessage(response: Response) {
  try {
    const body = (await response.json()) as { message?: unknown };

    if (typeof body.message === "string" && body.message.length > 0) {
      return body.message;
    }
  } catch {
    return "Не удалось выполнить вход. Попробуйте еще раз.";
  }

  return "Не удалось выполнить вход. Попробуйте еще раз.";
}
