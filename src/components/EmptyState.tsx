import React from 'react';
import { SearchX, RotateCcw } from 'lucide-react';

interface EmptyStateProps {
  onClearFilters: () => void;
  searchTerm?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onClearFilters, searchTerm }) => {
  return (
    <section className="empty-state-root" role="status" aria-live="polite">
      <div className="empty-state-icon-wrapper" aria-hidden="true">
        <SearchX size={44} className="empty-state-icon" />
      </div>

      <h3 className="empty-state-title">Nenhum produto encontrado</h3>

      <p className="empty-state-message">
        {searchTerm ? (
          <>
            Não encontrámos nenhum artigo correspondente à pesquisa por &ldquo;<strong>{searchTerm}</strong>&rdquo; com os filtros atuais selecionados.
          </>
        ) : (
          'Não foram encontrados produtos que correspondam à combinação de filtros selecionada.'
        )}
      </p>

      <div className="empty-state-actions">
        <button
          type="button"
          onClick={onClearFilters}
          className="btn-primary"
        >
          <RotateCcw size={16} aria-hidden="true" />
          <span>Limpar filtros e ver todos</span>
        </button>
      </div>
    </section>
  );
};