"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminLogoutButton() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogout() {
    setIsSubmitting(true);

    try {
      await fetch("/api/admin/logout", {
        method: "POST"
      });
    } finally {
      router.replace("/admin/login");
      router.refresh();
    }
  }

  return (
    <button
      className="adminLogoutButton"
      disabled={isSubmitting}
      onClick={handleLogout}
      type="button"
    >
      {isSubmitting ? "Выходим..." : "Выйти"}
    </button>
  );
}
