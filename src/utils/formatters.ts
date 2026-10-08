import { Category } from '../types';

export function formatPrice(priceInCents: number): string {
  const euros = priceInCents / 100;
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(euros);
}

export function parsePriceToCents(eurosStr: string): number | null {
  const clean = eurosStr.trim().replace(/\s/g, '').replace(',', '.');
  if (!clean) return null;
  const num = parseFloat(clean);
  if (isNaN(num) || num < 0) return null;
  return Math.round(num * 100);
}

export const CATEGORY_LABELS: Record<Category, string> = {
  computadores: 'Computadores',
  smartphones: 'Smartphones',
  audio: 'Áudio',
  acessorios: 'Acessórios',
};