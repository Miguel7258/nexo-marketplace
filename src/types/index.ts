export type Category = 'computadores' | 'smartphones' | 'audio' | 'acessorios';

export interface ProductSpec {
  label: string;
  value: string;
}

export interface Product {
  id: string;
  name: string;
  category: Category;
  description: string;
  specs: ProductSpec[];
  imageUrl: string;
  imageAlt: string;
}

export interface Seller {
  id: string;
  name: string;
  rating: number; // e.g. 4.8
  city: string; // e.g. Porto, Lisboa, Braga
}

export interface Offer {
  id: string;
  productId: string;
  sellerId: string;
  priceInCents: number; // Ex: 12999 = 129,99 €
  stock: number; // 0 ou superior
}

export interface ProductWithOffers extends Product {
  offers: (Offer & { seller: Seller })[];
  minPriceInCents: number | null; // menor preço entre ofertas disponíveis (stock > 0), ou menor preço geral se todas esgotadas
  hasStock: boolean;
  totalStock: number;
}

export interface CartItem {
  offerId: string;
  quantity: number;
  priceInCents?: number; // Preço registado aquando da adição para deteção de alterações
}

export interface CartItemDetailed {
  offerId: string;
  productId: string;
  productName: string;
  productImageUrl: string;
  productImageAlt: string;
  category: Category;
  sellerId: string;
  sellerName: string;
  sellerCity: string;
  sellerRating: number;
  priceInCents: number;
  availableStock: number;
  quantity: number;
  itemTotalInCents: number;
}

export interface CartGroup {
  sellerId: string;
  sellerName: string;
  sellerCity: string;
  sellerRating: number;
  items: CartItemDetailed[];
  subtotalInCents: number;
}

export interface CartSummary {
  groups: CartGroup[];
  totalInCents: number;
  totalQuantity: number;
  itemCount: number;
}

export interface RevalidationResult {
  valid: boolean;
  changes: string[];
  updatedCart: CartItem[];
}

export interface CheckoutResult {
  success: boolean;
  order?: DemoOrder;
  error?: string;
  changes?: string[];
}

export interface MarketplaceSnapshot {
  version: number;
  products: Product[];
  sellers: Seller[];
  offers: Offer[];
  orders: DemoOrder[];
  cart: CartItem[];
}

export interface DemoOrderItem {
  productId: string;
  productName: string;
  sellerId: string;
  sellerName: string;
  priceInCents: number;
  quantity: number;
}

export interface DemoOrderGroup {
  sellerId: string;
  sellerName: string;
  items: DemoOrderItem[];
  subtotalInCents: number;
}

export interface DemoOrder {
  id: string;
  createdAt: string;
  groups: DemoOrderGroup[];
  totalInCents: number;
}

export type SortOption =
  | 'relevance'
  | 'price-asc'
  | 'price-desc'
  | 'name-asc'
  | 'name-desc';

export interface FilterState {
  search: string;
  category: Category | 'todas';
  minPriceEuros: string;
  maxPriceEuros: string;
  sortBy: SortOption;
}

export interface SellerOrderView {
  orderId: string;
  createdAt: string;
  sellerId: string;
  sellerName: string;
  items: DemoOrderItem[];
  subtotalInCents: number;
}

export interface SellerOfferItem extends Offer {
  product: Product;
}