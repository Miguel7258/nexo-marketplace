import React, { useState } from 'react';
import { Filter, RotateCcw, ChevronDown, ChevronUp, Tag, SlidersHorizontal } from 'lucide-react';
import { Category, FilterState } from '../types';
import { CATEGORY_LABELS } from '../utils/formatters';

interface FilterSidebarProps {
  filters: FilterState;
  onFilterChange: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  onResetFilters: () => void;
  categoryCounts: Record<Category | 'todas', number>;
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  categoryCounts,
}) => {
  const [isOpenMobile, setIsOpenMobile] = useState(false);

  const categories: (Category | 'todas')[] = [
    'todas',
    'computadores',
    'smartphones',
    'audio',
    'acessorios',
  ];

  const hasActiveFilters =
    filters.category !== 'todas' ||
    filters.minPriceEuros.trim() !== '' ||
    filters.maxPriceEuros.trim() !== '' ||
    filters.search.trim() !== '';

  return (
    <aside className="filter-sidebar-root" aria-label="Filtros de produtos">
      <div className="filter-mobile-toggle-row">
        <button
          type="button"
          onClick={() => setIsOpenMobile((prev) => !prev)}
          className="btn-toggle-filters"
          aria-expanded={isOpenMobile}
          aria-controls="filter-body-container"
        >
          <SlidersHorizontal size={18} aria-hidden="true" />
          <span>Filtros do Catálogo</span>
          {hasActiveFilters && <span className="active-filter-dot" title="Filtros ativos" />}
          {isOpenMobile ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="btn-clear-filters-mini"
            aria-label="Limpar todos os filtros ativos"
          >
            Limpar
          </button>
        )}
      </div>

      <div
        id="filter-body-container"
        className={`filter-sidebar-body ${isOpenMobile ? 'is-open-mobile' : ''}`}
      >
        <div className="filter-header-desktop">
          <div className="filter-header-title">
            <Filter size={18} className="text-electric" aria-hidden="true" />
            <h2>Filtrar Resultados</h2>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="btn-clear-filters"
              aria-label="Limpar todos os filtros ativos"
            >
              <RotateCcw size={14} aria-hidden="true" />
              <span>Limpar</span>
            </button>
          )}
        </div>

        {/* Categoria */}
        <section className="filter-section" aria-labelledby="filter-heading-category">
          <h3 id="filter-heading-category" className="filter-section-title">
            <Tag size={15} aria-hidden="true" />
            Categoria
          </h3>
          <div className="category-options-list" role="radiogroup" aria-labelledby="filter-heading-category">
            {categories.map((catKey) => {
              const label = catKey === 'todas' ? 'Todas as Categorias' : CATEGORY_LABELS[catKey];
              const count = categoryCounts[catKey] ?? 0;
              const isSelected = filters.category === catKey;

              return (
                <button
                  key={catKey}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => onFilterChange('category', catKey)}
                  className={`category-option-btn ${isSelected ? 'is-selected' : ''}`}
                >
                  <span className="category-option-label">{label}</span>
                  <span className="category-count-badge" aria-label={`${count} artigos`}>{count}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Intervalo de Preço */}
        <section className="filter-section" aria-labelledby="filter-heading-price">
          <h3 id="filter-heading-price" className="filter-section-title">
            Intervalo de Preço (€)
          </h3>
          <div className="price-inputs-grid">
            <div className="price-input-group">
              <label htmlFor="price-min" className="price-label">Mínimo</label>
              <div className="price-input-wrapper">
                <span className="currency-symbol" aria-hidden="true">€</span>
                <input
                  id="price-min"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={filters.minPriceEuros}
                  onChange={(e) => onFilterChange('minPriceEuros', e.target.value)}
                  className="price-input"
                  aria-label="Preço mínimo em euros"
                />
              </div>
            </div>

            <div className="price-input-group">
              <label htmlFor="price-max" className="price-label">Máximo</label>
              <div className="price-input-wrapper">
                <span className="currency-symbol" aria-hidden="true">€</span>
                <input
                  id="price-max"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  placeholder="2000"
                  value={filters.maxPriceEuros}
                  onChange={(e) => onFilterChange('maxPriceEuros', e.target.value)}
                  className="price-input"
                  aria-label="Preço máximo em euros"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Botão de Reposição dentro do painel */}
        {hasActiveFilters && (
          <div className="filter-reset-bottom">
            <button
              type="button"
              onClick={onResetFilters}
              className="btn-secondary btn-full-width"
            >
              <RotateCcw size={16} aria-hidden="true" />
              <span>Limpar todos os filtros</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};