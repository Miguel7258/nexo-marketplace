import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Layers, RotateCcw, Check, Sparkles, ShoppingCart } from 'lucide-react';
import { StorageService } from '../data/storage';
import { useCart } from '../context/CartContext';

interface NavbarProps {
  onDataReset?: () => void;
}

let resetFeedbackTimer: ReturnType<typeof setTimeout> | null = null;
let resetFeedbackUntil = 0;

export const Navbar: React.FC<NavbarProps> = ({ onDataReset }) => {
  const location = useLocation();
  const [resetSuccess, setResetSuccess] = useState(() => Date.now() < resetFeedbackUntil);
  const { totalQuantity, refreshCart } = useCart();

  useEffect(() => {
    if (resetSuccess) {
      const remaining = Math.max(0, resetFeedbackUntil - Date.now());
      if (remaining > 0) {
        if (resetFeedbackTimer) {
          clearTimeout(resetFeedbackTimer);
        }
        resetFeedbackTimer = setTimeout(() => {
          setResetSuccess(false);
          resetFeedbackUntil = 0;
        }, remaining);
        return () => {
          if (resetFeedbackTimer) {
            clearTimeout(resetFeedbackTimer);
          }
        };
      } else {
        setResetSuccess(false);
        resetFeedbackUntil = 0;
      }
    }
  }, [resetSuccess]);

  const handleReset = () => {
    StorageService.resetToInitialData();
    refreshCart();
    resetFeedbackUntil = Date.now() + 2500;
    setResetSuccess(true);
    if (onDataReset) {
      onDataReset();
    }
  };

  return (
    <header className="navbar-root" role="banner">
      <div className="container navbar-container">
        <div className="navbar-brand-group">
          <Link to="/" className="navbar-logo" aria-label="Nexo Marketplace - Início">
            <span className="logo-icon-wrapper" aria-hidden="true">
              <Layers size={22} className="logo-icon" />
            </span>
            <span className="logo-text">
              Nexo<span className="logo-dot">.</span>
            </span>
          </Link>
          <span className="demo-tag" title="Ambiente de demonstração para protótipo de marketplace">
            <Sparkles size={12} aria-hidden="true" />
            Demonstração
          </span>
        </div>

        <nav className="navbar-nav" aria-label="Navegação Principal">
          <Link
            to="/"
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
            aria-current={location.pathname === '/' ? 'page' : undefined}
          >
            Catálogo
          </Link>

          <Link
            to="/vendedor"
            className={`nav-link ${location.pathname === '/vendedor' ? 'active' : ''}`}
            aria-current={location.pathname === '/vendedor' ? 'page' : undefined}
          >
            Vendedor
          </Link>

          <Link
            to="/carrinho"
            className={`nav-link nav-cart-link ${location.pathname === '/carrinho' ? 'active' : ''}`}
            aria-current={location.pathname === '/carrinho' ? 'page' : undefined}
            aria-label={`Carrinho de compras com ${totalQuantity} ${totalQuantity === 1 ? 'artigo' : 'artigos'}`}
          >
            <ShoppingCart size={18} aria-hidden="true" />
            <span>Carrinho</span>
            {totalQuantity > 0 && (
              <span className="navbar-cart-badge" aria-hidden="true">
                {totalQuantity}
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={handleReset}
            className="btn-reset"
            title="Repor dados demonstrativos iniciais"
            aria-label="Repor dados demonstrativos para os valores originais"
          >
            {resetSuccess ? (
              <>
                <Check size={16} className="text-success" aria-hidden="true" />
                <span>Dados repostos</span>
              </>
            ) : (
              <>
                <RotateCcw size={16} aria-hidden="true" />
                <span>Repor dados</span>
              </>
            )}
          </button>
        </nav>
      </div>

      <div className="demo-notice-bar" role="status" aria-live="polite">
        <div className="container">
          <p className="demo-notice-text">
            <strong>Protótipo Nexo (Fase 3):</strong> Gestão de ofertas por loja parceira e compra simulada multivendedor em euros. Sem recolha de dados pessoais nem pagamentos reais.
          </p>
        </div>
      </div>
    </header>
  );
};