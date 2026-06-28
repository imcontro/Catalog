"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";
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

type ProductFlavorFormItem = {
  localId: string;
  id: string | null;
  name: string;
  priceRub: string;
  imageId: string | null;
  imageUrl: string;
  isOutOfStock: boolean;
  selectedImageFile: File | null;
  imageError: string | null;
  isUploadingImage: boolean;
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
  const [mainImageId, setMainImageId] = useState(product?.mainImageId ?? "");
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? "");
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [status, setStatus] = useState<AdminProductStatus>(product?.status ?? "draft");
  const [hasFlavorChoice, setHasFlavorChoice] = useState(
    product?.hasFlavorChoice ?? false
  );
  const [flavors, setFlavors] = useState<ProductFlavorFormItem[]>(
    () =>
      product?.flavors.map((flavor) => ({
        localId: flavor.id,
        id: flavor.id,
        name: flavor.name,
        priceRub: formatInputNumber(flavor.priceRub),
        imageId: flavor.imageId,
        imageUrl: flavor.imageUrl ?? "",
        isOutOfStock: flavor.isOutOfStock,
        selectedImageFile: null,
        imageError: null,
        isUploadingImage: false
      })) ?? []
  );
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = mode === "edit";
  const isAnyFlavorUploading = flavors.some((flavor) => flavor.isUploadingImage);
  const title = isEditMode ? "Редактирование товара" : "Новый товар";
  const submitLabel = isEditMode ? "Сохранить изменения" : "Создать товар";
  const cancelHref = product ? getListHrefByStatus(product.status) : "/admin/products";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      setError("Введите название товара.");
      return;
    }

    if (hasFlavorChoice && flavors.length === 0) {
      setError("Добавьте хотя бы один вкус или выключите выбор вкуса.");
      return;
    }

    if (hasFlavorChoice && flavors.some((flavor) => !flavor.name.trim())) {
      setError("Введите название каждого вкуса.");
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
            mainImageId,
            status,
            hasFlavorChoice,
            flavors: hasFlavorChoice
              ? flavors.map((flavor) => ({
                  id: flavor.id,
                  name: flavor.name,
                  priceRub: flavor.priceRub,
                  imageId: flavor.imageId,
                  isOutOfStock: flavor.isOutOfStock
                }))
              : []
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

  async function handleImageUpload() {
    if (!selectedImageFile) {
      setImageError("Выберите файл фото.");
      return;
    }

    setImageError(null);
    setIsUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedImageFile);

      const response = await fetch("/api/admin/images", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const message = await getResponseMessage(response);
        setImageError(message);

        if (response.status === 401) {
          router.replace("/admin/login");
        }

        return;
      }

      const body = (await response.json()) as {
        imageId?: unknown;
        imageUrl?: unknown;
      };

      if (typeof body.imageId !== "string" || typeof body.imageUrl !== "string") {
        setImageError("Не удалось получить данные загруженного фото.");
        return;
      }

      setMainImageId(body.imageId);
      setImageUrl(body.imageUrl);
      setSelectedImageFile(null);
    } catch {
      setImageError("Не удалось загрузить фото. Проверьте соединение и попробуйте еще раз.");
    } finally {
      setIsUploadingImage(false);
    }
  }

  async function handleFlavorImageUpload(localId: string) {
    const flavor = flavors.find((item) => item.localId === localId);

    if (!flavor?.selectedImageFile) {
      updateFlavor(localId, {
        imageError: "Выберите файл фото вкуса."
      });
      return;
    }

    updateFlavor(localId, {
      imageError: null,
      isUploadingImage: true
    });

    try {
      const formData = new FormData();
      formData.append("file", flavor.selectedImageFile);

      const response = await fetch("/api/admin/images", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const message = await getResponseMessage(response);
        updateFlavor(localId, {
          imageError: message
        });

        if (response.status === 401) {
          router.replace("/admin/login");
        }

        return;
      }

      const body = (await response.json()) as {
        imageId?: unknown;
        imageUrl?: unknown;
      };

      if (typeof body.imageId !== "string" || typeof body.imageUrl !== "string") {
        updateFlavor(localId, {
          imageError: "Не удалось получить данные фото вкуса."
        });
        return;
      }

      updateFlavor(localId, {
        imageId: body.imageId,
        imageUrl: body.imageUrl,
        selectedImageFile: null
      });
    } catch {
      updateFlavor(localId, {
        imageError: "Не удалось загрузить фото вкуса. Попробуйте еще раз."
      });
    } finally {
      updateFlavor(localId, {
        isUploadingImage: false
      });
    }
  }

  function handleImageFileChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedImageFile(event.target.files?.[0] ?? null);
    setImageError(null);
  }

  function handleFlavorImageFileChange(
    localId: string,
    event: ChangeEvent<HTMLInputElement>
  ) {
    updateFlavor(localId, {
      selectedImageFile: event.target.files?.[0] ?? null,
      imageError: null
    });
  }

  function addFlavor() {
    setHasFlavorChoice(true);
    setFlavors((currentFlavors) => [
      ...currentFlavors,
      {
        localId: createLocalId(),
        id: null,
        name: "",
        priceRub: "",
        imageId: null,
        imageUrl: "",
        isOutOfStock: false,
        selectedImageFile: null,
        imageError: null,
        isUploadingImage: false
      }
    ]);
  }

  function removeFlavor(localId: string) {
    setFlavors((currentFlavors) =>
      currentFlavors.filter((flavor) => flavor.localId !== localId)
    );
  }

  function updateFlavor(localId: string, patch: Partial<ProductFlavorFormItem>) {
    setFlavors((currentFlavors) =>
      currentFlavors.map((flavor) =>
        flavor.localId === localId ? { ...flavor, ...patch } : flavor
      )
    );
  }

  return (
    <section className="adminFormSection" aria-labelledby="admin-product-form-title">
      <div className="adminFormHeader">
        <div>
          <p className="sectionKicker">Управление каталогом</p>
          <h1 id="admin-product-form-title">{title}</h1>
        </div>
        <Link className="adminFormBackLink" href={cancelHref}>
          Вернуться
        </Link>
      </div>

      <form className="adminProductForm" noValidate onSubmit={handleSubmit}>
        <div className="adminProductFormGrid">
          <div className="adminProductFormFields">
            <section className="adminFormBlock" aria-label="Основные данные товара">
              <div className="adminFormBlockHeader">
                <strong>Основные данные</strong>
              </div>

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
            </section>

            <section className="adminFormBlock" aria-label="Цена и упаковка">
              <div className="adminFormBlockHeader">
                <strong>Цена и упаковка</strong>
              </div>

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
            </section>

            <section className="adminFormBlock" aria-label="Статус товара">
              <div className="adminFormBlockHeader">
                <strong>Статус</strong>
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
            </section>
          </div>

          <aside className="adminProductPhotoPanel">
            <span>Основное фото</span>
            <div className="adminProductPhotoFrame">
              {imageUrl ? (
                <Image
                  alt={name || "Основное фото товара"}
                  className="adminProductPhoto"
                  height={220}
                  src={imageUrl}
                  width={220}
                />
              ) : (
                <strong>Фото не добавлено</strong>
              )}
            </div>
            <label className="adminProductPhotoUpload">
              <span>Файл фото</span>
              <input
                accept="image/jpeg,image/png,image/webp"
                disabled={isUploadingImage}
                onChange={handleImageFileChange}
                type="file"
              />
            </label>
            {selectedImageFile ? (
              <p className="adminProductPhotoHint">{selectedImageFile.name}</p>
            ) : (
              <p className="adminProductPhotoHint">JPG, PNG или WebP до 5 МБ.</p>
            )}
            {imageError ? <p className="adminFormError">{imageError}</p> : null}
            <button
              className="adminProductPhotoButton"
              disabled={isUploadingImage || !selectedImageFile}
              onClick={handleImageUpload}
              type="button"
            >
              {isUploadingImage
                ? "Загружаем..."
                : imageUrl
                  ? "Заменить фото"
                  : "Загрузить фото"}
            </button>
          </aside>
        </div>

        <section className="adminProductFlavorSection" aria-labelledby="admin-flavors-title">
          <div className="adminProductFlavorHeader">
            <div>
              <h2 id="admin-flavors-title">Вкусы товара</h2>
              <p>
                {hasFlavorChoice
                  ? "Клиент выбирает один из доступных вкусов."
                  : "Товар сохраняется без выбора вкуса."}
              </p>
            </div>
            <label className="adminProductFlavorToggle">
              <input
                checked={hasFlavorChoice}
                onChange={(event) => setHasFlavorChoice(event.target.checked)}
                type="checkbox"
              />
              <span>Выбор вкуса</span>
            </label>
          </div>

          {hasFlavorChoice ? (
            <div className="adminProductFlavorList">
              {flavors.map((flavor, index) => (
                <article className="adminProductFlavorCard" key={flavor.localId}>
                  <header className="adminProductFlavorCardHeader">
                    <strong>Вкус {index + 1}</strong>
                    <button onClick={() => removeFlavor(flavor.localId)} type="button">
                      Удалить
                    </button>
                  </header>

                  <div className="adminProductFlavorFields">
                    <label>
                      <span>Название вкуса</span>
                      <input
                        onChange={(event) =>
                          updateFlavor(flavor.localId, { name: event.target.value })
                        }
                        type="text"
                        value={flavor.name}
                      />
                    </label>

                    <label>
                      <span>Отдельная цена, руб.</span>
                      <input
                        min={1}
                        onChange={(event) =>
                          updateFlavor(flavor.localId, { priceRub: event.target.value })
                        }
                        placeholder="Использовать цену товара"
                        step={1}
                        type="number"
                        value={flavor.priceRub}
                      />
                    </label>

                    <label className="adminProductFlavorStockToggle">
                      <input
                        checked={flavor.isOutOfStock}
                        onChange={(event) =>
                          updateFlavor(flavor.localId, {
                            isOutOfStock: event.target.checked
                          })
                        }
                        type="checkbox"
                      />
                      <span>Нет в наличии</span>
                    </label>
                  </div>

                  <div className="adminProductFlavorPhoto">
                    <div className="adminProductFlavorPhotoFrame">
                      {flavor.imageUrl ? (
                        <Image
                          alt={flavor.name || "Фото вкуса"}
                          className="adminProductPhoto"
                          height={120}
                          src={flavor.imageUrl}
                          width={120}
                        />
                      ) : (
                        <strong>Используется основное фото</strong>
                      )}
                    </div>
                    <div className="adminProductFlavorPhotoControls">
                      <label className="adminProductPhotoUpload">
                        <span>Фото вкуса</span>
                        <input
                          accept="image/jpeg,image/png,image/webp"
                          disabled={flavor.isUploadingImage}
                          onChange={(event) =>
                            handleFlavorImageFileChange(flavor.localId, event)
                          }
                          type="file"
                        />
                      </label>
                      <p className="adminProductPhotoHint">
                        {flavor.selectedImageFile
                          ? flavor.selectedImageFile.name
                          : "Можно оставить пустым."}
                      </p>
                      {flavor.imageError ? (
                        <p className="adminFormError">{flavor.imageError}</p>
                      ) : null}
                      <button
                        className="adminProductPhotoButton"
                        disabled={flavor.isUploadingImage || !flavor.selectedImageFile}
                        onClick={() => handleFlavorImageUpload(flavor.localId)}
                        type="button"
                      >
                        {flavor.isUploadingImage
                          ? "Загружаем..."
                          : flavor.imageUrl
                            ? "Заменить фото вкуса"
                            : "Загрузить фото вкуса"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}

              <button className="adminProductFlavorAddButton" onClick={addFlavor} type="button">
                Добавить вкус
              </button>
            </div>
          ) : (
            <div className="adminProductFlavorEmpty">Без выбора вкуса</div>
          )}
        </section>

        {error ? <p className="adminFormError">{error}</p> : null}

        <div className="adminProductFormActions">
          <button
            disabled={isSubmitting || isUploadingImage || isAnyFlavorUploading}
            type="submit"
          >
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

function createLocalId() {
  return `new-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
