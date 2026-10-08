import React from 'react';
import { ShieldCheck, Store, RefreshCw } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="footer-root" role="contentinfo">
      <div className="container footer-content">
        <div className="footer-grid">
          <div className="footer-col">
            <div className="footer-brand">
              <span className="footer-brand-title">Nexo Marketplace</span>
              <p className="footer-brand-desc">
                Protótipo experimental de comércio eletrónico multivendedor focado em tecnologia. Desenvolvido para validação de experiência de catálogo e ofertas concorrentes.
              </p>
            </div>
          </div>

          <div className="footer-col">
            <h4 className="footer-heading">Lojas Parceiras</h4>
            <ul className="footer-list">
              <li>
                <Store size={14} className="footer-list-icon" aria-hidden="true" />
                <span>TechNorte (Porto)</span>
              </li>
              <li>
                <Store size={14} className="footer-list-icon" aria-hidden="true" />
                <span>ByteZone (Lisboa)</span>
              </li>
              <li>
                <Store size={14} className="footer-list-icon" aria-hidden="true" />
                <span>GadgetHub (Braga)</span>
              </li>
            </ul>
          </div>

          <div className="footer-col">
            <h4 className="footer-heading">Garantias do Protótipo</h4>
            <ul className="footer-list">
              <li>
                <ShieldCheck size={14} className="footer-list-icon" aria-hidden="true" />
                <span>Ambiente seguro de simulação</span>
              </li>
              <li>
                <RefreshCw size={14} className="footer-list-icon" aria-hidden="true" />
                <span>Persistência local substituível por API</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} Nexo — Protótipo de Marketplace Tecnológico. Todos os direitos reservados para simulação.</p>
          <p className="footer-currency-note">Valores expressos em Euros (€) com cêntimos inteiros. Sem recolha de dados pessoais.</p>
        </div>
      </div>
    </footer>
  );
};