import React from 'react';
import { Search, X, ArrowUpDown } from 'lucide-react';
import { SortOption } from '../types';

interface SortBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  sortBy: SortOption;
  onSortChange: (value: SortOption) => void;
  totalResults: number;
}

export const SortBar: React.FC<SortBarProps> = ({
  search,
  onSearchChange,
  sortBy,
  onSortChange,
  totalResults,
}) => {
  return (
    <div className="sortbar-root">
      <div className="sortbar-search-wrapper">
        <label htmlFor="search-input" className="sr-only">
          Pesquisar produtos pelo nome ou descrição
        </label>
        <div className="search-input-box">
          <Search size={18} className="search-icon" aria-hidden="true" />
          <input
            id="search-input"
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Pesquisar por nome ou especificação..."
            className="search-input"
            autoComplete="off"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="search-clear-btn"
              aria-label="Limpar texto da pesquisa"
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div className="sortbar-meta-wrapper">
        <span className="results-count" role="status" aria-live="polite">
          {totalResults === 1 ? '1 produto encontrado' : `${totalResults} produtos encontrados`}
        </span>

        <div className="sort-select-wrapper">
          <label htmlFor="sort-select" className="sort-label">
            <ArrowUpDown size={14} aria-hidden="true" />
            <span>Ordenar:</span>
          </label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="sort-select"
            aria-label="Critério de ordenação de produtos"
          >
            <option value="relevance">Relevância</option>
            <option value="price-asc">Preço: mais baixo primeiro</option>
            <option value="price-desc">Preço: mais alto primeiro</option>
            <option value="name-asc">Nome: A a Z</option>
            <option value="name-desc">Nome: Z a A</option>
          </select>
        </div>
      </div>
    </div>
  );
};