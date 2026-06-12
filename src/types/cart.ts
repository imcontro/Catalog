export type StoredCartItem = {
  productId: string;
  flavorId: string | null;
  quantity: number;
  addedAt: string;
  snapshotName: string;
  snapshotFlavorName: string | null;
  snapshotPriceRub: number;
};

export type CartResolveRequestItem = Pick<
  StoredCartItem,
  | "productId"
  | "flavorId"
  | "quantity"
  | "snapshotName"
  | "snapshotFlavorName"
  | "snapshotPriceRub"
>;

export type CartResolveRequest = {
  items: CartResolveRequestItem[];
};

export type ResolvedCartItem = {
  productId: string;
  flavorId: string | null;
  quantity: number;
  name: string;
  flavorName: string | null;
  priceRub: number;
  previousPriceRub: number | null;
  priceChanged: boolean;
  isAvailable: boolean;
  unavailableReason: string | null;
};

export type RemovedCartItem = {
  productId: string;
  flavorId: string | null;
  snapshotName: string;
  snapshotFlavorName: string | null;
  reason: string;
};

export type CartResolveResponse = {
  items: ResolvedCartItem[];
  removedItems: RemovedCartItem[];
};
