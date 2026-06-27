import {
  AdminProductMutationError,
  isAdminProductStatus,
  type AdminProductMutationInput
} from "./products";

export function parseAdminProductPayload(value: unknown): AdminProductMutationInput {
  if (!isRecord(value)) {
    throw new AdminProductMutationError("Не удалось прочитать данные товара.");
  }

  const name = typeof value.name === "string" ? value.name : "";
  const categoryId =
    typeof value.categoryId === "string" && value.categoryId.trim()
      ? value.categoryId.trim()
      : null;
  const priceRub = parseNullablePositiveInteger(value.priceRub, "цену");
  const packQuantity = parseNullablePositiveInteger(
    value.packQuantity,
    "количество штук в одной уп"
  );
  const mainImageId =
    typeof value.mainImageId === "string" && value.mainImageId.trim()
      ? value.mainImageId.trim()
      : null;
  const hasFlavorChoice = value.hasFlavorChoice === true;
  const flavors = hasFlavorChoice ? parseAdminProductFlavors(value.flavors) : [];

  if (!isAdminProductStatus(value.status)) {
    throw new AdminProductMutationError("Выберите корректный статус товара.");
  }

  return {
    name,
    categoryId,
    priceRub,
    packQuantity,
    mainImageId,
    status: value.status,
    hasFlavorChoice,
    flavors
  };
}

function parseAdminProductFlavors(value: unknown) {
  if (!Array.isArray(value)) {
    throw new AdminProductMutationError("Добавьте хотя бы один вкус или выключите выбор вкуса.");
  }

  return value.map((flavor) => {
    if (!isRecord(flavor)) {
      throw new AdminProductMutationError("Не удалось прочитать данные вкуса.");
    }

    const id = typeof flavor.id === "string" && flavor.id.trim() ? flavor.id.trim() : null;
    const imageId =
      typeof flavor.imageId === "string" && flavor.imageId.trim()
        ? flavor.imageId.trim()
        : null;

    return {
      id,
      name: typeof flavor.name === "string" ? flavor.name : "",
      priceRub: parseNullablePositiveInteger(flavor.priceRub, "цену вкуса"),
      imageId,
      isOutOfStock: flavor.isOutOfStock === true
    };
  });
}

function parseNullablePositiveInteger(value: unknown, fieldName: string) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.trim())
        : Number.NaN;

  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    throw new AdminProductMutationError(`Укажите корректную ${fieldName}.`);
  }

  return numberValue;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
