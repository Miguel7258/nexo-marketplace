import {
  Product,
  Seller,
  Offer,
  DemoOrder,
  DemoOrderGroup,
  ProductWithOffers,
  CartItem,
  CartSummary,
  CartGroup,
  CartItemDetailed,
  RevalidationResult,
  CheckoutResult,
  MarketplaceSnapshot,
  SellerOrderView,
  SellerOfferItem,
} from '../types';
import { INITIAL_PRODUCTS, INITIAL_SELLERS, INITIAL_OFFERS, INITIAL_DEMO_ORDERS } from './initialData';
import { formatPrice } from '../utils/formatters';

export const STORAGE_KEYS = {
  APP_SNAPSHOT: 'nexo_marketplace_snapshot_v1',
  PRODUCTS: 'nexo_products_v1',
  SELLERS: 'nexo_sellers_v1',
  OFFERS: 'nexo_offers_v1',
  ORDERS: 'nexo_orders_v1',
  CART: 'nexo_cart_v1',
} as const;

let isCheckingOutLock = false;

const memoryStore = new Map<string, string>();

export const storageAdapter = {
  getItem(key: string): string | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return memoryStore.get(key) ?? null;
  },
  setItem(key: string, value: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    } else {
      memoryStore.set(key, value);
    }
  },
  removeItem(key: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    } else {
      memoryStore.delete(key);
    }
  },
  clear(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    } else {
      memoryStore.clear();
    }
  },
};

function safeGetLegacy<T>(key: string, fallback: T): T {
  try {
    const raw = storageAdapter.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as T;
    }
    return fallback;
  } catch (err) {
    console.warn(`Aviso de recuperação: dados locais inválidos em '${key}'. Repostos os dados padrão.`, err);
    return fallback;
  }
}

function createInitialSnapshot(): MarketplaceSnapshot {
  return {
    version: 1,
    products: INITIAL_PRODUCTS,
    sellers: INITIAL_SELLERS,
    offers: INITIAL_OFFERS,
    orders: INITIAL_DEMO_ORDERS,
    cart: [],
  };
}

export const StorageService = {
  clearRaw(): void {
    storageAdapter.clear();
  },

  /**
   * Persiste o snapshot completo através de uma ÚNICA operação `storageAdapter.setItem`.
   * Quaisquer erros de armazenamento são propagados ao chamador sem serem silenciados.
   */
  persistSnapshot(snapshot: MarketplaceSnapshot): void {
    const serialized = JSON.stringify(snapshot);
    storageAdapter.setItem(STORAGE_KEYS.APP_SNAPSHOT, serialized);
  },

  /**
   * Obtém o snapshot unificado da aplicação, preservando e migrando dados legados existentes se necessário.
   */
  getSnapshot(): MarketplaceSnapshot {
    const rawSnapshot = storageAdapter.getItem(STORAGE_KEYS.APP_SNAPSHOT);
    if (rawSnapshot) {
      try {
        const parsed = JSON.parse(rawSnapshot);
        if (
          parsed &&
          typeof parsed === 'object' &&
          Array.isArray(parsed.products) &&
          Array.isArray(parsed.sellers) &&
          Array.isArray(parsed.offers) &&
          Array.isArray(parsed.orders) &&
          Array.isArray(parsed.cart)
        ) {
          return parsed as MarketplaceSnapshot;
        }
        console.warn('Aviso de recuperação: snapshot local com formato inválido. A reconstituir dados.');
      } catch (err) {
        console.warn('Aviso de recuperação: JSON de snapshot corrompido. A reconstituir dados.', err);
      }
    }

    // Se o snapshot unificado não existir, verificar se existem dados legados para migração
    const products = safeGetLegacy<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    const sellers = safeGetLegacy<Seller[]>(STORAGE_KEYS.SELLERS, INITIAL_SELLERS);
    const offers = safeGetLegacy<Offer[]>(STORAGE_KEYS.OFFERS, INITIAL_OFFERS);
    const orders = safeGetLegacy<DemoOrder[]>(STORAGE_KEYS.ORDERS, INITIAL_DEMO_ORDERS);
    const cart = safeGetLegacy<CartItem[]>(STORAGE_KEYS.CART, []);

    const migrated: MarketplaceSnapshot = {
      version: 1,
      products: Array.isArray(products) && products.length > 0 ? products : INITIAL_PRODUCTS,
      sellers: Array.isArray(sellers) && sellers.length > 0 ? sellers : INITIAL_SELLERS,
      offers: Array.isArray(offers) && offers.length > 0 ? offers : INITIAL_OFFERS,
      orders: Array.isArray(orders) ? orders : INITIAL_DEMO_ORDERS,
      cart: Array.isArray(cart) ? cart : [],
    };

    try {
      this.persistSnapshot(migrated);
    } catch (err) {
      console.warn('Aviso: falha ao persistir snapshot migrado:', err);
    }

    return migrated;
  },

  setRawItem(key: string, value: string): void {
    storageAdapter.setItem(key, value);
    if (key === STORAGE_KEYS.APP_SNAPSHOT) {
      return;
    }

    // Compatibilidade com manipulação direta de chaves individuais em testes
    try {
      const parsed = JSON.parse(value);
      const snapshot = this.getSnapshot();
      if (key === STORAGE_KEYS.OFFERS && Array.isArray(parsed)) {
        snapshot.offers = parsed;
        this.persistSnapshot(snapshot);
      } else if (key === STORAGE_KEYS.PRODUCTS && Array.isArray(parsed)) {
        snapshot.products = parsed;
        this.persistSnapshot(snapshot);
      } else if (key === STORAGE_KEYS.ORDERS && Array.isArray(parsed)) {
        snapshot.orders = parsed;
        this.persistSnapshot(snapshot);
      } else if (key === STORAGE_KEYS.CART && Array.isArray(parsed)) {
        snapshot.cart = parsed;
        this.persistSnapshot(snapshot);
      } else if (key === STORAGE_KEYS.SELLERS && Array.isArray(parsed)) {
        snapshot.sellers = parsed;
        this.persistSnapshot(snapshot);
      }
    } catch {
      // Em caso de JSON inválido injetado diretamente em chave legada, removemos o snapshot
      // para forçar a recuperação transparente via safeGetLegacy
      storageAdapter.removeItem(STORAGE_KEYS.APP_SNAPSHOT);
    }
  },

  initStorage(): void {
    this.getSnapshot();
  },

  resetToInitialData(): void {
    const initial = createInitialSnapshot();
    this.persistSnapshot(initial);
    // Limpeza de chaves legadas para higiene
    storageAdapter.removeItem(STORAGE_KEYS.PRODUCTS);
    storageAdapter.removeItem(STORAGE_KEYS.SELLERS);
    storageAdapter.removeItem(STORAGE_KEYS.OFFERS);
    storageAdapter.removeItem(STORAGE_KEYS.ORDERS);
    storageAdapter.removeItem(STORAGE_KEYS.CART);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nexo-catalog-updated'));
      window.dispatchEvent(new CustomEvent('nexo-cart-updated'));
      window.dispatchEvent(new CustomEvent('storage'));
    }
  },

  getProducts(): Product[] {
    return this.getSnapshot().products;
  },

  getSellers(): Seller[] {
    return this.getSnapshot().sellers;
  },

  getOffers(): Offer[] {
    return this.getSnapshot().offers;
  },

  getOrders(): DemoOrder[] {
    return this.getSnapshot().orders;
  },

  getCart(): CartItem[] {
    return this.getSnapshot().cart;
  },

  saveCart(cart: CartItem[]): void {
    const snapshot = this.getSnapshot();
    snapshot.cart = cart;
    this.persistSnapshot(snapshot);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nexo-cart-updated'));
    }
  },

  addToCart(
    offerId: string,
    quantity: number = 1
  ): { success: boolean; cart: CartItem[]; error?: string } {
    const snapshot = this.getSnapshot();
    const targetOffer = snapshot.offers.find((o) => o.id === offerId);

    if (!targetOffer) {
      return { success: false, error: 'A oferta selecionada não existe no catálogo.', cart: snapshot.cart };
    }

    if (targetOffer.stock <= 0) {
      return { success: false, error: 'Esta oferta encontra-se esgotada.', cart: snapshot.cart };
    }

    const existingIndex = snapshot.cart.findIndex((item) => item.offerId === offerId);

    if (existingIndex >= 0) {
      const currentItem = snapshot.cart[existingIndex];
      const newQuantity = currentItem.quantity + quantity;

      if (newQuantity > targetOffer.stock) {
        if (currentItem.quantity >= targetOffer.stock) {
          return {
            success: false,
            error: `Já tens a quantidade máxima disponível (${targetOffer.stock} un.) no carrinho.`,
            cart: snapshot.cart,
          };
        }
        currentItem.quantity = targetOffer.stock;
        currentItem.priceInCents = targetOffer.priceInCents;
      } else {
        currentItem.quantity = newQuantity;
        currentItem.priceInCents = targetOffer.priceInCents;
      }
    } else {
      const validQty = Math.max(1, Math.min(quantity, targetOffer.stock));
      snapshot.cart.push({
        offerId,
        quantity: validQty,
        priceInCents: targetOffer.priceInCents,
      });
    }

    this.persistSnapshot(snapshot);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nexo-cart-updated'));
    }
    return { success: true, cart: snapshot.cart };
  },

  updateCartQuantity(
    offerId: string,
    quantity: number
  ): { success: boolean; cart: CartItem[]; error?: string } {
    if (quantity <= 0) {
      const updated = this.removeFromCart(offerId);
      return { success: true, cart: updated };
    }

    const snapshot = this.getSnapshot();
    const targetOffer = snapshot.offers.find((o) => o.id === offerId);

    if (!targetOffer) {
      const updated = this.removeFromCart(offerId);
      return { success: false, error: 'A oferta já não se encontra disponível.', cart: updated };
    }

    const item = snapshot.cart.find((i) => i.offerId === offerId);

    if (!item) {
      return { success: false, error: 'Artigo não encontrado no carrinho.', cart: snapshot.cart };
    }

    if (quantity > targetOffer.stock) {
      item.quantity = targetOffer.stock;
      item.priceInCents = targetOffer.priceInCents;
      this.persistSnapshot(snapshot);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nexo-cart-updated'));
      }
      return {
        success: false,
        error: `Quantidade limitada ao stock existente (${targetOffer.stock} un.).`,
        cart: snapshot.cart,
      };
    }

    item.quantity = quantity;
    item.priceInCents = targetOffer.priceInCents;
    this.persistSnapshot(snapshot);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nexo-cart-updated'));
    }
    return { success: true, cart: snapshot.cart };
  },

  removeFromCart(offerId: string): CartItem[] {
    const snapshot = this.getSnapshot();
    snapshot.cart = snapshot.cart.filter((item) => item.offerId !== offerId);
    this.persistSnapshot(snapshot);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nexo-cart-updated'));
    }
    return snapshot.cart;
  },

  clearCart(): void {
    const snapshot = this.getSnapshot();
    snapshot.cart = [];
    this.persistSnapshot(snapshot);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nexo-cart-updated'));
    }
  },

  getCartSummary(): CartSummary {
    const snapshot = this.getSnapshot();
    const productsMap = new Map<string, Product>(snapshot.products.map((p) => [p.id, p]));
    const sellersMap = new Map<string, Seller>(snapshot.sellers.map((s) => [s.id, s]));
    const offersMap = new Map<string, Offer>(snapshot.offers.map((o) => [o.id, o]));

    const detailedItems: CartItemDetailed[] = [];

    for (const item of snapshot.cart) {
      const offer = offersMap.get(item.offerId);
      if (!offer) continue;

      const product = productsMap.get(offer.productId);
      if (!product) continue;

      const seller = sellersMap.get(offer.sellerId) || {
        id: offer.sellerId,
        name: 'Loja Parceira',
        rating: 5.0,
        city: 'Portugal',
      };

      const itemTotalInCents = item.quantity * offer.priceInCents;

      detailedItems.push({
        offerId: item.offerId,
        productId: product.id,
        productName: product.name,
        productImageUrl: product.imageUrl,
        productImageAlt: product.imageAlt,
        category: product.category,
        sellerId: seller.id,
        sellerName: seller.name,
        sellerCity: seller.city,
        sellerRating: seller.rating,
        priceInCents: offer.priceInCents,
        availableStock: offer.stock,
        quantity: item.quantity,
        itemTotalInCents,
      });
    }

    // Agrupar artigos por vendedor (loja)
    const groupsMap = new Map<string, CartGroup>();

    for (const item of detailedItems) {
      let group = groupsMap.get(item.sellerId);
      if (!group) {
        group = {
          sellerId: item.sellerId,
          sellerName: item.sellerName,
          sellerCity: item.sellerCity,
          sellerRating: item.sellerRating,
          items: [],
          subtotalInCents: 0,
        };
        groupsMap.set(item.sellerId, group);
      }
      group.items.push(item);
      group.subtotalInCents += item.itemTotalInCents;
    }

    const groups = Array.from(groupsMap.values());
    const totalInCents = groups.reduce((acc, g) => acc + g.subtotalInCents, 0);
    const totalQuantity = detailedItems.reduce((acc, it) => acc + it.quantity, 0);

    return {
      groups,
      totalInCents,
      totalQuantity,
      itemCount: detailedItems.length,
    };
  },

  revalidateCart(): RevalidationResult {
    const snapshot = this.getSnapshot();
    const offersMap = new Map<string, Offer>(snapshot.offers.map((o) => [o.id, o]));
    const productsMap = new Map<string, Product>(snapshot.products.map((p) => [p.id, p]));
    const sellersMap = new Map<string, Seller>(snapshot.sellers.map((s) => [s.id, s]));

    const changes: string[] = [];
    const updatedCart: CartItem[] = [];

    for (const item of snapshot.cart) {
      const offer = offersMap.get(item.offerId);
      const product = offer ? productsMap.get(offer.productId) : null;
      const seller = offer ? sellersMap.get(offer.sellerId) : null;

      const prodName = product ? product.name : 'Artigo';
      const storeName = seller ? seller.name : 'Loja';

      if (!offer) {
        changes.push(`O artigo "${prodName}" já não se encontra disponível e foi removido do carrinho.`);
        continue;
      }

      if (offer.stock <= 0) {
        changes.push(`O artigo "${prodName}" (${storeName}) esgotou e foi removido do carrinho.`);
        continue;
      }

      let adjustedQuantity = item.quantity;
      if (offer.stock < item.quantity) {
        changes.push(
          `A quantidade de "${prodName}" (${storeName}) foi ajustada de ${item.quantity} para ${offer.stock} por limite de stock.`
        );
        adjustedQuantity = offer.stock;
      }

      if (item.priceInCents !== undefined && item.priceInCents !== offer.priceInCents) {
        changes.push(
          `O preço de "${prodName}" (${storeName}) alterou de ${formatPrice(item.priceInCents)} para ${formatPrice(offer.priceInCents)}.`
        );
      }

      updatedCart.push({
        offerId: item.offerId,
        quantity: adjustedQuantity,
        priceInCents: offer.priceInCents,
      });
    }

    if (changes.length > 0) {
      this.saveCart(updatedCart);
      return {
        valid: false,
        changes,
        updatedCart,
      };
    }

    return {
      valid: true,
      changes: [],
      updatedCart: snapshot.cart,
    };
  },

  /**
   * Conclui a compra demonstrativa com persistência atómica de ofertas, encomendas e carrinho.
   * 
   * Nota de arquitetura / Limite do protótipo:
   * A atomicidade é garantida no contexto da aba ativa através de um snapshot único persistido
   * numa única chamada `localStorage.setItem`. A sincronização entre abas simultâneas ou concorrentes
   * fica fora do âmbito do protótipo e não é coordenada globalmente.
   */
  checkoutDemoOrder(): CheckoutResult {
    // Proteção contra conclusão concorrente ou duplicada na aba
    if (isCheckingOutLock) {
      return { success: false, error: 'A simulação de compra já se encontra em processamento.' };
    }

    const cart = this.getCart();
    if (!cart || cart.length === 0) {
      return { success: false, error: 'O carrinho está vazio. Adiciona artigos antes de concluir a compra.' };
    }

    isCheckingOutLock = true;

    try {
      // 1. Revalidação obrigatória de preço e stock antes de concluir
      const revalidation = this.revalidateCart();
      if (!revalidation.valid) {
        return {
          success: false,
          error: 'Houve alterações de stock ou de preço nos artigos do carrinho.',
          changes: revalidation.changes,
        };
      }

      const summary = this.getCartSummary();
      if (summary.groups.length === 0 || summary.totalQuantity === 0) {
        return { success: false, error: 'Não há artigos válidos no carrinho.' };
      }

      // Ler o snapshot atual (fonte de verdade consistente)
      const currentSnapshot = this.getSnapshot();

      // 2. Calcular nova lista de ofertas com stock deduzido
      const purchasedQuantities = new Map<string, number>();
      for (const group of summary.groups) {
        for (const item of group.items) {
          purchasedQuantities.set(
            item.offerId,
            (purchasedQuantities.get(item.offerId) || 0) + item.quantity
          );
        }
      }

      const updatedOffers = currentSnapshot.offers.map((offer) => {
        const qtyPurchased = purchasedQuantities.get(offer.id);
        if (qtyPurchased !== undefined) {
          return {
            ...offer,
            stock: Math.max(0, offer.stock - qtyPurchased),
          };
        }
        return { ...offer };
      });

      // 3. Preparar a encomenda demonstrativa com cópia integral dos dados
      const orderGroups: DemoOrderGroup[] = summary.groups.map((g) => ({
        sellerId: g.sellerId,
        sellerName: g.sellerName,
        subtotalInCents: g.subtotalInCents,
        items: g.items.map((it) => ({
          productId: it.productId,
          productName: it.productName,
          sellerId: it.sellerId,
          sellerName: it.sellerName,
          priceInCents: it.priceInCents,
          quantity: it.quantity,
        })),
      }));

      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const newOrder: DemoOrder = {
        id: `ord-sim-${Date.now().toString().slice(-6)}-${randomSuffix}`,
        createdAt: new Date().toISOString(),
        groups: orderGroups,
        totalInCents: summary.totalInCents,
      };

      const updatedOrders = [newOrder, ...currentSnapshot.orders];

      // 4. Construir o novo snapshot consistente: novas ofertas + nova encomenda + carrinho limpo
      const nextSnapshot: MarketplaceSnapshot = {
        ...currentSnapshot,
        offers: updatedOffers,
        orders: updatedOrders,
        cart: [],
      };

      // 5. Persistir numa ÚNICA operação atómica de localStorage.setItem
      // Se este setItem falhar (ex: quota excedida), lança exceção e NENHUMA alteração é efetuada no armazenamento!
      this.persistSnapshot(nextSnapshot);

      // 6. Notificar a aplicação apenas APÓS persistência bem-sucedida
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nexo-cart-updated'));
      }

      return {
        success: true,
        order: newOrder,
      };
    } catch (err) {
      console.error('Falha ao persistir a encomenda no armazenamento local:', err);
      // Em caso de erro:
      // - O armazenamento local preservou integralmente o stock, encomendas e carrinho anteriores
      // - Propagamos a falha com mensagem compreensível permitindo nova tentativa
      return {
        success: false,
        error: 'Não foi possível concluir a compra devido a uma falha no armazenamento local. O teu carrinho e o stock foram preservados. Podes tentar novamente.',
      };
    } finally {
      // Liberta sempre o bloqueio de checkout para permitir novas tentativas
      isCheckingOutLock = false;
    }
  },

  getProductsWithOffers(): ProductWithOffers[] {
    const products = this.getProducts();
    const sellers = this.getSellers();
    const offers = this.getOffers();

    const sellersMap = new Map<string, Seller>(sellers.map((s) => [s.id, s]));

    return products.map((product) => {
      const productOffers = offers
        .filter((o) => o.productId === product.id)
        .map((offer) => ({
          ...offer,
          seller: sellersMap.get(offer.sellerId) || {
            id: offer.sellerId,
            name: 'Loja Não Identificada',
            rating: 0,
            city: 'Portugal',
          },
        }));

      // Ofertas com stock
      const inStockOffers = productOffers.filter((o) => o.stock > 0);
      const hasStock = inStockOffers.length > 0;
      const totalStock = productOffers.reduce((acc, curr) => acc + curr.stock, 0);

      let minPriceInCents: number | null = null;
      if (hasStock) {
        minPriceInCents = Math.min(...inStockOffers.map((o) => o.priceInCents));
      } else if (productOffers.length > 0) {
        // Se nenhuma tiver stock, registamos o menor preço de referência
        minPriceInCents = Math.min(...productOffers.map((o) => o.priceInCents));
      }

      return {
        ...product,
        offers: productOffers,
        minPriceInCents,
        hasStock,
        totalStock,
      };
    });
  },

  getProductWithOffersById(id: string): ProductWithOffers | null {
    const all = this.getProductsWithOffers();
    const found = all.find((p) => p.id === id);
    return found || null;
  },

  getOffersBySeller(sellerId: string): Offer[] {
    const snapshot = this.getSnapshot();
    return snapshot.offers.filter((o) => o.sellerId === sellerId);
  },

  getOffersDetailedBySeller(sellerId: string): SellerOfferItem[] {
    const snapshot = this.getSnapshot();
    const productsMap = new Map<string, Product>(snapshot.products.map((p) => [p.id, p]));
    const sellerOffers = snapshot.offers.filter((o) => o.sellerId === sellerId);

    const detailed: SellerOfferItem[] = [];
    for (const offer of sellerOffers) {
      const product = productsMap.get(offer.productId);
      if (product) {
        detailed.push({
          ...offer,
          product,
        });
      }
    }
    return detailed;
  },

  getAvailableProductsForSeller(sellerId: string): Product[] {
    const snapshot = this.getSnapshot();
    const existingProductIds = new Set(
      snapshot.offers.filter((o) => o.sellerId === sellerId).map((o) => o.productId)
    );
    return snapshot.products.filter((p) => !existingProductIds.has(p.id));
  },

  createOffer(params: {
    sellerId: string;
    productId: string;
    priceInCents: number;
    stock: number;
  }): { success: boolean; offer?: Offer; error?: string } {
    const snapshot = this.getSnapshot();

    const sellerExists = snapshot.sellers.some((s) => s.id === params.sellerId);
    if (!sellerExists) {
      return { success: false, error: 'A loja selecionada não existe.' };
    }

    const productExists = snapshot.products.some((p) => p.id === params.productId);
    if (!productExists) {
      return { success: false, error: 'O produto selecionado não existe no catálogo.' };
    }

    if (!Number.isInteger(params.priceInCents) || params.priceInCents <= 0) {
      return { success: false, error: 'O preço deve ser um valor inteiro positivo em cêntimos (superior a 0,00 €).' };
    }

    if (!Number.isInteger(params.stock) || params.stock < 0) {
      return { success: false, error: 'O stock deve ser um número inteiro não negativo (0 ou superior).' };
    }

    const duplicate = snapshot.offers.some(
      (o) => o.sellerId === params.sellerId && o.productId === params.productId
    );
    if (duplicate) {
      return {
        success: false,
        error: 'Esta loja já possui uma oferta registada para este produto. Edita a oferta existente.',
      };
    }

    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const newOffer: Offer = {
      id: `off-${Date.now().toString().slice(-6)}-${randomSuffix}`,
      productId: params.productId,
      sellerId: params.sellerId,
      priceInCents: params.priceInCents,
      stock: params.stock,
    };

    const nextSnapshot: MarketplaceSnapshot = {
      ...snapshot,
      offers: [...snapshot.offers, newOffer],
    };

    try {
      this.persistSnapshot(nextSnapshot);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nexo-catalog-updated'));
      }
      return { success: true, offer: newOffer };
    } catch (err) {
      console.error('Falha ao gravar oferta no armazenamento local:', err);
      return {
        success: false,
        error: 'Falha ao gravar no armazenamento local. Os dados foram preservados. Podes tentar novamente.',
      };
    }
  },

  updateOffer(
    offerId: string,
    updates: { priceInCents: number; stock: number }
  ): { success: boolean; offer?: Offer; error?: string } {
    const snapshot = this.getSnapshot();

    const targetIndex = snapshot.offers.findIndex((o) => o.id === offerId);
    if (targetIndex === -1) {
      return { success: false, error: 'A oferta selecionada não existe.' };
    }

    if (!Number.isInteger(updates.priceInCents) || updates.priceInCents <= 0) {
      return { success: false, error: 'O preço deve ser um valor inteiro positivo em cêntimos (superior a 0,00 €).' };
    }

    if (!Number.isInteger(updates.stock) || updates.stock < 0) {
      return { success: false, error: 'O stock deve ser um número inteiro não negativo (0 ou superior).' };
    }

    const updatedOffer: Offer = {
      ...snapshot.offers[targetIndex],
      priceInCents: updates.priceInCents,
      stock: updates.stock,
    };

    const updatedOffers = [...snapshot.offers];
    updatedOffers[targetIndex] = updatedOffer;

    const nextSnapshot: MarketplaceSnapshot = {
      ...snapshot,
      offers: updatedOffers,
    };

    try {
      this.persistSnapshot(nextSnapshot);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nexo-catalog-updated'));
        window.dispatchEvent(new CustomEvent('nexo-cart-updated'));
      }
      return { success: true, offer: updatedOffer };
    } catch (err) {
      console.error('Falha ao atualizar oferta no armazenamento local:', err);
      return {
        success: false,
        error: 'Falha ao gravar no armazenamento local. Os dados foram preservados. Podes tentar novamente.',
      };
    }
  },

  getOrdersForSeller(sellerId: string): SellerOrderView[] {
    const snapshot = this.getSnapshot();
    const result: SellerOrderView[] = [];

    for (const order of snapshot.orders) {
      const matchingGroups = order.groups.filter((g) => g.sellerId === sellerId);
      if (matchingGroups.length > 0) {
        const items = matchingGroups.flatMap((g) => g.items);
        const subtotalInCents = matchingGroups.reduce((acc, g) => acc + g.subtotalInCents, 0);
        const sellerName = matchingGroups[0]?.sellerName || 'Loja Parceira';

        result.push({
          orderId: order.id,
          createdAt: order.createdAt,
          sellerId,
          sellerName,
          items,
          subtotalInCents,
        });
      }
    }

    return result;
  },
};

