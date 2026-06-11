export type ClientCatalogCategory = {
  id: string;
  name: string;
  sortOrder: number;
};

export type ClientCatalogProductStatus = "active" | "out_of_stock";

export type ClientCatalogFlavor = {
  id: string;
  name: string;
  priceRub: number;
  imageUrl: string;
  isOutOfStock: boolean;
  isOrderable: boolean;
  sortOrder: number;
};

export type ClientCatalogProduct = {
  id: string;
  categoryId: string;
  name: string;
  priceRub: number;
  packQuantity: number;
  imageUrl: string;
  status: ClientCatalogProductStatus;
  isOrderable: boolean;
  hasFlavorChoice: boolean;
  allDrinksSortOrder: number;
  categorySortOrder: number;
  flavors: ClientCatalogFlavor[];
};

export type ClientCatalogData = {
  categories: ClientCatalogCategory[];
  products: ClientCatalogProduct[];
};
