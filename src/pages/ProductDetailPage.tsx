import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, AlertCircle, Cpu, Store, ShieldAlert } from 'lucide-react';
import { StorageService } from '../data/storage';
import { ProductOffers } from '../components/ProductOffers';
import { formatPrice, CATEGORY_LABELS } from '../utils/formatters';

export const ProductDetailPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const [product, setProduct] = useState(() =>
    productId ? StorageService.getProductWithOffersById(productId) : null
  );

  useEffect(() => {
    if (!productId) return;
    const updateProduct = () => {
      setProduct(StorageService.getProductWithOffersById(productId));
    };
    updateProduct();

    window.addEventListener('nexo-catalog-updated', updateProduct);
    window.addEventListener('nexo-cart-updated', updateProduct);
    window.addEventListener('storage', updateProduct);
    return () => {
      window.removeEventListener('nexo-catalog-updated', updateProduct);
      window.removeEventListener('nexo-cart-updated', updateProduct);
      window.removeEventListener('storage', updateProduct);
    };
  }, [productId]);

  // Se o produto não for encontrado
  if (!product) {
    return (
      <main id="main-content" className="product-detail-page not-found-page" tabIndex={-1}>
        <div className="container">
          <div className="not-found-card" role="alert">
            <div className="not-found-icon-wrapper" aria-hidden="true">
              <ShieldAlert size={48} className="text-danger" />
            </div>
            <h1 className="not-found-title">Produto não encontrado</h1>
            <p className="not-found-text">
              O produto com o identificador &ldquo;<strong>{productId}</strong>&rdquo; não existe no catálogo do Marketplace Nexo ou foi removido.
            </p>
            <div className="not-found-actions">
              <Link to="/" className="btn-primary">
                <ArrowLeft size={16} aria-hidden="true" />
                <span>Voltar ao catálogo</span>
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const categoryLabel = CATEGORY_LABELS[product.category] || product.category;

  return (
    <main id="main-content" className="product-detail-page" tabIndex={-1}>
      <div className="container">
        {/* Navegação de Regresso e Migalhas (Breadcrumbs) */}
        <nav className="detail-navigation-bar" aria-label="Navegação de contexto">
          <Link to="/" className="btn-back-link" aria-label="Voltar para a lista do catálogo">
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Voltar ao catálogo</span>
          </Link>

          <ol className="breadcrumbs-list">
            <li>
              <Link to="/">Início</Link>
            </li>
            <li aria-hidden="true" className="separator">/</li>
            <li>
              <span className="current-category">{categoryLabel}</span>
            </li>
            <li aria-hidden="true" className="separator">/</li>
            <li aria-current="page" className="current-product">
              {product.name}
            </li>
          </ol>
        </nav>

        {/* Informação Principal do Produto */}
        <section className="product-hero-section" aria-labelledby="product-name-heading">
          <div className="product-hero-grid">
            {/* Coluna Visual */}
            <div className="product-media-column">
              <div className="product-image-container">
                <img
                  src={product.imageUrl}
                  alt={product.imageAlt}
                  className="product-main-image"
                />
              </div>

              <div className="product-badges-row">
                <span className="badge-category">{categoryLabel}</span>
                {product.hasStock ? (
                  <span className="badge-stock in-stock">
                    <CheckCircle2 size={14} aria-hidden="true" />
                    {product.totalStock} unidades em stock (total)
                  </span>
                ) : (
                  <span className="badge-stock out-of-stock">
                    <AlertCircle size={14} aria-hidden="true" />
                    Esgotado em todas as lojas
                  </span>
                )}
              </div>
            </div>

            {/* Coluna de Especificações e Resumo de Oferta */}
            <div className="product-details-column">
              <span className="product-pretitle">Artigo Oficial Nexo</span>
              <h1 id="product-name-heading" className="product-detail-title">
                {product.name}
              </h1>

              <div className="product-price-summary-card">
                {product.hasStock && product.minPriceInCents !== null ? (
                  <>
                    <span className="summary-price-label">Melhor oferta a partir de</span>
                    <div className="summary-price-value">
                      {formatPrice(product.minPriceInCents)}
                    </div>
                    <span className="summary-price-subtitle">
                      Preço mais baixo verificado entre as lojas parceiras com stock imediato.
                    </span>
                  </>
                ) : (
                  <>
                    <div className="summary-unavailable-badge">
                      <AlertCircle size={16} aria-hidden="true" />
                      Atualmente indisponível para entrega imediata
                    </div>
                    {product.minPriceInCents !== null && (
                      <span className="summary-reference-price">
                        Último preço de referência registado: {formatPrice(product.minPriceInCents)}
                      </span>
                    )}
                  </>
                )}
              </div>

              <div className="product-description-block">
                <h2 className="section-subheading">Descrição do Produto</h2>
                <p className="product-description-text">{product.description}</p>
              </div>

              <div className="product-specs-block">
                <h2 className="section-subheading">
                  <Cpu size={18} className="text-electric" aria-hidden="true" />
                  Características Técnicas
                </h2>
                <dl className="specs-dl">
                  {product.specs.map((spec, index) => (
                    <div key={index} className="spec-row">
                      <dt className="spec-label">{spec.label}</dt>
                      <dd className="spec-value">{spec.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="sellers-count-alert">
                <Store size={18} className="text-electric" aria-hidden="true" />
                <p>
                  Este artigo é comercializado por <strong>{product.offers.length} lojas parceiras</strong> no Nexo. Consulta as propostas detalhadas em baixo.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Secção de Ofertas Concorrentes por Loja */}
        <ProductOffers offers={product.offers} />
      </div>
    </main>
  );
};