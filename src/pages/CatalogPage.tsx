import React, { useState, useMemo, useEffect } from 'react';
import { StorageService } from '../data/storage';
import { ProductWithOffers, FilterState, Category } from '../types';
import { ProductCard } from '../components/ProductCard';
import { FilterSidebar } from '../components/FilterSidebar';
import { SortBar } from '../components/SortBar';
import { EmptyState } from '../components/EmptyState';
import { parsePriceToCents } from '../utils/formatters';

const INITIAL_FILTERS: FilterState = {
  search: '',
  category: 'todas',
  minPriceEuros: '',
  maxPriceEuros: '',
  sortBy: 'relevance',
};

export const CatalogPage: React.FC = () => {
  const [products, setProducts] = useState<ProductWithOffers[]>(() =>
    StorageService.getProductsWithOffers()
  );

  useEffect(() => {
    const handleUpdate = () => {
      setProducts(StorageService.getProductsWithOffers());
    };
    window.addEventListener('nexo-catalog-updated', handleUpdate);
    window.addEventListener('nexo-cart-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('nexo-catalog-updated', handleUpdate);
      window.removeEventListener('nexo-cart-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);

  const handleFilterChange = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  // Contagem por categoria com base em todos os produtos
  const categoryCounts = useMemo(() => {
    const counts: Record<Category | 'todas', number> = {
      todas: products.length,
      computadores: 0,
      smartphones: 0,
      audio: 0,
      acessorios: 0,
    };

    products.forEach((p) => {
      if (counts[p.category] !== undefined) {
        counts[p.category]++;
      }
    });

    return counts;
  }, [products]);

  // Filtragem e Ordenação
  const filteredAndSortedProducts = useMemo(() => {
    const searchTrimmed = filters.search.trim().toLowerCase();
    const minCents = parsePriceToCents(filters.minPriceEuros);
    const maxCents = parsePriceToCents(filters.maxPriceEuros);

    const filtered = products.filter((product) => {
      // 1. Pesquisa por nome, descrição ou especificações
      if (searchTrimmed) {
        const matchesName = product.name.toLowerCase().includes(searchTrimmed);
        const matchesDesc = product.description.toLowerCase().includes(searchTrimmed);
        const matchesSpec = product.specs.some(
          (s) =>
            s.label.toLowerCase().includes(searchTrimmed) ||
            s.value.toLowerCase().includes(searchTrimmed)
        );
        if (!matchesName && !matchesDesc && !matchesSpec) {
          return false;
        }
      }

      // 2. Categoria
      if (filters.category !== 'todas' && product.category !== filters.category) {
        return false;
      }

      // 3. Preço Mínimo
      const effectivePrice = product.minPriceInCents;
      if (minCents !== null) {
        if (effectivePrice === null || effectivePrice < minCents) {
          return false;
        }
      }

      // 4. Preço Máximo
      if (maxCents !== null) {
        if (effectivePrice === null || effectivePrice > maxCents) {
          return false;
        }
      }

      return true;
    });

    // Ordenação
    return filtered.sort((a, b) => {
      if (filters.sortBy === 'price-asc') {
        const priceA = a.minPriceInCents ?? Number.MAX_SAFE_INTEGER;
        const priceB = b.minPriceInCents ?? Number.MAX_SAFE_INTEGER;
        return priceA - priceB;
      }
      if (filters.sortBy === 'price-desc') {
        const priceA = a.minPriceInCents ?? -1;
        const priceB = b.minPriceInCents ?? -1;
        return priceB - priceA;
      }
      if (filters.sortBy === 'name-asc') {
        return a.name.localeCompare(b.name, 'pt-PT');
      }
      if (filters.sortBy === 'name-desc') {
        return b.name.localeCompare(a.name, 'pt-PT');
      }
      // 'relevance' (preserva ordem original dos produtos)
      return 0;
    });
  }, [products, filters]);

  return (
    <main id="main-content" className="catalog-page" tabIndex={-1}>
      <div className="container">
        {/* Banner de Boas-vindas / Contexto */}
        <section className="catalog-hero" aria-labelledby="catalog-hero-title">
          <div className="hero-text-block">
            <h1 id="catalog-hero-title" className="hero-title">
              Catálogo Tecnológico Multivendedor
            </h1>
            <p className="hero-description">
              Explora o catálogo com ofertas em tempo real de várias lojas independentes. Compara preços em euros e encontra a melhor opção com stock garantido.
            </p>
          </div>
        </section>

        {/* Barra de Pesquisa e Ordenação */}
        <SortBar
          search={filters.search}
          onSearchChange={(val) => handleFilterChange('search', val)}
          sortBy={filters.sortBy}
          onSortChange={(val) => handleFilterChange('sortBy', val)}
          totalResults={filteredAndSortedProducts.length}
        />

        {/* Layout Principal: Filtros + Grid de Produtos */}
        <div className="catalog-layout">
          <FilterSidebar
            filters={filters}
            onFilterChange={handleFilterChange}
            onResetFilters={handleResetFilters}
            categoryCounts={categoryCounts}
          />

          <section className="catalog-results-section" aria-label="Grelha de produtos">
            {filteredAndSortedProducts.length === 0 ? (
              <EmptyState
                onClearFilters={handleResetFilters}
                searchTerm={filters.search}
              />
            ) : (
              <div className="product-grid">
                {filteredAndSortedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
};