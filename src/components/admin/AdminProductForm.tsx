"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  AdminProductCategory,
  AdminProductEditItem,
  AdminProductStatus
} from "@/server/admin/products";

type AdminProductFormProps = {
  mode: "new" | "edit";
  categories: AdminProductCategory[];
  product?: AdminProductEditItem;
};

const statusOptions: Array<{
  value: AdminProductStatus;
  label: string;
}> = [
  { value: "draft", label: "Черновик" },
  { value: "active", label: "Доступен" },
  { value: "out_of_stock", label: "Нет в наличии" },
  { value: "hidden", label: "Скрыт" }
];

export function AdminProductForm({ mode, categories, product }: AdminProductFormProps) {
  const router = useRouter();
  const [name, setName] = useState(product?.name ?? "");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const [priceRub, setPriceRub] = useState(formatInputNumber(product?.priceRub ?? null));
  const [packQuantity, setPackQuantity] = useState(
    formatInputNumber(product?.packQuantity ?? null)
  );
  const [status, setStatus] = useState<AdminProductStatus>(product?.status ?? "draft");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = mode === "edit";
  const title = isEditMode ? "Редактирование товара" : "Новый товар";
  const submitLabel = isEditMode ? "Сохранить изменения" : "Создать товар";
  const cancelHref = product ? getListHrefByStatus(product.status) : "/admin/products";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      setError("Введите название товара.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(
        isEditMode && product ? `/api/admin/products/${product.id}` : "/api/admin/products",
        {
          method: isEditMode ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name,
            categoryId,
            priceRub,
            packQuantity,
            status
          })
        }
      );

      if (!response.ok) {
        const message = await getResponseMessage(response);
        setError(message);

        if (response.status === 401) {
          router.replace("/admin/login");
        }

        return;
      }

      const body = (await response.json()) as { redirectTo?: unknown };
      const redirectTo =
        typeof body.redirectTo === "string" ? body.redirectTo : getListHrefByStatus(status);

      router.replace(redirectTo);
    } catch {
      setError("Не удалось сохранить товар. Проверьте соединение и попробуйте еще раз.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="adminFormSection" aria-labelledby="admin-product-form-title">
      <div className="adminFormHeader">
        <div>
          <p className="sectionKicker">Управление каталогом</p>
          <h1 id="admin-product-form-title">{title}</h1>
          <p>{isEditMode ? "Измените базовые данные товара." : "Создайте товар как черновик."}</p>
        </div>
        <Link className="adminFormBackLink" href={cancelHref}>
          Вернуться
        </Link>
      </div>

      <form className="adminProductForm" noValidate onSubmit={handleSubmit}>
        <div className="adminProductFormGrid">
          <div className="adminProductFormFields">
            <label>
              <span>Название товара</span>
              <input
                name="name"
                onChange={(event) => setName(event.target.value)}
                type="text"
                value={name}
              />
            </label>

            <label>
              <span>Категория</span>
              <select
                name="categoryId"
                onChange={(event) => setCategoryId(event.target.value)}
                value={categoryId}
              >
                <option value="">Категория не выбрана</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {capitalizeDisplayName(category.name)}
                  </option>
                ))}
              </select>
            </label>

            <div className="adminProductFormPair">
              <label>
                <span>Цена, руб.</span>
                <input
                  min={1}
                  name="priceRub"
                  onChange={(event) => setPriceRub(event.target.value)}
                  step={1}
                  type="number"
                  value={priceRub}
                />
              </label>

              <label>
                <span>Штук в одной уп</span>
                <input
                  min={1}
                  name="packQuantity"
                  onChange={(event) => setPackQuantity(event.target.value)}
                  step={1}
                  type="number"
                  value={packQuantity}
                />
              </label>
            </div>

            <label>
              <span>Статус товара</span>
              <select
                name="status"
                onChange={(event) => setStatus(event.target.value as AdminProductStatus)}
                value={status}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <aside className="adminProductPhotoPanel">
            <span>Основное фото</span>
            <div className="adminProductPhotoFrame">
              {product?.imageUrl ? (
                <Image
                  alt={product.name}
                  className="adminProductPhoto"
                  height={220}
                  src={product.imageUrl}
                  width={220}
                />
              ) : (
                <strong>Фото не добавлено</strong>
              )}
            </div>
          </aside>
        </div>

        {error ? <p className="adminFormError">{error}</p> : null}

        <div className="adminProductFormActions">
          <button disabled={isSubmitting} type="submit">
            {isSubmitting ? "Сохраняем..." : submitLabel}
          </button>
          <Link href={cancelHref}>Отмена</Link>
        </div>
      </form>
    </section>
  );
}

async function getResponseMessage(response: Response) {
  try {
    const body = (await response.json()) as { message?: unknown };

    if (typeof body.message === "string" && body.message.length > 0) {
      return body.message;
    }
  } catch {
    return "Не удалось сохранить товар. Попробуйте еще раз.";
  }

  return "Не удалось сохранить товар. Попробуйте еще раз.";
}

function getListHrefByStatus(status: AdminProductStatus) {
  if (status === "draft") {
    return "/admin/drafts";
  }

  if (status === "hidden") {
    return "/admin/hidden";
  }

  return "/admin/products";
}

function formatInputNumber(value: number | null) {
  return value === null ? "" : String(value);
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
