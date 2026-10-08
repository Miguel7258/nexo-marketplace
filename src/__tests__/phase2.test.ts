import { describe, it, expect, beforeEach } from 'vitest';
import { StorageService, storageAdapter, STORAGE_KEYS } from '../data/storage';

describe('Fase 2 - Compra Simulada, Carrinho e Revalidação', () => {
  beforeEach(() => {
    StorageService.clearRaw();
    StorageService.resetToInitialData();
  });

  describe('Totais e Agrupamento por Vendedor', () => {
    it('deve adicionar artigos ao carrinho e agrupar por vendedor com cálculo de subtotais e total em cêntimos', () => {
      // prod-1 oferta de TechNorte: off-1 (899,00 € = 89900 cêntimos, stock 6)
      // prod-8 oferta de ByteZone: off-12 (99,00 € = 9900 cêntimos, stock 15)
      const res1 = StorageService.addToCart('off-1', 2);
      expect(res1.success).toBe(true);

      const res2 = StorageService.addToCart('off-12', 1);
      expect(res2.success).toBe(true);

      const summary = StorageService.getCartSummary();

      // Total de artigos e grupos
      expect(summary.totalQuantity).toBe(3);
      expect(summary.groups.length).toBe(2);

      // Grupo TechNorte
      const techNorteGroup = summary.groups.find((g) => g.sellerId === 'seller-technorte');
      expect(techNorteGroup).toBeDefined();
      expect(techNorteGroup?.sellerName).toBe('TechNorte');
      expect(techNorteGroup?.items.length).toBe(1);
      expect(techNorteGroup?.items[0].quantity).toBe(2);
      expect(techNorteGroup?.items[0].priceInCents).toBe(89900);
      expect(techNorteGroup?.items[0].itemTotalInCents).toBe(179800); // 2 * 89900
      expect(techNorteGroup?.subtotalInCents).toBe(179800);

      // Grupo ByteZone
      const byteZoneGroup = summary.groups.find((g) => g.sellerId === 'seller-bytezone');
      expect(byteZoneGroup).toBeDefined();
      expect(byteZoneGroup?.sellerName).toBe('ByteZone');
      expect(byteZoneGroup?.items.length).toBe(1);
      expect(byteZoneGroup?.items[0].quantity).toBe(1);
      expect(byteZoneGroup?.items[0].priceInCents).toBe(9900);
      expect(byteZoneGroup?.items[0].itemTotalInCents).toBe(9900);
      expect(byteZoneGroup?.subtotalInCents).toBe(9900);

      // Total global
      expect(summary.totalInCents).toBe(179800 + 9900); // 189700 cêntimos (1897,00 €)
    });

    it('deve remover artigos e atualizar quantidades e subtotais', () => {
      StorageService.addToCart('off-1', 2);
      StorageService.addToCart('off-12', 3);

      // Atualizar quantidade de off-12 para 2
      const updateRes = StorageService.updateCartQuantity('off-12', 2);
      expect(updateRes.success).toBe(true);

      let summary = StorageService.getCartSummary();
      expect(summary.totalQuantity).toBe(4);
      const byteZoneGroup = summary.groups.find((g) => g.sellerId === 'seller-bytezone');
      expect(byteZoneGroup?.subtotalInCents).toBe(19800); // 2 * 9900

      // Remover off-1
      StorageService.removeFromCart('off-1');
      summary = StorageService.getCartSummary();
      expect(summary.groups.length).toBe(1);
      expect(summary.totalInCents).toBe(19800);

      // Reduzir quantidade para 0 remove o artigo
      StorageService.updateCartQuantity('off-12', 0);
      summary = StorageService.getCartSummary();
      expect(summary.groups.length).toBe(0);
      expect(summary.totalQuantity).toBe(0);
      expect(summary.totalInCents).toBe(0);
    });
  });

  describe('Limites de Stock e Revalidação', () => {
    it('deve impedir adicionar quantidade superior ao stock disponível', () => {
      // off-1 tem stock 6
      StorageService.addToCart('off-1', 6);

      // Tentar adicionar mais 1 unidade deve ser recusado
      const overflowRes = StorageService.addToCart('off-1', 1);
      expect(overflowRes.success).toBe(false);
      expect(overflowRes.error).toContain('quantidade máxima disponível');

      const cart = StorageService.getCart();
      expect(cart.find((i) => i.offerId === 'off-1')?.quantity).toBe(6);
    });

    it('deve rejeitar adição de oferta esgotada (stock = 0)', () => {
      // prod-6 oferta off-9 tem stock 0
      const res = StorageService.addToCart('off-9', 1);
      expect(res.success).toBe(false);
      expect(res.error).toContain('esgotada');

      const cart = StorageService.getCart();
      expect(cart.length).toBe(0);
    });

    it('deve limitar atualização de quantidade ao stock existente', () => {
      // off-1 tem stock 6
      StorageService.addToCart('off-1', 2);

      const res = StorageService.updateCartQuantity('off-1', 10);
      expect(res.success).toBe(false);
      expect(res.error).toContain('limitada ao stock existente');

      const cart = StorageService.getCart();
      expect(cart.find((i) => i.offerId === 'off-1')?.quantity).toBe(6);
    });

    it('deve revalidar e ajustar quantidade quando o stock diminui externamente', () => {
      // Utilizador adiciona 4 unidades de off-1 (stock atual = 6)
      StorageService.addToCart('off-1', 4);

      // Simular redução externa de stock da oferta para 2 unidades
      const offers = StorageService.getOffers();
      const off = offers.find((o) => o.id === 'off-1');
      if (off) off.stock = 2;
      StorageService.setRawItem('nexo_offers_v1', JSON.stringify(offers));

      // Revalidação antes da compra
      const revalidation = StorageService.revalidateCart();
      expect(revalidation.valid).toBe(false);
      expect(revalidation.changes.length).toBeGreaterThan(0);
      expect(revalidation.changes[0]).toContain('ajustada de 4 para 2');

      const updatedCart = StorageService.getCart();
      expect(updatedCart.find((i) => i.offerId === 'off-1')?.quantity).toBe(2);
    });

    it('deve revalidar e remover artigo quando a oferta esgota externamente', () => {
      StorageService.addToCart('off-1', 2);

      // Simular oferta esgotada externamente
      const offers = StorageService.getOffers();
      const off = offers.find((o) => o.id === 'off-1');
      if (off) off.stock = 0;
      StorageService.setRawItem('nexo_offers_v1', JSON.stringify(offers));

      const revalidation = StorageService.revalidateCart();
      expect(revalidation.valid).toBe(false);
      expect(revalidation.changes.length).toBe(1);
      expect(revalidation.changes[0]).toContain('esgotou e foi removido');

      const updatedCart = StorageService.getCart();
      expect(updatedCart.length).toBe(0);
    });

    it('deve revalidar e alertar quando o preço da oferta é alterado', () => {
      StorageService.addToCart('off-1', 1);

      // Simular alteração de preço de 89900 para 94900
      const offers = StorageService.getOffers();
      const off = offers.find((o) => o.id === 'off-1');
      if (off) off.priceInCents = 94900;
      StorageService.setRawItem('nexo_offers_v1', JSON.stringify(offers));

      const revalidation = StorageService.revalidateCart();
      expect(revalidation.valid).toBe(false);
      expect(revalidation.changes[0]).toContain('alterou de');

      // Segunda validação com o carrinho já atualizado deve passar
      const secondRevalidation = StorageService.revalidateCart();
      expect(secondRevalidation.valid).toBe(true);
    });
  });

  describe('Conclusão de Compra e Proteção contra Duplicação', () => {
    it('deve concluir a compra demonstrativa, atualizar o stock das ofertas, esvaziar o carrinho e registar a encomenda', () => {
      // Adicionar artigos de 2 lojas diferentes
      // off-1: TechNorte, stock 6, 89900 cêntimos
      // off-12: ByteZone, stock 15, 9900 cêntimos
      StorageService.addToCart('off-1', 2);
      StorageService.addToCart('off-12', 3);

      const initialOffers = StorageService.getOffers();
      const off1StockBefore = initialOffers.find((o) => o.id === 'off-1')?.stock ?? 0;
      const off12StockBefore = initialOffers.find((o) => o.id === 'off-12')?.stock ?? 0;

      const checkoutRes = StorageService.checkoutDemoOrder();
      expect(checkoutRes.success).toBe(true);
      expect(checkoutRes.order).toBeDefined();

      const order = checkoutRes.order!;
      expect(order.groups.length).toBe(2);
      expect(order.totalInCents).toBe(2 * 89900 + 3 * 9900); // 179800 + 29700 = 209500

      // Carrinho deve ficar vazio
      expect(StorageService.getCart().length).toBe(0);

      // Stock das ofertas em storage deve ter sido subtraído
      const updatedOffers = StorageService.getOffers();
      const off1StockAfter = updatedOffers.find((o) => o.id === 'off-1')?.stock;
      const off12StockAfter = updatedOffers.find((o) => o.id === 'off-12')?.stock;

      expect(off1StockAfter).toBe(off1StockBefore - 2);
      expect(off12StockAfter).toBe(off12StockBefore - 3);

      // Encomenda deve constar no histórico
      const orders = StorageService.getOrders();
      expect(orders[0].id).toBe(order.id);
      expect(orders[0].groups[0].items[0].productName).toBeDefined();
      expect(orders[0].groups[0].items[0].priceInCents).toBeGreaterThan(0);
    });

    it('deve proteger contra conclusão duplicada com carrinho vazio ou chamadas repetidas', () => {
      // Tentar checkout com carrinho vazio
      const emptyRes = StorageService.checkoutDemoOrder();
      expect(emptyRes.success).toBe(false);
      expect(emptyRes.error).toContain('carrinho está vazio');

      // Adicionar artigo e efetuar checkout
      StorageService.addToCart('off-1', 1);
      const firstRes = StorageService.checkoutDemoOrder();
      expect(firstRes.success).toBe(true);

      // Segundo clique imediato encontra o carrinho esvaziado
      const secondRes = StorageService.checkoutDemoOrder();
      expect(secondRes.success).toBe(false);
      expect(secondRes.error).toContain('carrinho está vazio');
    });

    it('não deve efetuar compra se a revalidação detetar discrepância de stock', () => {
      StorageService.addToCart('off-1', 3);

      // Reduzir stock para 1
      const offers = StorageService.getOffers();
      const off = offers.find((o) => o.id === 'off-1');
      if (off) off.stock = 1;
      StorageService.setRawItem('nexo_offers_v1', JSON.stringify(offers));

      const res = StorageService.checkoutDemoOrder();
      expect(res.success).toBe(false);
      expect(res.changes).toBeDefined();
      expect(res.changes?.length).toBeGreaterThan(0);

      // A encomenda NÃO pode ter sido gerada
      const orders = StorageService.getOrders();
      expect(orders.some((o) => o.id.startsWith('ord-sim-'))).toBe(false);

      // O stock do produto não deve ter sido consumido ainda
      const currentOffer = StorageService.getOffers().find((o) => o.id === 'off-1');
      expect(currentOffer?.stock).toBe(1);
    });
  });

  describe('Persistência e Reposição Integral da Demonstração', () => {
    it('deve persistir o carrinho em armazenamento local', () => {
      StorageService.addToCart('off-1', 2);
      const rawStored = StorageService.getCart();
      expect(rawStored.length).toBe(1);
      expect(rawStored[0].offerId).toBe('off-1');
      expect(rawStored[0].quantity).toBe(2);
    });

    it('deve repor integralmente a demonstração restaurando stock, encomendas originais e esvaziando o carrinho', () => {
      // Fazer uma compra simulada para alterar stock e histórico
      StorageService.addToCart('off-1', 3);
      StorageService.checkoutDemoOrder();

      expect(StorageService.getOffers().find((o) => o.id === 'off-1')?.stock).toBe(3);
      expect(StorageService.getOrders().length).toBeGreaterThan(1);

      // Adicionar novo artigo ao carrinho
      StorageService.addToCart('off-12', 2);
      expect(StorageService.getCart().length).toBe(1);

      // Executar reposição integral
      StorageService.resetToInitialData();

      // Verificar que o stock inicial foi reposto (off-1 tinha 6)
      expect(StorageService.getOffers().find((o) => o.id === 'off-1')?.stock).toBe(6);
      // Carrinho esvaziado
      expect(StorageService.getCart().length).toBe(0);
      // Encomendas voltam às iniciais (1 encomenda demo inicial)
      expect(StorageService.getOrders().length).toBe(1);
    });
  });

  describe('Integridade e Tratamento de Falhas de Armazenamento', () => {
    it('deve impedir falso sucesso e preservar integralmente stock, encomendas e carrinho quando setItem falha', () => {
      // Adicionar artigos de duas lojas parceiras
      StorageService.addToCart('off-1', 2); // TechNorte, stock 6
      StorageService.addToCart('off-12', 3); // ByteZone, stock 15

      const initialCart = StorageService.getCart();
      expect(initialCart.length).toBe(2);
      const initialOrders = StorageService.getOrders();
      expect(initialOrders.length).toBe(1);

      // Simular falha de setItem durante a conclusão da compra (ex: QuotaExceededError)
      const originalSetItem = storageAdapter.setItem;
      storageAdapter.setItem = (key: string, value: string) => {
        if (key === STORAGE_KEYS.APP_SNAPSHOT) {
          throw new Error('QuotaExceededError: limite de armazenamento local excedido');
        }
        originalSetItem.call(storageAdapter, key, value);
      };

      let result;
      try {
        result = StorageService.checkoutDemoOrder();
      } finally {
        // Restaurar o adaptador
        storageAdapter.setItem = originalSetItem;
      }

      // 1. Ausência de falso sucesso e mensagem compreensível
      expect(result.success).toBe(false);
      expect(result.order).toBeUndefined();
      expect(result.error).toContain('falha no armazenamento local');
      expect(result.error).toContain('preservados');

      // 2. Stock mantido inalterado (não consumido)
      const offersAfter = StorageService.getOffers();
      expect(offersAfter.find((o) => o.id === 'off-1')?.stock).toBe(6);
      expect(offersAfter.find((o) => o.id === 'off-12')?.stock).toBe(15);

      // 3. Carrinho mantido integralmente (não perdido nem esvaziado)
      const cartAfter = StorageService.getCart();
      expect(cartAfter.length).toBe(2);
      expect(cartAfter.find((i) => i.offerId === 'off-1')?.quantity).toBe(2);
      expect(cartAfter.find((i) => i.offerId === 'off-12')?.quantity).toBe(3);

      // 4. Encomendas inalteradas (sem encomenda órfã ou corrompida)
      const ordersAfter = StorageService.getOrders();
      expect(ordersAfter.length).toBe(1);
      expect(ordersAfter[0].id).toBe(initialOrders[0].id);
    });

    it('deve libertar o bloqueio de checkout após erro de setItem e permitir nova tentativa com sucesso', () => {
      StorageService.addToCart('off-1', 1);

      // Simular falha na primeira tentativa
      const originalSetItem = storageAdapter.setItem;
      let failOnce = true;
      storageAdapter.setItem = (key: string, value: string) => {
        if (key === STORAGE_KEYS.APP_SNAPSHOT && failOnce) {
          failOnce = false;
          throw new Error('QuotaExceededError temporário');
        }
        originalSetItem.call(storageAdapter, key, value);
      };

      let firstRes;
      try {
        firstRes = StorageService.checkoutDemoOrder();
      } finally {
        storageAdapter.setItem = originalSetItem;
      }

      expect(firstRes.success).toBe(false);

      // O bloqueio de checkout deve ter sido libertado no finally
      // A segunda tentativa (após restabelecimento do armazenamento) deve ter sucesso
      const retryRes = StorageService.checkoutDemoOrder();
      expect(retryRes.success).toBe(true);
      expect(retryRes.order).toBeDefined();

      // Agora sim: stock deduzido e carrinho limpo
      expect(StorageService.getOffers().find((o) => o.id === 'off-1')?.stock).toBe(5);
      expect(StorageService.getCart().length).toBe(0);
    });

    it('deve manter a integridade dos dados e do carrinho após recarregar subsequente a uma falha', () => {
      StorageService.addToCart('off-1', 2);
      StorageService.addToCart('off-12', 1);

      const originalSetItem = storageAdapter.setItem;
      storageAdapter.setItem = (key: string, value: string) => {
        if (key === STORAGE_KEYS.APP_SNAPSHOT) {
          throw new Error('Disco cheio');
        }
        originalSetItem.call(storageAdapter, key, value);
      };

      try {
        StorageService.checkoutDemoOrder();
      } finally {
        storageAdapter.setItem = originalSetItem;
      }

      // Simulação de recarga da aplicação: ler diretamente o snapshot persistido
      const snapshotAfterReload = StorageService.getSnapshot();

      expect(snapshotAfterReload.cart.length).toBe(2);
      expect(snapshotAfterReload.cart.reduce((acc, it) => acc + it.quantity, 0)).toBe(3);
      expect(snapshotAfterReload.offers.find((o) => o.id === 'off-1')?.stock).toBe(6);
      expect(snapshotAfterReload.offers.find((o) => o.id === 'off-12')?.stock).toBe(15);
      expect(snapshotAfterReload.orders.length).toBe(1);
    });

    it('deve migrar dados legados preservando artigos de encomendas e carrinho', () => {
      StorageService.clearRaw();

      // Injetar dados legados como se fossem versões anteriores da fase 1/2
      storageAdapter.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(StorageService.getProducts()));
      storageAdapter.setItem(STORAGE_KEYS.OFFERS, JSON.stringify(StorageService.getOffers()));
      storageAdapter.setItem(STORAGE_KEYS.SELLERS, JSON.stringify(StorageService.getSellers()));
      storageAdapter.setItem(
        STORAGE_KEYS.CART,
        JSON.stringify([{ offerId: 'off-1', quantity: 2, priceInCents: 89900 }])
      );
      // Garantir que a nova chave de snapshot unificado não existe
      storageAdapter.removeItem(STORAGE_KEYS.APP_SNAPSHOT);

      // Leitura com migração automática
      const migrated = StorageService.getSnapshot();
      expect(migrated.version).toBe(1);
      expect(migrated.cart.length).toBe(1);
      expect(migrated.cart[0].offerId).toBe('off-1');
      expect(migrated.cart[0].quantity).toBe(2);
      expect(migrated.products.length).toBe(12);

      // O snapshot deve ter sido gravado na chave unificada
      expect(storageAdapter.getItem(STORAGE_KEYS.APP_SNAPSHOT)).toBeDefined();
    });
  });
});
