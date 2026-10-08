import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  Store,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  MapPin,
  Star,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../utils/formatters';
import { DemoOrder } from '../types';

export const CartPage: React.FC = () => {
  const { summary, updateQuantity, removeFromCart, clearCart, checkout } = useCart();
  const [completedOrder, setCompletedOrder] = useState<DemoOrder | null>(null);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCheckout = () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setValidationWarnings([]);
    setCheckoutError(null);

    // Pequeno atraso intencional para feedback visual da simulação
    setTimeout(() => {
      try {
        const result = checkout();
        if (result.success && result.order) {
          setCompletedOrder(result.order);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          if (result.changes && result.changes.length > 0) {
            setValidationWarnings(result.changes);
          }
          if (result.error) {
            setCheckoutError(result.error);
          }
        }
      } catch (err) {
        setCheckoutError('Ocorreu um erro inesperado ao processar a simulação de compra.');
        console.error(err);
      } finally {
        setIsProcessing(false);
      }
    }, 300);
  };

  // 1. Ecrã de Confirmação de Encomenda Simulada
  if (completedOrder) {
    return (
      <main id="main-content" className="cart-page order-confirmation-view" tabIndex={-1}>
        <div className="container">
          <div className="confirmation-card" role="status" aria-live="polite">
            <div className="confirmation-header">
              <div className="confirmation-icon-wrapper" aria-hidden="true">
                <CheckCircle2 size={48} className="text-success" />
              </div>
              <span className="demo-confirmation-pill">
                <Sparkles size={13} aria-hidden="true" />
                Simulação Demonstrativa Concluída
              </span>
              <h1 className="confirmation-title">Compra Simulada com Sucesso!</h1>
              <p className="confirmation-subtitle">
                O stock dos produtos foi atualizado localmente e foi gerado um registo histórico da encomenda. Nenhum valor real foi cobrado e não há envio físico de mercadorias.
              </p>
            </div>

            <div className="order-metadata-bar">
              <div className="order-meta-item">
                <span className="meta-label">Referência da Encomenda</span>
                <span className="meta-value font-mono">#{completedOrder.id}</span>
              </div>
              <div className="order-meta-item">
                <span className="meta-label">Data e Hora</span>
                <span className="meta-value">
                  {new Date(completedOrder.createdAt).toLocaleString('pt-PT', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
              </div>
              <div className="order-meta-item">
                <span className="meta-label">Total Demonstrativo</span>
                <span className="meta-value total-highlight">
                  {formatPrice(completedOrder.totalInCents)}
                </span>
              </div>
            </div>

            <div className="order-groups-section">
              <h2 className="order-groups-title">Artigos Registados por Loja Parceira</h2>

              {completedOrder.groups.map((group) => (
                <div key={group.sellerId} className="order-group-box">
                  <div className="order-group-header">
                    <div className="store-badge">
                      <Store size={16} aria-hidden="true" />
                      <strong>{group.sellerName}</strong>
                    </div>
                    <span className="order-group-subtotal">
                      Subtotal: <strong>{formatPrice(group.subtotalInCents)}</strong>
                    </span>
                  </div>

                  <ul className="order-items-list" aria-label={`Artigos da loja ${group.sellerName}`}>
                    {group.items.map((item, idx) => (
                      <li key={`${item.productId}-${idx}`} className="order-item-row">
                        <div className="order-item-info">
                          <span className="order-item-name">{item.productName}</span>
                          <span className="order-item-seller">Fornecido por {item.sellerName}</span>
                        </div>
                        <div className="order-item-calc">
                          <span className="order-item-qty">{item.quantity} × {formatPrice(item.priceInCents)}</span>
                          <span className="order-item-total">
                            {formatPrice(item.quantity * item.priceInCents)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="confirmation-actions">
              <Link to="/" className="btn-primary" onClick={() => setCompletedOrder(null)}>
                <ArrowLeft size={16} aria-hidden="true" />
                <span>Voltar ao Catálogo</span>
              </Link>

              <button
                type="button"
                className="btn-secondary"
                onClick={() => setCompletedOrder(null)}
              >
                <span>Fazer Nova Simulação</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // 2. Ecrã de Carrinho Vazio
  if (summary.groups.length === 0) {
    return (
      <main id="main-content" className="cart-page empty-cart-view" tabIndex={-1}>
        <div className="container">
          <div className="empty-cart-card">
            <div className="empty-cart-icon-wrapper" aria-hidden="true">
              <ShoppingBag size={48} className="text-electric" />
            </div>
            <h1 className="empty-cart-title">O teu carrinho está vazio</h1>
            <p className="empty-cart-description">
              Ainda não adicionaste qualquer produto ao carrinho. Explora o catálogo de tecnologia e seleciona a melhor oferta entre as nossas lojas parceiras.
            </p>
            <div className="empty-cart-actions">
              <Link to="/" className="btn-primary">
                <ArrowLeft size={16} aria-hidden="true" />
                <span>Explorar Catálogo</span>
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // 3. Ecrã Principal do Carrinho com Artigos
  return (
    <main id="main-content" className="cart-page" tabIndex={-1}>
      <div className="container">
        {/* Navegação e Migalhas */}
        <nav className="detail-navigation-bar" aria-label="Navegação de contexto">
          <Link to="/" className="btn-back-link">
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Continuar a comprar</span>
          </Link>
          <ol className="breadcrumbs-list">
            <li>
              <Link to="/">Início</Link>
            </li>
            <li aria-hidden="true" className="separator">/</li>
            <li aria-current="page" className="current-product">
              Carrinho ({summary.totalQuantity} {summary.totalQuantity === 1 ? 'artigo' : 'artigos'})
            </li>
          </ol>
        </nav>

        {/* Cabeçalho da Página */}
        <div className="cart-header-section">
          <div className="cart-title-row">
            <h1 className="cart-page-title">Carrinho de Compras</h1>
            <span className="cart-items-count-tag">
              {summary.totalQuantity} {summary.totalQuantity === 1 ? 'artigo' : 'artigos'} em {summary.groups.length} {summary.groups.length === 1 ? 'loja' : 'lojas'}
            </span>
          </div>
          <p className="cart-page-subtitle">
            Os artigos encontram-se agrupados pela loja parceira que garante a sua entrega.
          </p>
        </div>

        {/* Aviso de Simulação Sem Dados Pessoais */}
        <div className="demo-disclaimer-box" role="note">
          <ShieldCheck size={20} className="text-electric" aria-hidden="true" />
          <div className="disclaimer-content">
            <strong>Ambiente Demonstrativo Seguro:</strong> Esta compra é uma simulação. Não precisas de introduzir nome, morada, NIF nem dados bancários ou cartões de crédito. Clica em &ldquo;Concluir Compra Demonstrativa&rdquo; para finalizar sem qualquer encargo real.
          </div>
        </div>

        {/* Alerta de Revalidação de Stock ou Preço */}
        {validationWarnings.length > 0 && (
          <div className="cart-warning-banner" role="alert" aria-live="assertive">
            <div className="warning-banner-header">
              <AlertTriangle size={20} className="text-warning" aria-hidden="true" />
              <strong>Atenção: Foram detetadas alterações no carrinho antes da conclusão:</strong>
            </div>
            <ul className="warning-list">
              {validationWarnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
            <p className="warning-footer-note">
              O carrinho foi ajustado para os valores e stock reais disponíveis. Por favor, revê o novo resumo em baixo e clica novamente em &ldquo;Concluir Compra Demonstrativa&rdquo; para confirmar.
            </p>
          </div>
        )}

        {/* Mensagem de Erro Geral com Opção de Nova Tentativa */}
        {checkoutError && (
          <div className="cart-error-banner" role="alert">
            <div className="cart-error-message-group">
              <AlertTriangle size={20} className="text-danger" aria-hidden="true" />
              <span>{checkoutError}</span>
            </div>
            <button
              type="button"
              className="btn-retry-action"
              onClick={handleCheckout}
              disabled={isProcessing}
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Grelha Principal: Lista de Grupos por Loja + Resumo da Encomenda */}
        <div className="cart-layout-grid">
          {/* Coluna dos Grupos por Vendedor */}
          <div className="cart-groups-column">
            {summary.groups.map((group) => (
              <section
                key={group.sellerId}
                className="cart-seller-group-card"
                aria-labelledby={`seller-group-${group.sellerId}`}
              >
                {/* Cabeçalho do Vendedor */}
                <div className="cart-seller-header">
                  <div className="cart-seller-title-group">
                    <Store size={20} className="text-electric" aria-hidden="true" />
                    <div>
                      <h2 id={`seller-group-${group.sellerId}`} className="cart-seller-name">
                        {group.sellerName}
                      </h2>
                      <div className="cart-seller-meta">
                        <span className="cart-seller-city">
                          <MapPin size={12} aria-hidden="true" />
                          {group.sellerCity}
                        </span>
                        <span className="cart-seller-rating">
                          <Star size={12} className="rating-star" aria-hidden="true" />
                          {group.sellerRating.toFixed(1)}
                        </span>
                        <span className="cart-seller-shipping">Envio gratuito demonstrativo</span>
                      </div>
                    </div>
                  </div>

                  <span className="group-items-count-badge">
                    {group.items.length} {group.items.length === 1 ? 'linha' : 'linhas'}
                  </span>
                </div>

                {/* Lista de Artigos Desta Loja */}
                <ul className="cart-items-list" aria-label={`Artigos de ${group.sellerName}`}>
                  {group.items.map((item) => {
                    const isMaxStock = item.quantity >= item.availableStock;

                    return (
                      <li key={item.offerId} className="cart-item-card">
                        <div className="cart-item-media">
                          <img
                            src={item.productImageUrl}
                            alt={item.productImageAlt}
                            className="cart-item-thumbnail"
                          />
                        </div>

                        <div className="cart-item-content">
                          <div className="cart-item-header-row">
                            <Link
                              to={`/produto/${item.productId}`}
                              className="cart-item-title-link"
                            >
                              {item.productName}
                            </Link>

                            <button
                              type="button"
                              onClick={() => removeFromCart(item.offerId)}
                              className="btn-remove-item"
                              aria-label={`Remover ${item.productName} da loja ${group.sellerName}`}
                              title="Remover artigo"
                            >
                              <Trash2 size={16} aria-hidden="true" />
                              <span className="btn-remove-text">Remover</span>
                            </button>
                          </div>

                          <div className="cart-item-price-row">
                            <span className="cart-item-unit-price">
                              Preço unitário: <strong>{formatPrice(item.priceInCents)}</strong>
                            </span>
                            <span className="cart-item-stock-status">
                              Disponível: {item.availableStock} un.
                            </span>
                          </div>

                          <div className="cart-item-bottom-row">
                            {/* Controlos de Quantidade */}
                            <div className="quantity-control-group">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.offerId, item.quantity - 1)}
                                className="qty-btn"
                                aria-label={`Diminuir quantidade de ${item.productName}`}
                              >
                                <Minus size={14} aria-hidden="true" />
                              </button>
                              <span className="qty-number" aria-label={`Quantidade atual: ${item.quantity}`}>
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.offerId, item.quantity + 1)}
                                className="qty-btn"
                                disabled={isMaxStock}
                                aria-label={`Aumentar quantidade de ${item.productName}`}
                                title={isMaxStock ? 'Limite de stock atingido' : 'Adicionar mais uma unidade'}
                              >
                                <Plus size={14} aria-hidden="true" />
                              </button>
                            </div>

                            {/* Subtotal da Linha */}
                            <div className="cart-item-line-total">
                              <span className="line-total-label">Subtotal artigo:</span>
                              <span className="line-total-value">
                                {formatPrice(item.itemTotalInCents)}
                              </span>
                            </div>
                          </div>

                          {isMaxStock && (
                            <div className="stock-limit-note">
                              Quantidade máxima disponível em stock ({item.availableStock} un.) atingida para esta loja.
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {/* Rodapé do Grupo da Loja */}
                <div className="cart-seller-footer">
                  <span className="seller-footer-label">Subtotal loja ({group.sellerName}):</span>
                  <span className="seller-footer-amount">{formatPrice(group.subtotalInCents)}</span>
                </div>
              </section>
            ))}

            <div className="cart-actions-bottom">
              <button
                type="button"
                onClick={clearCart}
                className="btn-clear-cart"
                aria-label="Esvaziar todo o carrinho"
              >
                <Trash2 size={16} aria-hidden="true" />
                <span>Esvaziar carrinho</span>
              </button>
            </div>
          </div>

          {/* Coluna do Resumo da Encomenda */}
          <aside className="cart-summary-column" aria-labelledby="summary-heading">
            <div className="cart-summary-card">
              <h2 id="summary-heading" className="summary-card-title">
                Resumo da Simulação
              </h2>

              <div className="summary-stores-breakdown">
                <span className="breakdown-title">Desdobramento por Loja Parceira:</span>
                <ul className="breakdown-list">
                  {summary.groups.map((group) => (
                    <li key={group.sellerId} className="breakdown-item">
                      <span className="breakdown-store-name">
                        <Store size={13} aria-hidden="true" />
                        {group.sellerName}
                        <small>({group.items.reduce((acc, i) => acc + i.quantity, 0)} un.)</small>
                      </span>
                      <span className="breakdown-store-subtotal">
                        {formatPrice(group.subtotalInCents)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="summary-totals-block">
                <div className="summary-total-row">
                  <span>Total de artigos:</span>
                  <span>{summary.totalQuantity} unidades</span>
                </div>
                <div className="summary-total-row">
                  <span>Portes de envio:</span>
                  <span className="text-success font-semibold">Grátis (Demonstração)</span>
                </div>
                <div className="summary-total-row final-total-row">
                  <span className="final-total-label">Total da Encomenda:</span>
                  <span className="final-total-value">
                    {formatPrice(summary.totalInCents)}
                  </span>
                </div>
                <span className="summary-vat-disclaimer">
                  Todos os preços apresentados em euros com IVA incluído à taxa legal em vigor.
                </span>
              </div>

              <div className="summary-checkout-actions">
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={isProcessing}
                  className={`btn-checkout ${isProcessing ? 'is-loading' : ''}`}
                  aria-label="Concluir Compra Demonstrativa sem pagamentos reais"
                >
                  {isProcessing ? (
                    <>
                      <RotateCcw size={18} className="spin-icon" aria-hidden="true" />
                      <span>A validar e processar...</span>
                    </>
                  ) : (
                    <>
                      <span>Concluir Compra Demonstrativa</span>
                      <ArrowRight size={18} aria-hidden="true" />
                    </>
                  )}
                </button>

                <div className="simulation-assurance-note">
                  <Sparkles size={14} className="text-electric" aria-hidden="true" />
                  <span>Sem dados pessoais • Sem pagamento real • Reversível com &ldquo;Repor dados&rdquo;</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
};
