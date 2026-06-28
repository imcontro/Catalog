"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminCategoryItem } from "@/server/admin/categories";

type AdminCategoriesManagerProps = {
  categories: AdminCategoryItem[];
};

type CategoryAction = "create" | "update" | "delete";

export function AdminCategoriesManager({ categories }: AdminCategoriesManagerProps) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [pendingAction, setPendingAction] = useState<CategoryAction | null>(null);
  const [pendingCategoryId, setPendingCategoryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!newName.trim()) {
      setError("Введите название категории.");
      return;
    }

    setError(null);
    setNotice(null);
    setPendingAction("create");
    setPendingCategoryId(null);

    try {
      const response = await fetch("/api/admin/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: newName
        })
      });

      if (!response.ok) {
        await handleFailedResponse(response, "Не удалось добавить категорию.");
        return;
      }

      setNewName("");
      setNotice("Категория добавлена.");
      router.refresh();
    } catch {
      setError("Не удалось добавить категорию. Проверьте соединение и попробуйте еще раз.");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleUpdate(categoryId: string) {
    if (!editingName.trim()) {
      setError("Введите название категории.");
      return;
    }

    setError(null);
    setNotice(null);
    setPendingAction("update");
    setPendingCategoryId(categoryId);

    try {
      const response = await fetch(`/api/admin/categories/${categoryId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: editingName
        })
      });

      if (!response.ok) {
        await handleFailedResponse(response, "Не удалось переименовать категорию.");
        return;
      }

      setEditingCategoryId(null);
      setEditingName("");
      setNotice("Категория переименована.");
      router.refresh();
    } catch {
      setError("Не удалось переименовать категорию. Проверьте соединение и попробуйте еще раз.");
    } finally {
      setPendingAction(null);
      setPendingCategoryId(null);
    }
  }

  async function handleDelete(category: AdminCategoryItem) {
    if (
      !window.confirm(
        `Удалить категорию "${capitalizeDisplayName(category.name)}"? Пустая категория исчезнет из клиентского каталога.`
      )
    ) {
      return;
    }

    setError(null);
    setNotice(null);
    setPendingAction("delete");
    setPendingCategoryId(category.id);

    try {
      const response = await fetch(`/api/admin/categories/${category.id}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        await handleFailedResponse(response, "Не удалось удалить категорию.");
        return;
      }

      setNotice("Категория удалена.");
      router.refresh();
    } catch {
      setError("Не удалось удалить категорию. Проверьте соединение и попробуйте еще раз.");
    } finally {
      setPendingAction(null);
      setPendingCategoryId(null);
    }
  }

  function startEditing(category: AdminCategoryItem) {
    setError(null);
    setNotice(null);
    setEditingCategoryId(category.id);
    setEditingName(category.name);
  }

  function stopEditing() {
    setEditingCategoryId(null);
    setEditingName("");
  }

  async function handleFailedResponse(response: Response, fallbackMessage: string) {
    const message = await getResponseMessage(response, fallbackMessage);
    setError(message);

    if (response.status === 401) {
      router.replace("/admin/login");
    }
  }

  const isCreating = pendingAction === "create";

  return (
    <section className="adminCategoriesManager" aria-labelledby="admin-categories-list-title">
      <form className="adminCategoryCreateForm" onSubmit={handleCreate}>
        <label>
          <span>Новая категория</span>
          <input
            maxLength={80}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Например: соки"
            type="text"
            value={newName}
          />
        </label>
        <button disabled={isCreating} type="submit">
          {isCreating ? "Добавляем..." : "Добавить"}
        </button>
      </form>

      <div className="adminCategorySystemNote">
        <strong>Все напитки</strong>
        <span>Системный фильтр для клиента. Его нельзя удалить, переименовать или переместить.</span>
      </div>

      {error ? <p className="adminFormError">{error}</p> : null}
      {notice ? <p className="adminFormSuccess">{notice}</p> : null}

      <div className="adminCategoryListHeader">
        <div>
          <p className="sectionKicker">Категории</p>
          <h2 id="admin-categories-list-title">Список категорий</h2>
        </div>
        <span className="adminCountBadge">{categories.length} кат.</span>
      </div>

      {categories.length > 0 ? (
        <div className="adminCategoryList">
          {categories.map((category) => {
            const isEditing = editingCategoryId === category.id;
            const isPending = pendingCategoryId === category.id;
            const isUpdating = isPending && pendingAction === "update";
            const isDeleting = isPending && pendingAction === "delete";
            const hasProducts = category.productCount > 0;

            return (
              <article className="adminCategoryRow" key={category.id}>
                <div className="adminCategoryPosition">
                  {category.sortOrder + 1}
                </div>

                {isEditing ? (
                  <form
                    className="adminCategoryEditForm"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void handleUpdate(category.id);
                    }}
                  >
                    <label>
                      <span>Название категории</span>
                      <input
                        autoFocus
                        maxLength={80}
                        onChange={(event) => setEditingName(event.target.value)}
                        type="text"
                        value={editingName}
                      />
                    </label>
                    <div className="adminCategoryActions">
                      <button disabled={isUpdating} type="submit">
                        {isUpdating ? "Сохраняем..." : "Сохранить"}
                      </button>
                      <button disabled={isUpdating} onClick={stopEditing} type="button">
                        Отмена
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="adminCategoryMain">
                      <h3>{capitalizeDisplayName(category.name)}</h3>
                      <p>{formatProductCount(category.productCount)}</p>
                      <span className="adminCategoryLimitNote">
                        {hasProducts
                          ? "Удаление недоступно, пока в категории есть товары."
                          : "Пустую категорию можно удалить после подтверждения."}
                      </span>
                    </div>

                    <div className="adminCategoryActions">
                      <button
                        disabled={pendingAction !== null}
                        onClick={() => startEditing(category)}
                        type="button"
                      >
                        Переименовать
                      </button>
                      <button
                        className="adminCategoryDangerButton"
                        disabled={pendingAction !== null || hasProducts}
                        onClick={() => void handleDelete(category)}
                        type="button"
                      >
                        {isDeleting ? "Удаляем..." : "Удалить"}
                      </button>
                    </div>
                  </>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="adminEmptyState">
          <h2>Категорий пока нет</h2>
          <p>Добавьте первую категорию, чтобы товары можно было распределять в каталоге.</p>
        </div>
      )}
    </section>
  );
}

async function getResponseMessage(response: Response, fallbackMessage: string) {
  try {
    const body = (await response.json()) as { message?: unknown };

    if (typeof body.message === "string" && body.message.length > 0) {
      return body.message;
    }
  } catch {
    return fallbackMessage;
  }

  return fallbackMessage;
}

function formatProductCount(value: number) {
  const lastTwoDigits = value % 100;
  const lastDigit = value % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return `${value} товаров`;
  }

  if (lastDigit === 1) {
    return `${value} товар`;
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return `${value} товара`;
  }

  return `${value} товаров`;
}

function capitalizeDisplayName(value: string) {
  const firstLetterIndex = value.search(/\p{L}/u);

  if (firstLetterIndex === -1) {
    return value;
  }

  return (
    value.slice(0, firstLetterIndex) +
    value[firstLetterIndex].toLocaleUpperCase("ru-RU") +
    value.slice(firstLetterIndex + 1)
  );
}
