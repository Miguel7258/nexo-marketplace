import { describe, it, expect, beforeEach } from 'vitest';
import { StorageService, storageAdapter } from '../data/storage';

describe('Fase 3 - Área do Vendedor: Ofertas, Isolamento e Histórico', () => {
  beforeEach(() => {
    StorageService.clearRaw();
    StorageService.resetToInitialData();
  });

  describe('Validação de Preço e Stock', () => {
    it('deve rejeitar criação de oferta com preço zero, negativo ou não inteiro em cêntimos', () => {
      // Preço 0
      const resZero = StorageService.createOffer({
        sellerId: 'seller-gadgethub',
        productId: 'prod-1',
        priceInCents: 0,
        stock: 5,
      });
      expect(resZero.success).toBe(false);
      expect(resZero.error).toContain('preço');

      // Preço negativo
      const resNeg = StorageService.createOffer({
        sellerId: 'seller-gadgethub',
        productId: 'prod-1',
        priceInCents: -1500,
        stock: 5,
      });
      expect(resNeg.success).toBe(false);
      expect(resNeg.error).toContain('preço');

      // Preço não inteiro
      const resFloat = StorageService.createOffer({
        sellerId: 'seller-gadgethub',
        productId: 'prod-1',
        priceInCents: 99.5,
        stock: 5,
      });
      expect(resFloat.success).toBe(false);
      expect(resFloat.error).toContain('preço');
    });

    it('deve rejeitar criação de oferta com stock negativo ou não inteiro', () => {
      // Stock negativo
      const resNegStock = StorageService.createOffer({
        sellerId: 'seller-gadgethub',
        productId: 'prod-1',
        priceInCents: 89900,
        stock: -1,
      });
      expect(resNegStock.success).toBe(false);
      expect(resNegStock.error).toContain('stock');

      // Stock não inteiro
      const resFloatStock = StorageService.createOffer({
        sellerId: 'seller-gadgethub',
        productId: 'prod-1',
        priceInCents: 89900,
        stock: 2.5,
      });
      expect(resFloatStock.success).toBe(false);
      expect(resFloatStock.error).toContain('stock');
    });

    it('deve aceitar criação válida com stock zero (oferta esgotada) e preço positivo', () => {
      const resValid = StorageService.createOffer({
        sellerId: 'seller-gadgethub',
        productId: 'prod-1',
        priceInCents: 95000,
        stock: 0,
      });
      expect(resValid.success).toBe(true);
      expect(resValid.offer).toBeDefined();
      expect(resValid.offer?.stock).toBe(0);
      expect(resValid.offer?.priceInCents).toBe(95000);
      expect(resValid.offer?.sellerId).toBe('seller-gadgethub');
    });

    it('deve validar preço e stock na edição de uma oferta existente', () => {
      // off-1 pertence a TechNorte
      const resBadPrice = StorageService.updateOffer('off-1', {
        priceInCents: 0,
        stock: 10,
      });
      expect(resBadPrice.success).toBe(false);
      expect(resBadPrice.error).toContain('preço');

      const resBadStock = StorageService.updateOffer('off-1', {
        priceInCents: 85000,
        stock: -3,
      });
      expect(resBadStock.success).toBe(false);
      expect(resBadStock.error).toContain('stock');

      // Edição válida
      const resOk = StorageService.updateOffer('off-1', {
        priceInCents: 84900,
        stock: 12,
      });
      expect(resOk.success).toBe(true);
      expect(resOk.offer?.priceInCents).toBe(84900);
      expect(resOk.offer?.stock).toBe(12);
    });
  });

  describe('Impedimento de Ofertas Duplicadas', () => {
    it('deve impedir criação de oferta duplicada para o mesmo par loja/produto', () => {
      // TechNorte já tem oferta para prod-1 (off-1)
      const resDup = StorageService.createOffer({
        sellerId: 'seller-technorte',
        productId: 'prod-1',
        priceInCents: 79900,
        stock: 5,
      });

      expect(resDup.success).toBe(false);
      expect(resDup.error).toContain('já possui uma oferta');

      // As ofertas de TechNorte devem manter-se inalteradas
      const techOffers = StorageService.getOffersBySeller('seller-technorte');
      const prod1Offers = techOffers.filter((o) => o.productId === 'prod-1');
      expect(prod1Offers.length).toBe(1);
      expect(prod1Offers[0].id).toBe('off-1');
    });

    it('deve permitir que lojas diferentes criem ofertas para o mesmo produto (concorrência legítima)', () => {
      // GadgetHub ainda não tem oferta para prod-1 (TechNorte tem off-1)
      const resGadget = StorageService.createOffer({
        sellerId: 'seller-gadgethub',
        productId: 'prod-1',
        priceInCents: 88900,
        stock: 8,
      });

      expect(resGadget.success).toBe(true);

      const product = StorageService.getProductWithOffersById('prod-1');
      expect(product).toBeDefined();

      const sellersForProd1 = product?.offers.map((o) => o.sellerId);
      expect(sellersForProd1).toContain('seller-technorte');
      expect(sellersForProd1).toContain('seller-gadgethub');
    });
  });

  describe('Isolamento entre Lojas Fictícias', () => {
    it('deve listar apenas as ofertas pertencentes à loja selecionada', () => {
      const techOffers = StorageService.getOffersBySeller('seller-technorte');
      expect(techOffers.length).toBeGreaterThan(0);
      expect(techOffers.every((o) => o.sellerId === 'seller-technorte')).toBe(true);

      const byteOffers = StorageService.getOffersBySeller('seller-bytezone');
      expect(byteOffers.length).toBeGreaterThan(0);
      expect(byteOffers.every((o) => o.sellerId === 'seller-bytezone')).toBe(true);

      // Não deve haver interseção de ofertas
      const techIds = new Set(techOffers.map((o) => o.id));
      expect(byteOffers.some((o) => techIds.has(o.id))).toBe(false);
    });

    it('deve preservar as ofertas de outras lojas ao editar uma oferta', () => {
      // prod-10 possui ofertas de ByteZone (off-14) e TechNorte (off-15)
      const byteInitial = StorageService.getOffers().find((o) => o.id === 'off-14');
      const techInitial = StorageService.getOffers().find((o) => o.id === 'off-15');

      expect(byteInitial).toBeDefined();
      expect(techInitial).toBeDefined();
      expect(byteInitial?.priceInCents).toBe(38900);
      expect(techInitial?.priceInCents).toBe(39900);

      // ByteZone altera o seu preço e stock
      const updateRes = StorageService.updateOffer('off-14', {
        priceInCents: 37900,
        stock: 2,
      });
      expect(updateRes.success).toBe(true);

      // A oferta de TechNorte deve manter-se estritamente intacta
      const techAfter = StorageService.getOffers().find((o) => o.id === 'off-15');
      expect(techAfter?.priceInCents).toBe(39900);
      expect(techAfter?.stock).toBe(techInitial?.stock);
    });

    it('deve consultar apenas os artigos pertencentes à loja selecionada nas encomendas', () => {
      // INITIAL_DEMO_ORDERS contém a encomenda ord-demo-101 com artigos de TechNorte e ByteZone
      const techOrders = StorageService.getOrdersForSeller('seller-technorte');
      const byteOrders = StorageService.getOrdersForSeller('seller-bytezone');
      const gadgetOrders = StorageService.getOrdersForSeller('seller-gadgethub');

      // GadgetHub não participou na ord-demo-101
      expect(gadgetOrders.length).toBe(0);

      // TechNorte vê apenas o seu artigo (prod-1)
      expect(techOrders.length).toBe(1);
      expect(techOrders[0].orderId).toBe('ord-demo-101');
      expect(techOrders[0].items.length).toBe(1);
      expect(techOrders[0].items[0].productId).toBe('prod-1');
      expect(techOrders[0].items[0].sellerId).toBe('seller-technorte');
      expect(techOrders[0].subtotalInCents).toBe(89900);

      // ByteZone vê apenas o seu artigo (prod-8)
      expect(byteOrders.length).toBe(1);
      expect(byteOrders[0].orderId).toBe('ord-demo-101');
      expect(byteOrders[0].items.length).toBe(1);
      expect(byteOrders[0].items[0].productId).toBe('prod-8');
      expect(byteOrders[0].items[0].sellerId).toBe('seller-bytezone');
      expect(byteOrders[0].subtotalInCents).toBe(9900);
    });
  });

  describe('Preservação do Histórico de Encomendas', () => {
    it('deve manter intactos os artigos e preços originais no histórico mesmo após o vendedor alterar preço e stock', () => {
      // Na encomenda ord-demo-101, TechNorte vendeu prod-1 por 89900 cêntimos
      const initialSellerOrders = StorageService.getOrdersForSeller('seller-technorte');
      expect(initialSellerOrders[0].items[0].priceInCents).toBe(89900);

      // O vendedor altera agora o preço da oferta off-1 para 59900 e o stock para 1
      const updateRes = StorageService.updateOffer('off-1', {
        priceInCents: 59900,
        stock: 1,
      });
      expect(updateRes.success).toBe(true);

      // O catálogo tem o novo preço
      const prodInCatalog = StorageService.getProductWithOffersById('prod-1');
      const offer1 = prodInCatalog?.offers.find((o) => o.id === 'off-1');
      expect(offer1?.priceInCents).toBe(59900);

      // O histórico de encomendas PRESERVA o preço original de 89900!
      const ordersAfterUpdate = StorageService.getOrdersForSeller('seller-technorte');
      expect(ordersAfterUpdate[0].items[0].priceInCents).toBe(89900);
      expect(ordersAfterUpdate[0].subtotalInCents).toBe(89900);

      // Também na lista global de encomendas a cópia histórica está intacta
      const allOrders = StorageService.getOrders();
      const demoOrder = allOrders.find((o) => o.id === 'ord-demo-101');
      const techGroup = demoOrder?.groups.find((g) => g.sellerId === 'seller-technorte');
      expect(techGroup?.items[0].priceInCents).toBe(89900);
    });
  });

  describe('Revalidação de Carrinho desencadeada por Edições do Vendedor', () => {
    it('deve desencadear revalidação e bloquear checkout se o vendedor reduzir o stock abaixo do carrinho', () => {
      // off-1 tem stock 6
      StorageService.addToCart('off-1', 4);

      // Vendedor reduz stock para 2
      StorageService.updateOffer('off-1', {
        priceInCents: 89900,
        stock: 2,
      });

      // Checkout deve revalidar e falhar antes de concluir a compra
      const checkoutRes = StorageService.checkoutDemoOrder();
      expect(checkoutRes.success).toBe(false);
      expect(checkoutRes.changes && checkoutRes.changes.length).toBeGreaterThan(0);
      expect(checkoutRes.changes?.[0]).toContain('ajustada');

      // Quantidade no carrinho foi ajustada para o stock disponível (2)
      const cartSummary = StorageService.getCartSummary();
      expect(cartSummary.totalQuantity).toBe(2);
    });

    it('deve desencadear revalidação se o vendedor alterar o preço de um artigo no carrinho', () => {
      // off-1 adicionada com preço 89900
      StorageService.addToCart('off-1', 1);

      // Vendedor altera preço para 79900
      StorageService.updateOffer('off-1', {
        priceInCents: 79900,
        stock: 6,
      });

      // Checkout deve detetar a alteração de preço
      const checkoutRes = StorageService.checkoutDemoOrder();
      expect(checkoutRes.success).toBe(false);
      expect(checkoutRes.changes && checkoutRes.changes.length).toBeGreaterThan(0);
      expect(checkoutRes.changes?.[0]).toContain('alterou');

      // Após a revalidação ter atualizado o preço, nova tentativa de checkout é concluída
      const secondTry = StorageService.checkoutDemoOrder();
      expect(secondTry.success).toBe(true);
      expect(secondTry.order?.totalInCents).toBe(79900);
    });

    it('deve remover do carrinho se o vendedor esgotar o stock (stock 0)', () => {
      StorageService.addToCart('off-1', 2);

      // Vendedor esgota o stock
      StorageService.updateOffer('off-1', {
        priceInCents: 89900,
        stock: 0,
      });

      const checkoutRes = StorageService.checkoutDemoOrder();
      expect(checkoutRes.success).toBe(false);
      expect(checkoutRes.changes?.[0]).toContain('esgotou');

      const cart = StorageService.getCart();
      expect(cart.length).toBe(0);
    });
  });

  describe('Persistência por Snapshot Único e Tratamento de Falhas', () => {
    it('deve persistir alterações no snapshot único e recuperá-las após reinicialização', () => {
      // GadgetHub cria oferta para prod-1 (ainda sem oferta desta loja)
      const res = StorageService.createOffer({
        sellerId: 'seller-gadgethub',
        productId: 'prod-1',
        priceInCents: 91900,
        stock: 14,
      });
      expect(res.success).toBe(true);

      // Simular recarregamento da aplicação
      const snapshot = StorageService.getSnapshot();
      const persistedOffer = snapshot.offers.find((o) => o.id === res.offer?.id);

      expect(persistedOffer).toBeDefined();
      expect(persistedOffer?.priceInCents).toBe(91900);
      expect(persistedOffer?.stock).toBe(14);
      expect(persistedOffer?.sellerId).toBe('seller-gadgethub');
    });

    it('deve impedir falso sucesso e preservar dados se persistSnapshot falhar por QuotaExceededError', () => {
      const initialOffersCount = StorageService.getOffers().length;

      // Injetar erro forçado no storageAdapter.setItem
      const originalSetItem = storageAdapter.setItem;
      storageAdapter.setItem = () => {
        throw new Error('QuotaExceededError: armazenamento cheio');
      };

      try {
        const res = StorageService.createOffer({
          sellerId: 'seller-gadgethub',
          productId: 'prod-3',
          priceInCents: 4990,
          stock: 20,
        });

        // NÃO pode haver falso sucesso!
        expect(res.success).toBe(false);
        expect(res.error).toContain('Falha ao gravar no armazenamento local');
      } finally {
        storageAdapter.setItem = originalSetItem;
      }

      // Os dados no armazenamento foram estritamente preservados
      const offersAfter = StorageService.getOffers();
      expect(offersAfter.length).toBe(initialOffersCount);
    });

    it('deve permitir nova tentativa com sucesso após recuperação de erro temporário de gravação', () => {
      let failCount = 1;
      const originalSetItem = storageAdapter.setItem;

      storageAdapter.setItem = (k, v) => {
        if (failCount > 0) {
          failCount--;
          throw new Error('Falha temporária de disco');
        }
        originalSetItem(k, v);
      };

      try {
        // Primeira tentativa: falha
        const attempt1 = StorageService.updateOffer('off-1', {
          priceInCents: 75000,
          stock: 10,
        });
        expect(attempt1.success).toBe(false);

        // Segunda tentativa (armazenamento restabelecido): sucesso
        const attempt2 = StorageService.updateOffer('off-1', {
          priceInCents: 75000,
          stock: 10,
        });
        expect(attempt2.success).toBe(true);
        expect(attempt2.offer?.priceInCents).toBe(75000);
      } finally {
        storageAdapter.setItem = originalSetItem;
      }

      const offerNow = StorageService.getOffers().find((o) => o.id === 'off-1');
      expect(offerNow?.priceInCents).toBe(75000);
    });
  });
});
