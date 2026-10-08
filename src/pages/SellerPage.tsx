import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Store,
  Tag,
  Package,
  Plus,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  X,
  ExternalLink,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { StorageService } from '../data/storage';
import { Product, SellerOfferItem, SellerOrderView } from '../types';
import { formatPrice, parsePriceToCents, CATEGORY_LABELS } from '../utils/formatters';

export const SellerPage: React.FC = () => {
  const sellers = useMemo(() => StorageService.getSellers(), []);
  const [selectedSellerId, setSelectedSellerId] = useState<string>(
    () => sellers[0]?.id || 'seller-technorte'
  );

  const selectedSeller = useMemo(
    () => sellers.find((s) => s.id === selectedSellerId) || sellers[0],
    [sellers, selectedSellerId]
  );

  const [activeTab, setActiveTab] = useState<'offers' | 'orders'>('offers');
  const [offers, setOffers] = useState<SellerOfferItem[]>([]);
  const [orders, setOrders] = useState<SellerOrderView[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Estado do formulário de criação de nova oferta
  const [isCreatingOffer, setIsCreatingOffer] = useState(false);
  const [createProductId, setCreateProductId] = useState('');
  const [createPriceStr, setCreatePriceStr] = useState('');
  const [createStockStr, setCreateStockStr] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [isCreateSaving, setIsCreateSaving] = useState(false);
  const [createCanRetry, setCreateCanRetry] = useState(false);

  // Estado da edição de uma oferta existente
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [editPriceStr, setEditPriceStr] = useState('');
  const [editStockStr, setEditStockStr] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [editCanRetry, setEditCanRetry] = useState(false);

  // Carregar dados da loja ativa
  const loadSellerData = useCallback(() => {
    if (!selectedSellerId) return;
    setOffers(StorageService.getOffersDetailedBySeller(selectedSellerId));
    setOrders(StorageService.getOrdersForSeller(selectedSellerId));
    setProducts(StorageService.getProducts());
  }, [selectedSellerId]);

  useEffect(() => {
    loadSellerData();

    const handleCatalogUpdate = () => {
      loadSellerData();
    };

    window.addEventListener('nexo-catalog-updated', handleCatalogUpdate);
    window.addEventListener('nexo-cart-updated', handleCatalogUpdate);
    window.addEventListener('storage', handleCatalogUpdate);

    return () => {
      window.removeEventListener('nexo-catalog-updated', handleCatalogUpdate);
      window.removeEventListener('nexo-cart-updated', handleCatalogUpdate);
      window.removeEventListener('storage', handleCatalogUpdate);
    };
  }, [loadSellerData]);

  // Limpar estados de edição e criação ao trocar de loja
  const handleSelectSeller = (sellerId: string) => {
    setSelectedSellerId(sellerId);
    setIsCreatingOffer(false);
    setCreateError(null);
    setCreateSuccess(null);
    setEditingOfferId(null);
    setEditError(null);
    setEditSuccess(null);
  };

  // Conjunto de produtos que já possuem oferta desta loja
  const existingOfferProductIds = useMemo(() => {
    return new Set(offers.map((o) => o.productId));
  }, [offers]);

  // Iniciar criação de oferta
  const handleOpenCreateOffer = () => {
    setIsCreatingOffer(true);
    setCreateProductId('');
    setCreatePriceStr('');
    setCreateStockStr('');
    setCreateError(null);
    setCreateSuccess(null);
    setCreateCanRetry(false);
  };

  const handleCancelCreateOffer = () => {
    setIsCreatingOffer(false);
    setCreateError(null);
    setCreateSuccess(null);
    setCreateCanRetry(false);
  };

  // Submissão da criação de oferta
  const handleCreateOfferSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isCreateSaving) return;

    setCreateError(null);
    setCreateSuccess(null);
    setCreateCanRetry(false);

    if (!createProductId) {
      setCreateError('Por favor seleciona um produto do catálogo.');
      return;
    }

    // Validação de duplicados prévia na interface
    if (existingOfferProductIds.has(createProductId)) {
      setCreateError('Esta loja já possui uma oferta registada para este produto. Edita a oferta existente.');
      return;
    }

    const priceInCents = parsePriceToCents(createPriceStr);
    if (priceInCents === null || priceInCents <= 0) {
      setCreateError('O preço deve ser superior a 0,00 € (ex: 29,90).');
      return;
    }

    const stockClean = createStockStr.trim();
    if (!stockClean || !/^\d+$/.test(stockClean)) {
      setCreateError('O stock deve ser um número inteiro não negativo (0 ou superior).');
      return;
    }

    const stock = parseInt(stockClean, 10);
    if (stock < 0) {
      setCreateError('O stock não pode ser negativo.');
      return;
    }

    setIsCreateSaving(true);

    setTimeout(() => {
      try {
        const result = StorageService.createOffer({
          sellerId: selectedSellerId,
          productId: createProductId,
          priceInCents,
          stock,
        });

        if (result.success && result.offer) {
          loadSellerData();
          setCreateSuccess('Oferta criada com sucesso e publicada no catálogo!');
          setCreateProductId('');
          setCreatePriceStr('');
          setCreateStockStr('');
          setIsCreatingOffer(false);
          setTimeout(() => setCreateSuccess(null), 4000);
        } else {
          setCreateError(result.error || 'Falha ao criar oferta. Tenta novamente.');
          setCreateCanRetry(true);
        }
      } catch (err) {
        console.error(err);
        setCreateError('Falha ao gravar no armazenamento local. Os teus dados foram preservados.');
        setCreateCanRetry(true);
      } finally {
        setIsCreateSaving(false);
      }
    }, 150);
  };

  // Iniciar edição de uma oferta existente
  const handleStartEditOffer = (offer: SellerOfferItem) => {
    setEditingOfferId(offer.id);
    setEditPriceStr((offer.priceInCents / 100).toFixed(2).replace('.', ','));
    setEditStockStr(offer.stock.toString());
    setEditError(null);
    setEditSuccess(null);
    setEditCanRetry(false);
  };

  const handleCancelEditOffer = () => {
    setEditingOfferId(null);
    setEditError(null);
    setEditSuccess(null);
    setEditCanRetry(false);
  };

  // Submissão da edição de oferta
  const handleEditOfferSubmit = (offerId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isEditSaving) return;

    setEditError(null);
    setEditSuccess(null);
    setEditCanRetry(false);

    const priceInCents = parsePriceToCents(editPriceStr);
    if (priceInCents === null || priceInCents <= 0) {
      setEditError('O preço deve ser superior a 0,00 € (ex: 29,90).');
      return;
    }

    const stockClean = editStockStr.trim();
    if (!stockClean || !/^\d+$/.test(stockClean)) {
      setEditError('O stock deve ser um número inteiro não negativo (0 ou superior).');
      return;
    }

    const stock = parseInt(stockClean, 10);
    if (stock < 0) {
      setEditError('O stock não pode ser negativo.');
      return;
    }

    setIsEditSaving(true);

    setTimeout(() => {
      try {
        const result = StorageService.updateOffer(offerId, {
          priceInCents,
          stock,
        });

        if (result.success && result.offer) {
          loadSellerData();
          setEditSuccess('Oferta atualizada com sucesso!');
          setEditingOfferId(null);
          setTimeout(() => setEditSuccess(null), 3500);
        } else {
          setEditError(result.error || 'Falha ao atualizar a oferta.');
          setEditCanRetry(true);
        }
      } catch (err) {
        console.error(err);
        setEditError('Falha ao gravar no armazenamento local. Os teus dados foram preservados.');
        setEditCanRetry(true);
      } finally {
        setIsEditSaving(false);
      }
    }, 150);
  };

  return (
    <main id="main-content" className="seller-page" tabIndex={-1}>
      <div className="container">
        {/* Cabeçalho da Área do Vendedor */}
        <header className="seller-header-section">
          <div className="seller-header-titles">
            <div className="seller-header-badge">
              <Sparkles size={14} aria-hidden="true" />
              <span>Modo Demonstração • Painel do Vendedor</span>
            </div>
            <h1 className="seller-page-title">Área do Vendedor</h1>
            <p className="seller-page-subtitle">
              Gere o catálogo de ofertas e consulta o histórico de encomendas de lojas parceiras independentes no Nexo.
              As alterações refletem-se em tempo real no catálogo público.
            </p>
          </div>
        </header>

        {/* Seletor de Loja Fictícia em Demonstração */}
        <section className="seller-store-selector-card" aria-labelledby="store-select-heading">
          <div className="store-selector-header">
            <div className="store-selector-label-group">
              <Store size={20} className="text-brand" aria-hidden="true" />
              <h2 id="store-select-heading" className="store-selector-title">
                Selecionar Loja Parceira (Demonstração)
              </h2>
            </div>
            <span className="demo-pill-subtle">Sem autenticação real</span>
          </div>

          <div
            className="store-selector-buttons"
            role="tablist"
            aria-label="Lojas fictícias demonstrativas"
          >
            {sellers.map((seller) => {
              const isSelected = seller.id === selectedSellerId;
              const storeOffersCount = StorageService.getOffersBySeller(seller.id).length;

              return (
                <button
                  key={seller.id}
                  type="button"
                  role="tab"
                  id={`tab-seller-${seller.id}`}
                  aria-selected={isSelected}
                  aria-controls="seller-tab-content"
                  className={`seller-store-tab-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => handleSelectSeller(seller.id)}
                >
                  <div className="tab-btn-top">
                    <span className="tab-store-name">{seller.name}</span>
                    {isSelected && (
                      <span className="tab-selected-icon" aria-hidden="true">
                        <Check size={14} />
                      </span>
                    )}
                  </div>
                  <div className="tab-btn-meta">
                    <span className="tab-city">{seller.city}</span>
                    <span className="tab-bullet">•</span>
                    <span className="tab-rating">★ {seller.rating.toFixed(1)}</span>
                    <span className="tab-bullet">•</span>
                    <span className="tab-count">{storeOffersCount} ofertas</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Cartão de Resumo da Loja Ativa */}
          <div className="active-store-summary-box">
            <div className="active-store-info">
              <span className="active-store-label">Loja Selecionada:</span>
              <strong className="active-store-title">{selectedSeller.name}</strong>
              <span className="active-store-location">({selectedSeller.city} • Avaliação {selectedSeller.rating.toFixed(1)}/5)</span>
            </div>
            <div className="active-store-metrics">
              <div className="metric-item">
                <span className="metric-num">{offers.length}</span>
                <span className="metric-desc">Ofertas Ativas</span>
              </div>
              <div className="metric-divider" aria-hidden="true"></div>
              <div className="metric-item">
                <span className="metric-num">{orders.length}</span>
                <span className="metric-desc">Encomendas Recebidas</span>
              </div>
            </div>
          </div>
        </section>

        {/* Notificações Globais de Sucesso */}
        {createSuccess && (
          <div className="seller-feedback-banner success" role="status" aria-live="polite">
            <CheckCircle2 size={18} className="text-success" aria-hidden="true" />
            <span>{createSuccess}</span>
          </div>
        )}
        {editSuccess && (
          <div className="seller-feedback-banner success" role="status" aria-live="polite">
            <CheckCircle2 size={18} className="text-success" aria-hidden="true" />
            <span>{editSuccess}</span>
          </div>
        )}

        {/* Abas de Navegação: Ofertas vs Encomendas */}
        <div id="seller-tab-content" className="seller-tab-container">
          <div className="seller-subtabs-nav" role="tablist" aria-label="Secções da Loja">
            <button
              type="button"
              role="tab"
              id="tab-view-offers"
              aria-selected={activeTab === 'offers'}
              aria-controls="panel-view-offers"
              className={`seller-subtab-btn ${activeTab === 'offers' ? 'active' : ''}`}
              onClick={() => setActiveTab('offers')}
            >
              <Tag size={16} aria-hidden="true" />
              <span>Ofertas da Loja</span>
              <span className="subtab-count-pill">{offers.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              id="tab-view-orders"
              aria-selected={activeTab === 'orders'}
              aria-controls="panel-view-orders"
              className={`seller-subtab-btn ${activeTab === 'orders' ? 'active' : ''}`}
              onClick={() => setActiveTab('orders')}
            >
              <Package size={16} aria-hidden="true" />
              <span>Encomendas Recebidas</span>
              <span className="subtab-count-pill">{orders.length}</span>
            </button>
          </div>

          {/* ========================================================= */}
          {/* TAB 1: GESTÃO DE OFERTAS */}
          {/* ========================================================= */}
          {activeTab === 'offers' && (
            <section
              id="panel-view-offers"
              role="tabpanel"
              aria-labelledby="tab-view-offers"
              className="seller-tab-panel"
            >
              <div className="panel-toolbar">
                <div className="panel-toolbar-text">
                  <h3 className="panel-section-title">Ofertas Ativas de {selectedSeller.name}</h3>
                  <p className="panel-section-desc">
                    Edita o preço e o stock das ofertas existentes ou publica uma nova oferta para qualquer produto do catálogo.
                  </p>
                </div>
                {!isCreatingOffer && (
                  <button
                    type="button"
                    className="btn-primary btn-add-offer"
                    onClick={handleOpenCreateOffer}
                    aria-expanded={isCreatingOffer}
                  >
                    <Plus size={16} aria-hidden="true" />
                    <span>Criar Nova Oferta</span>
                  </button>
                )}
              </div>

              {/* Formulário de Criação de Oferta */}
              {isCreatingOffer && (
                <div className="create-offer-card" role="region" aria-labelledby="create-offer-title">
                  <div className="create-offer-header">
                    <div className="create-offer-title-group">
                      <Plus size={18} className="text-brand" aria-hidden="true" />
                      <h4 id="create-offer-title" className="create-offer-title">
                        Nova Oferta para {selectedSeller.name}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={handleCancelCreateOffer}
                      className="btn-icon-subtle"
                      aria-label="Fechar formulário de nova oferta"
                    >
                      <X size={18} aria-hidden="true" />
                    </button>
                  </div>

                  <p className="create-offer-intro">
                    Associa uma oferta desta loja a um produto já existente no catálogo. Não é permitida a duplicação de ofertas para o mesmo produto.
                  </p>

                  {createError && (
                    <div className="seller-feedback-banner error" role="alert">
                      <AlertCircle size={18} className="text-danger" aria-hidden="true" />
                      <div className="banner-content-with-action">
                        <span>{createError}</span>
                        {createCanRetry && (
                          <button
                            type="button"
                            className="btn-retry-inline"
                            onClick={() => handleCreateOfferSubmit()}
                          >
                            Tentar novamente
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleCreateOfferSubmit} className="seller-form">
                    <div className="form-group">
                      <label htmlFor="create-product-select" className="form-label">
                        Produto do Catálogo <span className="required-star">*</span>
                      </label>
                      <select
                        id="create-product-select"
                        className="form-select"
                        value={createProductId}
                        onChange={(e) => setCreateProductId(e.target.value)}
                        required
                        disabled={isCreateSaving}
                      >
                        <option value="">-- Seleciona um produto do catálogo --</option>
                        {products.map((p) => {
                          const alreadyOffered = existingOfferProductIds.has(p.id);
                          const catLabel = CATEGORY_LABELS[p.category] || p.category;
                          return (
                            <option
                              key={p.id}
                              value={p.id}
                              disabled={alreadyOffered}
                            >
                              {p.name} ({catLabel}) {alreadyOffered ? '— [Oferta já existente nesta loja]' : ''}
                            </option>
                          );
                        })}
                      </select>
                      <span className="form-help-text">
                        Apenas produtos existentes. Produtos já comercializados por esta loja ficam desativados para evitar duplicados.
                      </span>
                    </div>

                    <div className="form-row-2col">
                      <div className="form-group">
                        <label htmlFor="create-price-input" className="form-label">
                          Preço de Venda (€) <span className="required-star">*</span>
                        </label>
                        <div className="input-currency-wrapper">
                          <input
                            id="create-price-input"
                            type="text"
                            inputMode="decimal"
                            className="form-input price-input"
                            placeholder="ex: 129,99"
                            value={createPriceStr}
                            onChange={(e) => setCreatePriceStr(e.target.value)}
                            required
                            disabled={isCreateSaving}
                          />
                          <span className="currency-addon">€</span>
                        </div>
                        <span className="form-help-text">Valor positivo em euros (guardado em cêntimos).</span>
                      </div>

                      <div className="form-group">
                        <label htmlFor="create-stock-input" className="form-label">
                          Stock Disponível <span className="required-star">*</span>
                        </label>
                        <input
                          id="create-stock-input"
                          type="number"
                          min="0"
                          step="1"
                          className="form-input"
                          placeholder="ex: 10"
                          value={createStockStr}
                          onChange={(e) => setCreateStockStr(e.target.value)}
                          required
                          disabled={isCreateSaving}
                        />
                        <span className="form-help-text">Número inteiro não negativo (0 para esgotado).</span>
                      </div>
                    </div>

                    <div className="form-actions-bar">
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={handleCancelCreateOffer}
                        disabled={isCreateSaving}
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={isCreateSaving}
                      >
                        {isCreateSaving ? (
                          <>
                            <RefreshCw size={16} className="animate-spin" aria-hidden="true" />
                            <span>A guardar...</span>
                          </>
                        ) : (
                          <>
                            <Check size={16} aria-hidden="true" />
                            <span>Publicar Oferta</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Lista / Tabela de Ofertas */}
              {offers.length === 0 ? (
                <div className="seller-empty-box">
                  <Tag size={40} className="text-muted" aria-hidden="true" />
                  <h4 className="empty-box-title">Nenhuma oferta ativa para {selectedSeller.name}</h4>
                  <p className="empty-box-text">
                    Esta loja ainda não possui produtos associados no catálogo. Cria a primeira oferta usando o botão acima.
                  </p>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleOpenCreateOffer}
                  >
                    <Plus size={16} aria-hidden="true" />
                    <span>Criar Primeira Oferta</span>
                  </button>
                </div>
              ) : (
                <div className="offers-table-wrapper">
                  <table className="seller-offers-table" aria-label={`Ofertas de ${selectedSeller.name}`}>
                    <thead>
                      <tr>
                        <th scope="col" className="col-product">Produto</th>
                        <th scope="col" className="col-category">Categoria</th>
                        <th scope="col" className="col-price">Preço (€)</th>
                        <th scope="col" className="col-stock">Stock</th>
                        <th scope="col" className="col-actions">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {offers.map((offer) => {
                        const isEditingThis = editingOfferId === offer.id;
                        const catLabel = CATEGORY_LABELS[offer.product.category] || offer.product.category;

                        return (
                          <React.Fragment key={offer.id}>
                            <tr className={`offer-row ${isEditingThis ? 'row-editing' : ''}`}>
                              <td className="cell-product">
                                <div className="offer-product-cell-group">
                                  <img
                                    src={offer.product.imageUrl}
                                    alt={offer.product.imageAlt}
                                    className="offer-product-thumb"
                                    loading="lazy"
                                    width="48"
                                    height="48"
                                  />
                                  <div className="offer-product-meta">
                                    <strong className="offer-product-name">{offer.product.name}</strong>
                                    <Link
                                      to={`/produto/${offer.productId}`}
                                      className="link-to-catalog"
                                      title="Ver este produto no catálogo público"
                                    >
                                      <span>Ver no catálogo</span>
                                      <ExternalLink size={12} aria-hidden="true" />
                                    </Link>
                                  </div>
                                </div>
                              </td>

                              <td className="cell-category">
                                <span className="category-badge-small">{catLabel}</span>
                              </td>

                              <td className="cell-price">
                                <span className="offer-price-val">{formatPrice(offer.priceInCents)}</span>
                              </td>

                              <td className="cell-stock">
                                {offer.stock === 0 ? (
                                  <span className="stock-pill-badge out-of-stock">Esgotado (0)</span>
                                ) : offer.stock <= 3 ? (
                                  <span className="stock-pill-badge low-stock">Últimas {offer.stock} un.</span>
                                ) : (
                                  <span className="stock-pill-badge in-stock">{offer.stock} em stock</span>
                                )}
                              </td>

                              <td className="cell-actions">
                                <button
                                  type="button"
                                  className="btn-edit-offer"
                                  onClick={() => handleStartEditOffer(offer)}
                                  aria-expanded={isEditingThis}
                                  aria-label={`Editar preço e stock de ${offer.product.name}`}
                                >
                                  <Edit2 size={14} aria-hidden="true" />
                                  <span>Editar</span>
                                </button>
                              </td>
                            </tr>

                            {/* Linha inline de edição quando ativada */}
                            {isEditingThis && (
                              <tr className="offer-edit-row">
                                <td colSpan={5} className="cell-edit-container">
                                  <div className="offer-inline-edit-box">
                                    <div className="edit-box-header">
                                      <strong>A editar oferta: {offer.product.name}</strong>
                                      <span className="edit-hint">As alterações atualizam o catálogo imediatamente</span>
                                    </div>

                                    {editError && (
                                      <div className="seller-feedback-banner error" role="alert">
                                        <AlertCircle size={16} className="text-danger" aria-hidden="true" />
                                        <div className="banner-content-with-action">
                                          <span>{editError}</span>
                                          {editCanRetry && (
                                            <button
                                              type="button"
                                              className="btn-retry-inline"
                                              onClick={() => handleEditOfferSubmit(offer.id)}
                                            >
                                              Tentar novamente
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    <form
                                      onSubmit={(e) => handleEditOfferSubmit(offer.id, e)}
                                      className="inline-edit-form"
                                    >
                                      <div className="inline-edit-inputs">
                                        <div className="form-group">
                                          <label htmlFor={`edit-price-${offer.id}`} className="form-label-compact">
                                            Novo Preço (€) *
                                          </label>
                                          <div className="input-currency-wrapper">
                                            <input
                                              id={`edit-price-${offer.id}`}
                                              type="text"
                                              inputMode="decimal"
                                              className="form-input-compact"
                                              value={editPriceStr}
                                              onChange={(e) => setEditPriceStr(e.target.value)}
                                              required
                                              disabled={isEditSaving}
                                            />
                                            <span className="currency-addon">€</span>
                                          </div>
                                        </div>

                                        <div className="form-group">
                                          <label htmlFor={`edit-stock-${offer.id}`} className="form-label-compact">
                                            Novo Stock *
                                          </label>
                                          <input
                                            id={`edit-stock-${offer.id}`}
                                            type="number"
                                            min="0"
                                            step="1"
                                            className="form-input-compact"
                                            value={editStockStr}
                                            onChange={(e) => setEditStockStr(e.target.value)}
                                            required
                                            disabled={isEditSaving}
                                          />
                                        </div>
                                      </div>

                                      <div className="inline-edit-actions">
                                        <button
                                          type="button"
                                          className="btn-compact-secondary"
                                          onClick={handleCancelEditOffer}
                                          disabled={isEditSaving}
                                        >
                                          Cancelar
                                        </button>
                                        <button
                                          type="submit"
                                          className="btn-compact-primary"
                                          disabled={isEditSaving}
                                        >
                                          {isEditSaving ? 'A guardar...' : 'Guardar Alterações'}
                                        </button>
                                      </div>
                                    </form>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* ========================================================= */}
          {/* TAB 2: CONSULTA DE ENCOMENDAS RECEBIDAS (ISOLAMENTO) */}
          {/* ========================================================= */}
          {activeTab === 'orders' && (
            <section
              id="panel-view-orders"
              role="tabpanel"
              aria-labelledby="tab-view-orders"
              className="seller-tab-panel"
            >
              <div className="panel-toolbar">
                <div className="panel-toolbar-text">
                  <h3 className="panel-section-title">Encomendas Recebidas por {selectedSeller.name}</h3>
                  <p className="panel-section-desc">
                    Consulta apenas os artigos pertencentes a {selectedSeller.name}. Os artigos de outras lojas incluídos em encomendas conjuntas são omitidos para preservar o isolamento comercial.
                  </p>
                </div>
              </div>

              {orders.length === 0 ? (
                <div className="seller-empty-box">
                  <Package size={40} className="text-muted" aria-hidden="true" />
                  <h4 className="empty-box-title">Sem encomendas para {selectedSeller.name}</h4>
                  <p className="empty-box-text">
                    Esta loja ainda não recebeu nenhuma encomenda nas simulações de compra.
                  </p>
                  <Link to="/" className="btn-secondary">
                    Ir para o catálogo e simular compra
                  </Link>
                </div>
              ) : (
                <div className="seller-orders-list">
                  {orders.map((ord) => (
                    <article key={ord.orderId} className="seller-order-card" aria-label={`Encomenda ${ord.orderId}`}>
                      <header className="seller-order-card-header">
                        <div className="order-card-ref-group">
                          <span className="order-ref-label">Encomenda</span>
                          <strong className="order-ref-value font-mono">#{ord.orderId}</strong>
                        </div>
                        <div className="order-card-date">
                          {new Date(ord.createdAt).toLocaleString('pt-PT', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </div>
                      </header>

                      <div className="seller-order-card-body">
                        <span className="order-items-heading">Artigos desta Loja ({ord.items.length}):</span>
                        <ul className="seller-order-items-list">
                          {ord.items.map((item, idx) => (
                            <li key={idx} className="seller-order-item-row">
                              <div className="seller-order-item-info">
                                <strong className="order-item-title">{item.productName}</strong>
                                <span className="order-item-unit-price">
                                  Preço original: {formatPrice(item.priceInCents)} / un.
                                </span>
                              </div>
                              <div className="seller-order-item-calc">
                                <span className="order-item-qty">{item.quantity} un.</span>
                                <span className="order-item-line-total">
                                  {formatPrice(item.priceInCents * item.quantity)}
                                </span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <footer className="seller-order-card-footer">
                        <div className="isolation-notice">
                          <ShieldCheck size={14} className="text-brand" aria-hidden="true" />
                          <span>Apenas artigos de {selectedSeller.name}</span>
                        </div>
                        <div className="seller-order-subtotal-group">
                          <span className="subtotal-label">Subtotal da Loja:</span>
                          <strong className="subtotal-value">{formatPrice(ord.subtotalInCents)}</strong>
                        </div>
                      </footer>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </main>
  );
};
export default SellerPage;
