"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type AdminSortableListItem = {
  id: string;
  title: string;
  subtitle: string;
  meta?: string;
  badge?: string;
  imageUrl?: string | null;
};

type AdminSortableListProps = {
  title: string;
  description: string;
  endpoint: string;
  items: AdminSortableListItem[];
  emptyTitle: string;
  emptyText: string;
  saveLabel?: string;
  successMessage?: string;
};

export function AdminSortableList({
  title,
  description,
  endpoint,
  items: initialItems,
  emptyTitle,
  emptyText,
  saveLabel = "Сохранить порядок",
  successMessage = "Порядок сохранен."
}: AdminSortableListProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const initialOrderKey = useMemo(
    () => initialItems.map((item) => item.id).join("|"),
    [initialItems]
  );
  const currentOrderKey = items.map((item) => item.id).join("|");
  const hasChanges = currentOrderKey !== initialOrderKey;

  useEffect(() => {
    setItems(initialItems);
    setError(null);
    setNotice(null);
  }, [initialItems]);

  function moveItem(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
      return;
    }

    setError(null);
    setNotice(null);
    setItems((currentItems) => {
      const nextItems = [...currentItems];
      const [movedItem] = nextItems.splice(fromIndex, 1);

      if (!movedItem) {
        return currentItems;
      }

      nextItems.splice(toIndex, 0, movedItem);

      return nextItems;
    });
  }

  function moveByButton(itemId: string, direction: -1 | 1) {
    const fromIndex = items.findIndex((item) => item.id === itemId);
    const toIndex = fromIndex + direction;

    if (toIndex < 0 || toIndex >= items.length) {
      return;
    }

    moveItem(fromIndex, toIndex);
  }

  function handleDrop(targetId: string) {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const fromIndex = items.findIndex((item) => item.id === draggedId);
    const toIndex = items.findIndex((item) => item.id === targetId);

    moveItem(fromIndex, toIndex);
    setDraggedId(null);
    setDragOverId(null);
  }

  async function handleSave() {
    if (!hasChanges || isSaving) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ids: items.map((item) => item.id)
        })
      });

      if (!response.ok) {
        const message = await getResponseMessage(
          response,
          "Не удалось сохранить порядок. Попробуйте еще раз."
        );
        setError(message);

        if (response.status === 401) {
          router.replace("/admin/login");
        }

        return;
      }

      setNotice(successMessage);
      router.refresh();
    } catch {
      setError("Не удалось сохранить порядок. Проверьте соединение и попробуйте еще раз.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="adminSortPanel" aria-labelledby="admin-sort-title">
      <div className="adminSortHeader">
        <div>
          <p className="sectionKicker">Ручная сортировка</p>
          <h2 id="admin-sort-title">{title}</h2>
          <p>{description}</p>
        </div>
        <button
          disabled={!hasChanges || isSaving}
          onClick={() => void handleSave()}
          type="button"
        >
          {isSaving ? "Сохраняем..." : saveLabel}
        </button>
      </div>

      {error ? <p className="adminFormError">{error}</p> : null}
      {notice ? <p className="adminFormSuccess">{notice}</p> : null}

      {items.length > 0 ? (
        <div className="adminSortableList">
          {items.map((item, index) => {
            const isDragged = draggedId === item.id;
            const isDragOver = dragOverId === item.id && draggedId !== item.id;

            return (
              <article
                className={[
                  "adminSortableRow",
                  item.imageUrl ? "" : "adminSortableRowNoImage",
                  isDragged ? "adminSortableRowDragged" : "",
                  isDragOver ? "adminSortableRowOver" : ""
                ]
                  .filter(Boolean)
                  .join(" ")}
                draggable
                key={item.id}
                onDragEnd={() => {
                  setDraggedId(null);
                  setDragOverId(null);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOverId(item.id);
                }}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", item.id);
                  setDraggedId(item.id);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  handleDrop(item.id);
                }}
              >
                <div className="adminSortableHandle" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>

                <div className="adminSortablePosition">{index + 1}</div>

                {item.imageUrl ? (
                  <Image
                    alt={item.title}
                    className="adminSortableImage"
                    height={56}
                    src={item.imageUrl}
                    width={56}
                  />
                ) : null}

                <div className="adminSortableMain">
                  <h3>{item.title}</h3>
                  <p>{item.subtitle}</p>
                </div>

                <div className="adminSortableMeta">
                  {item.badge ? <span>{item.badge}</span> : null}
                  {item.meta ? <strong>{item.meta}</strong> : null}
                </div>

                <div className="adminSortableButtons">
                  <button
                    aria-label={`Поднять ${item.title}`}
                    disabled={index === 0 || isSaving}
                    onClick={() => moveByButton(item.id, -1)}
                    type="button"
                  >
                    Вверх
                  </button>
                  <button
                    aria-label={`Опустить ${item.title}`}
                    disabled={index === items.length - 1 || isSaving}
                    onClick={() => moveByButton(item.id, 1)}
                    type="button"
                  >
                    Вниз
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="adminEmptyState">
          <h2>{emptyTitle}</h2>
          <p>{emptyText}</p>
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
