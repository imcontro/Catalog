"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminProductListKind } from "@/server/admin/products";

type AdminProductQuickActionsProps = {
  kind: AdminProductListKind;
  productId: string;
  productName: string;
};

type ProductAction = "hide" | "restore" | "delete";

const actionLabels: Record<ProductAction, string> = {
  hide: "Скрыть",
  restore: "Вернуть в каталог",
  delete: "Удалить"
};

export function AdminProductQuickActions({
  kind,
  productId,
  productName
}: AdminProductQuickActionsProps) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<ProductAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const actions = getActionsByKind(kind);

  async function runAction(action: ProductAction) {
    if (!window.confirm(getConfirmText(action, productName))) {
      return;
    }

    setError(null);
    setPendingAction(action);

    try {
      const response = await fetch(getActionUrl(productId, action), {
        method: action === "delete" ? "DELETE" : "POST"
      });

      if (!response.ok) {
        const message = await getResponseMessage(response, action);
        setError(message);

        if (response.status === 401) {
          router.replace("/admin/login");
        }

        return;
      }

      router.refresh();
    } catch {
      setError("Не удалось выполнить действие. Проверьте соединение и попробуйте еще раз.");
    } finally {
      setPendingAction(null);
    }
  }

  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="adminProductQuickActions">
      {actions.map((action) => (
        <button
          className={
            action === "delete"
              ? "adminProductQuickAction adminProductQuickActionDanger"
              : "adminProductQuickAction"
          }
          disabled={pendingAction !== null}
          key={action}
          onClick={() => void runAction(action)}
          type="button"
        >
          {pendingAction === action ? "Выполняем..." : actionLabels[action]}
        </button>
      ))}
      {error ? <p className="adminProductActionError">{error}</p> : null}
    </div>
  );
}

function getActionsByKind(kind: AdminProductListKind): ProductAction[] {
  if (kind === "products") {
    return ["hide", "delete"];
  }

  if (kind === "hidden") {
    return ["restore", "delete"];
  }

  return ["delete"];
}

function getActionUrl(productId: string, action: ProductAction) {
  if (action === "hide") {
    return `/api/admin/products/${productId}/hide`;
  }

  if (action === "restore") {
    return `/api/admin/products/${productId}/restore`;
  }

  return `/api/admin/products/${productId}`;
}

function getConfirmText(action: ProductAction, productName: string) {
  if (action === "hide") {
    return `Скрыть товар "${productName}" из клиентского каталога?`;
  }

  if (action === "restore") {
    return `Вернуть товар "${productName}" в клиентский каталог?`;
  }

  return `Удалить товар "${productName}"? Это действие уберет товар из админки и клиентского каталога.`;
}

async function getResponseMessage(response: Response, action: ProductAction) {
  try {
    const body = (await response.json()) as { message?: unknown };

    if (typeof body.message === "string" && body.message.length > 0) {
      return body.message;
    }
  } catch {
    return getFallbackError(action);
  }

  return getFallbackError(action);
}

function getFallbackError(action: ProductAction) {
  if (action === "hide") {
    return "Не удалось скрыть товар. Попробуйте еще раз.";
  }

  if (action === "restore") {
    return "Не удалось вернуть товар в каталог. Попробуйте еще раз.";
  }

  return "Не удалось удалить товар. Попробуйте еще раз.";
}
