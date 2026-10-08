import React, { useState } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CatalogPage } from './pages/CatalogPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CartPage } from './pages/CartPage';
import { SellerPage } from './pages/SellerPage';
import { CartProvider } from './context/CartContext';

// GitHub Pages nao tem fallback de servidor para rotas de uma SPA.
// Mantem as rotas locais e usa fragmentos apenas no build publicado.
const Router = import.meta.env.VITE_GITHUB_PAGES === 'true' ? HashRouter : BrowserRouter;

export const App: React.FC = () => {
  // Chave de recarga para forçar re-renderização quando os dados forem repostos
  const [reloadKey, setReloadKey] = useState(0);

  const handleDataReset = () => {
    setReloadKey((prev) => prev + 1);
  };

  return (
    <Router>
      <CartProvider key={reloadKey}>
        <a href="#main-content" className="skip-link" onClick={(event) => {
          event.preventDefault();
          document.getElementById('main-content')?.focus();
        }}>
          Saltar para o conteúdo principal
        </a>

        <Navbar onDataReset={handleDataReset} />

        <Routes>
          <Route path="/" element={<CatalogPage />} />
          <Route path="/produto/:productId" element={<ProductDetailPage />} />
          <Route path="/carrinho" element={<CartPage />} />
          <Route path="/vendedor" element={<SellerPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <Footer />
      </CartProvider>
    </Router>
  );
};

export default App;
