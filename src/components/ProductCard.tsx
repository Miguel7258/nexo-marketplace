import React from 'react';
import { Link } from 'react-router-dom';
import { Store, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ProductWithOffers } from '../types';
import { formatPrice, CATEGORY_LABELS } from '../utils/formatters';

interface ProductCardProps {
  product: ProductWithOffers;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const categoryLabel = CATEGORY_LABELS[product.category] || product.category;
  const offersCount = product.offers.length;
  const inStockOffersCount = product.offers.filter((o) => o.stock > 0).length;

  return (
    <article className="product-card" aria-labelledby={`product-title-${product.id}`}>
      <Link to={`/produto/${product.id}`} className="product-card-link" aria-label={`Ver detalhes de ${product.name}`}>
        <div className="product-card-media">
          <img
            src={product.imageUrl}
            alt={product.imageAlt}
            loading="lazy"
            className="product-card-img"
          />
          <div className="product-card-badge-container">
            <span className="product-category-pill">{categoryLabel}</span>
            {product.hasStock ? (
              <span className="stock-indicator in-stock">
                <CheckCircle2 size={12} aria-hidden="true" />
                Em stock
              </span>
            ) : (
              <span className="stock-indicator out-of-stock">
                <AlertCircle size={12} aria-hidden="true" />
                Indisponível
              </span>
            )}
          </div>
        </div>

        <div className="product-card-body">
          <h3 id={`product-title-${product.id}`} className="product-card-title">
            {product.name}
          </h3>

          <p className="product-card-desc">
            {product.description}
          </p>

          <div className="product-card-footer">
            <div className="product-card-price-block">
              {product.hasStock && product.minPriceInCents !== null ? (
                <>
                  <span className="price-prefix">A partir de</span>
                  <span className="price-amount">{formatPrice(product.minPriceInCents)}</span>
                </>
              ) : (
                <div className="price-unavailable">
                  <span className="unavailable-label">Sem stock</span>
                  {product.minPriceInCents !== null && (
                    <span className="reference-price">Ref: {formatPrice(product.minPriceInCents)}</span>
                  )}
                </div>
              )}
            </div>

            <div className="product-card-offers-meta">
              <span className="offers-badge" title={`${offersCount} lojas a disponibilizar este produto`}>
                <Store size={13} aria-hidden="true" />
                {offersCount === 1 ? '1 loja' : `${offersCount} lojas`}
                {inStockOffersCount > 0 && inStockOffersCount < offersCount && (
                  <span className="offers-active-count">({inStockOffersCount} com stock)</span>
                )}
              </span>

              <span className="view-details-arrow" aria-hidden="true">
                <ChevronRight size={16} />
              </span>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
};