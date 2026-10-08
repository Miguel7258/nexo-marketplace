import React, { useState } from 'react';
import { Store, Star, MapPin, CheckCircle2, AlertCircle, Award, ShoppingCart, Check } from 'lucide-react';
import { Offer, Seller } from '../types';
import { formatPrice } from '../utils/formatters';
import { useCart } from '../context/CartContext';

interface ProductOffersProps {
  offers: (Offer & { seller: Seller })[];
}

export const ProductOffers: React.FC<ProductOffersProps> = ({ offers }) => {
  const { cart, addToCart } = useCart();
  const [addedOfferId, setAddedOfferId] = useState<string | null>(null);

  const handleAddToCart = (offerId: string) => {
    const res = addToCart(offerId, 1);
    if (res.success) {
      setAddedOfferId(offerId);
      setTimeout(() => {
        setAddedOfferId((current) => (current === offerId ? null : current));
      }, 2000);
    }
  };

  // Encontrar o menor preço entre as ofertas com stock
  const inStockOffers = offers.filter((o) => o.stock > 0);
  const lowestPriceInStock = inStockOffers.length > 0
    ? Math.min(...inStockOffers.map((o) => o.priceInCents))
    : null;

  // Ordenar ofertas: com stock primeiro, depois por preço
  const sortedOffers = [...offers].sort((a, b) => {
    if (a.stock > 0 && b.stock <= 0) return -1;
    if (a.stock <= 0 && b.stock > 0) return 1;
    return a.priceInCents - b.priceInCents;
  });

  return (
    <section className="product-offers-section" aria-labelledby="offers-heading">
      <div className="product-offers-header">
        <h2 id="offers-heading" className="offers-section-title">
          Ofertas disponíveis ({offers.length} {offers.length === 1 ? 'loja parceira' : 'lojas parceiras'})
        </h2>
        <p className="offers-section-subtitle">
          Compara os preços e disponibilidades de stock fornecidos por diferentes vendedores no Marketplace Nexo.
        </p>
      </div>

      <div className="offers-list">
        {sortedOffers.map((offer) => {
          const isBestPrice =
            offer.stock > 0 &&
            lowestPriceInStock !== null &&
            offer.priceInCents === lowestPriceInStock &&
            inStockOffers.length > 1;

          const cartItem = cart.find((i) => i.offerId === offer.id);
          const cartQuantity = cartItem ? cartItem.quantity : 0;
          const isMaxInCart = offer.stock > 0 && cartQuantity >= offer.stock;
          const isAdded = addedOfferId === offer.id;

          return (
            <article
              key={offer.id}
              className={`offer-item-card ${offer.stock <= 0 ? 'is-out-of-stock' : ''} ${
                isBestPrice ? 'is-best-price' : ''
              }`}
            >
              <div className="offer-seller-info">
                <div className="seller-name-row">
                  <Store size={18} className="seller-icon" aria-hidden="true" />
                  <span className="seller-name">{offer.seller.name}</span>
                  {isBestPrice && (
                    <span className="best-price-badge">
                      <Award size={13} aria-hidden="true" />
                      Melhor Preço
                    </span>
                  )}
                </div>

                <div className="seller-meta-row">
                  <span className="seller-city">
                    <MapPin size={13} aria-hidden="true" />
                    {offer.seller.city}
                  </span>
                  <span className="seller-rating">
                    <Star size={13} className="rating-star" aria-hidden="true" />
                    {offer.seller.rating.toFixed(1)} / 5.0
                  </span>
                </div>
              </div>

              <div className="offer-stock-info">
                {offer.stock > 0 ? (
                  <span className="stock-tag in-stock">
                    <CheckCircle2 size={14} aria-hidden="true" />
                    Em stock: <strong>{offer.stock} {offer.stock === 1 ? 'unidade' : 'unidades'}</strong>
                  </span>
                ) : (
                  <span className="stock-tag out-of-stock">
                    <AlertCircle size={14} aria-hidden="true" />
                    Esgotado nesta loja
                  </span>
                )}
                <span className="seller-shipping-note">Vendido e enviado por {offer.seller.name}</span>
              </div>

              <div className="offer-action-block">
                <div className="offer-price-block">
                  <span className="offer-price-tag">{formatPrice(offer.priceInCents)}</span>
                  <span className="offer-vat-note">IVA incluído à taxa legal</span>
                </div>

                <div className="offer-cart-controls">
                  {offer.stock > 0 ? (
                    <>
                      <button
                        type="button"
                        className={`btn-offer-cart ${isAdded ? 'is-added' : ''}`}
                        onClick={() => handleAddToCart(offer.id)}
                        disabled={isMaxInCart}
                        aria-label={`Adicionar oferta de ${offer.seller.name} por ${formatPrice(offer.priceInCents)} ao carrinho`}
                      >
                        {isAdded ? (
                          <>
                            <Check size={16} aria-hidden="true" />
                            <span>Adicionado!</span>
                          </>
                        ) : isMaxInCart ? (
                          <span>Stock máximo ({cartQuantity})</span>
                        ) : (
                          <>
                            <ShoppingCart size={16} aria-hidden="true" />
                            <span>Adicionar</span>
                          </>
                        )}
                      </button>

                      {cartQuantity > 0 && !isAdded && (
                        <span className="offer-in-cart-indicator">
                          {cartQuantity} no carrinho
                        </span>
                      )}
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn-offer-cart is-disabled"
                      disabled
                      aria-label={`Oferta de ${offer.seller.name} esgotada`}
                    >
                      Esgotado
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};