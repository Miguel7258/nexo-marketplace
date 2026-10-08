import { describe, it, expect, beforeEach } from 'vitest';
import { StorageService } from '../data/storage';
import { formatPrice, parsePriceToCents } from '../utils/formatters';

describe('Fase 1 - Regras de Domínio e Camada de Dados', () => {
  beforeEach(() => {
    StorageService.clearRaw();
    StorageService.resetToInitialData();
  });

  it('deve inicializar com 12 produtos, 3 lojas e 4 categorias', () => {
    const products = StorageService.getProducts();
    const sellers = StorageService.getSellers();

    expect(products.length).toBe(12);
    expect(sellers.length).toBe(3);

    const categories = new Set(products.map((p) => p.category));
    expect(categories.has('computadores')).toBe(true);
    expect(categories.has('smartphones')).toBe(true);
    expect(categories.has('audio')).toBe(true);
    expect(categories.has('acessorios')).toBe(true);
    expect(categories.size).toBe(4);
  });

  it('deve demonstrar produto com ofertas concorrentes de duas ou mais lojas', () => {
    const prod1 = StorageService.getProductWithOffersById('prod-1');
    expect(prod1).toBeDefined();
    expect(prod1?.offers.length).toBeGreaterThanOrEqual(2);

    const sellerIds = new Set(prod1?.offers.map((o) => o.sellerId));
    expect(sellerIds.size).toBeGreaterThanOrEqual(2);

    // Deve calcular o menor preço entre as ofertas disponíveis
    expect(prod1?.hasStock).toBe(true);
    expect(prod1?.minPriceInCents).toBe(89900); // 899,00 € (TechNorte 89900 vs ByteZone 92900)
  });

  it('deve indicar produto esgotado quando nenhuma oferta tem stock', () => {
    const foldMaster = StorageService.getProductWithOffersById('prod-6');
    expect(foldMaster).toBeDefined();
    expect(foldMaster?.hasStock).toBe(false);
    expect(foldMaster?.totalStock).toBe(0);
    expect(foldMaster?.offers[0].stock).toBe(0);
  });

  it('deve formatar preços em cêntimos para euros com precisão decimal', () => {
    expect(formatPrice(89900)).toMatch(/899,00\s?€/);
    expect(formatPrice(5990)).toMatch(/59,90\s?€/);
    expect(formatPrice(124900)).toMatch(/1(\.|\s)?249,00\s?€/);
  });

  it('deve converter euros para cêntimos inteiros com segurança', () => {
    expect(parsePriceToCents('100')).toBe(10000);
    expect(parsePriceToCents('49,90')).toBe(4990);
    expect(parsePriceToCents('49.90')).toBe(4990);
    expect(parsePriceToCents('  1 200,50 ')).toBe(120050);
    expect(parsePriceToCents('')).toBeNull();
    expect(parsePriceToCents('abc')).toBeNull();
  });

  it('deve recuperar sem erro se o localStorage contiver dados JSON inválidos', () => {
    StorageService.setRawItem('nexo_products_v1', '{"invalido": true');
    const products = StorageService.getProducts();
    expect(products.length).toBe(12);
  });

  it('deve repor dados demonstrativos para os valores originais', () => {
    // Simular corrupção ou alteração
    StorageService.setRawItem('nexo_products_v1', JSON.stringify([]));
    StorageService.resetToInitialData();
    const products = StorageService.getProducts();
    expect(products.length).toBe(12);
  });

  it('deve filtrar produtos por categoria corretamente', () => {
    const all = StorageService.getProductsWithOffers();
    const computadores = all.filter((p) => p.category === 'computadores');
    const smartphones = all.filter((p) => p.category === 'smartphones');
    const audio = all.filter((p) => p.category === 'audio');
    const acessorios = all.filter((p) => p.category === 'acessorios');

    expect(computadores.length).toBe(3);
    expect(smartphones.length).toBe(3);
    expect(audio.length).toBe(3);
    expect(acessorios.length).toBe(3);
  });

  it('deve filtrar produtos por intervalo de preço usando o menor preço disponível', () => {
    const all = StorageService.getProductsWithOffers();
    const under100 = all.filter((p) => p.minPriceInCents !== null && p.minPriceInCents <= 10000);
    expect(under100.length).toBe(4);
  });

  it('deve ordenar produtos por preço ascendente e descendente', () => {
    const all = StorageService.getProductsWithOffers();

    const sortedAsc = [...all].sort(
      (a, b) => (a.minPriceInCents ?? 0) - (b.minPriceInCents ?? 0)
    );
    expect(sortedAsc[0].id).toBe('prod-12');

    const sortedDesc = [...all].sort(
      (a, b) => (b.minPriceInCents ?? 0) - (a.minPriceInCents ?? 0)
    );
    expect(sortedDesc[0].id).toBe('prod-3');
  });

  it('deve retornar null para produtos inexistentes', () => {
    const notFound = StorageService.getProductWithOffersById('produto-fantasma-123');
    expect(notFound).toBeNull();
  });
});