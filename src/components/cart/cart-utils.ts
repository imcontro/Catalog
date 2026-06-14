import type {
  CartResolveResponse,
  RemovedCartItem,
  ResolvedCartItem,
  StoredCartItem
} from "@/types/cart";

export const cartStorageKey = "napitki_berkat_cart";

export const emptyResolvedCart: CartResolveResponse = {
  items: [],
  removedItems: []
};

export type CartItemIdentity = {
  productId: string;
  flavorId: string | null;
};

export type CartLine = CartItemIdentity & {
  quantity: number;
  name: string;
  flavorName: string | null;
  priceRub: number;
  imageUrl: string | null;
  previousPriceRub: number | null;
  priceChanged: boolean;
  isAvailable: boolean;
  unavailableReason: string | null;
  isResolved: boolean;
};

export async function resolveStoredCartItems(
  items: StoredCartItem[],
  signal?: AbortSignal
) {
  const response = await fetch("/api/cart/resolve", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      items
    }),
    cache: "no-store",
    signal
  });

  if (!response.ok) {
    throw new Error("Cart resolve failed");
  }

  return (await response.json()) as CartResolveResponse;
}

export function buildCartLines(
  storedItems: StoredCartItem[],
  resolvedItems: ResolvedCartItem[]
): CartLine[] {
  const resolvedItemsByKey = new Map(
    resolvedItems.map((item) => [getCartItemKey(item), item])
  );

  return storedItems.map((storedItem) => {
    const resolvedItem = resolvedItemsByKey.get(getCartItemKey(storedItem));

    if (resolvedItem) {
      return {
        productId: resolvedItem.productId,
        flavorId: resolvedItem.flavorId,
        quantity: storedItem.quantity,
        name: resolvedItem.name,
        flavorName: resolvedItem.flavorName,
        priceRub: resolvedItem.priceRub,
        imageUrl: resolvedItem.imageUrl,
        previousPriceRub: resolvedItem.previousPriceRub,
        priceChanged: resolvedItem.priceChanged,
        isAvailable: resolvedItem.isAvailable,
        unavailableReason: resolvedItem.unavailableReason,
        isResolved: true
      };
    }

    return {
      productId: storedItem.productId,
      flavorId: storedItem.flavorId,
      quantity: storedItem.quantity,
      name: storedItem.snapshotName,
      flavorName: storedItem.snapshotFlavorName,
      priceRub: storedItem.snapshotPriceRub,
      imageUrl: null,
      previousPriceRub: null,
      priceChanged: false,
      isAvailable: true,
      unavailableReason: null,
      isResolved: false
    };
  });
}

export function readStoredCartItems(): StoredCartItem[] {
  try {
    const rawItems = window.localStorage.getItem(cartStorageKey);

    if (!rawItems) {
      return [];
    }

    const parsedItems: unknown = JSON.parse(rawItems);

    if (!Array.isArray(parsedItems)) {
      return [];
    }

    return parsedItems.flatMap((item) => {
      if (!isRecord(item)) {
        return [];
      }

      const productId = item.productId;
      const flavorId = item.flavorId;
      const quantity = item.quantity;
      const addedAt = item.addedAt;
      const snapshotName = item.snapshotName;
      const snapshotFlavorName = item.snapshotFlavorName;
      const snapshotPriceRub = item.snapshotPriceRub;
      const quantityValue =
        typeof quantity === "number" && Number.isInteger(quantity) ? quantity : null;
      const snapshotPriceRubValue =
        typeof snapshotPriceRub === "number" && Number.isInteger(snapshotPriceRub)
          ? snapshotPriceRub
          : null;

      if (
        typeof productId !== "string" ||
        !isUuid(productId) ||
        !(flavorId === null || (typeof flavorId === "string" && isUuid(flavorId))) ||
        quantityValue === null ||
        quantityValue < 1 ||
        typeof addedAt !== "string" ||
        typeof snapshotName !== "string" ||
        snapshotName.trim() === "" ||
        !(snapshotFlavorName === null || typeof snapshotFlavorName === "string") ||
        snapshotPriceRubValue === null ||
        snapshotPriceRubValue < 1
      ) {
        return [];
      }

      return [
        {
          productId,
          flavorId,
          quantity: Math.min(quantityValue, 999),
          addedAt,
          snapshotName,
          snapshotFlavorName,
          snapshotPriceRub: snapshotPriceRubValue
        }
      ];
    });
  } catch {
    return [];
  }
}

export function removeResolvedDeletedItems(
  items: StoredCartItem[],
  removedItems: RemovedCartItem[]
) {
  if (removedItems.length === 0) {
    return items;
  }

  return items.filter(
    (item) =>
      !removedItems.some(
        (removedItem) => getCartItemKey(removedItem) === getCartItemKey(item)
      )
  );
}

export function getCartItemKey(item: CartItemIdentity) {
  return `${item.productId}:${item.flavorId ?? ""}`;
}

export function getCartLineDisplayName(line: CartLine) {
  const name = capitalizeDisplayName(line.name);
  const flavorName = line.flavorName ? capitalizeDisplayName(line.flavorName) : "";

  return flavorName ? `${name} / ${flavorName}` : name;
}

export function getDeliveryHint(totalRub: number, freeDeliveryThresholdRub: number) {
  if (totalRub >= freeDeliveryThresholdRub) {
    return "Доставка: бесплатно по г. Грозный";
  }

  return `До бесплатной доставки по г. Грозный осталось ${formatRub(
    freeDeliveryThresholdRub - totalRub
  )}`;
}

export function getCheckoutDeliveryText(
  totalRub: number,
  freeDeliveryThresholdRub: number
) {
  if (totalRub >= freeDeliveryThresholdRub) {
    return "Доставка: бесплатно по г. Грозный";
  }

  return "Доставка: стоимость сообщим в WhatsApp по тарифу";
}

export function capitalizeDisplayName(value: string) {
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

export function formatRub(value: number) {
  return `${value.toLocaleString("ru-RU")} руб.`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}
