export type Category = {
  id: number;
  name: string;
};

export type Product = {
  id: number;
  name: string;
  description?: string;
  tags: string[];
  images: string[];
  price: number;
  priceUnit: string;
  customerMoq: number;
  customerUnit: string;
  customerUnitMultiplier?: number;
  minFractionPerUser: number;
  moqByProvider: number;
  supplierMoq: number;
  supplierUnit: string;
  supplierUrl?: string;
  publicPrice?: number;
  publicPriceUnit?: string;
  publicPriceMultiplier?: number;
  categoryId: number;
};

export type ProductWithCategory = Product & { category?: Category };
