import { Product, Seller, Offer, DemoOrder } from '../types';

export const INITIAL_SELLERS: Seller[] = [
  {
    id: 'seller-technorte',
    name: 'TechNorte',
    rating: 4.9,
    city: 'Porto',
  },
  {
    id: 'seller-bytezone',
    name: 'ByteZone',
    rating: 4.7,
    city: 'Lisboa',
  },
  {
    id: 'seller-gadgethub',
    name: 'GadgetHub',
    rating: 4.8,
    city: 'Braga',
  },
];

function createProductSvg(category: string, title: string, accentColor: string, iconType: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f172a" />
        <stop offset="100%" stop-color="#1e293b" />
      </linearGradient>
      <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${accentColor}" />
        <stop offset="100%" stop-color="#38bdf8" />
      </linearGradient>
      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255, 255, 255, 0.04)" stroke-width="1" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg)" />
    <rect width="100%" height="100%" fill="url(#grid)" />
    <circle cx="200" cy="130" r="70" fill="rgba(56, 189, 248, 0.08)" />
    <g transform="translate(160, 90)" stroke="url(#accent)" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round">
      ${
        iconType === 'laptop'
          ? '<rect x="8" y="8" width="64" height="44" rx="3" /><path d="M 0 56 L 80 56 L 74 62 L 6 62 Z" fill="rgba(56, 189, 248, 0.2)" />'
          : iconType === 'phone'
          ? '<rect x="22" y="4" width="36" height="64" rx="6" /><line x1="36" y1="60" x2="44" y2="60" /><circle cx="40" cy="14" r="2" fill="url(#accent)" />'
          : iconType === 'headphones'
          ? '<path d="M 12 44 A 28 28 0 0 1 68 44" /><rect x="8" y="40" width="12" height="22" rx="4" fill="rgba(56, 189, 248, 0.2)" /><rect x="60" y="40" width="12" height="22" rx="4" fill="rgba(56, 189, 248, 0.2)" />'
          : '<rect x="10" y="14" width="60" height="42" rx="4" /><path d="M 30 56 L 50 56 M 40 56 L 40 64 M 24 64 L 56 64" />'
      }
    </g>
    <text x="200" y="225" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" fill="#f8fafc" text-anchor="middle" letter-spacing="0.5">${title.toUpperCase()}</text>
    <text x="200" y="248" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="500" fill="#94a3b8" text-anchor="middle">${category.toUpperCase()} • NEXO TECH</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const INITIAL_PRODUCTS: Product[] = [
  // COMPUTADORES
  {
    id: 'prod-1',
    name: 'Portátil NexoPro 15" i7 16GB 512GB SSD',
    category: 'computadores',
    description: 'Portátil de alto rendimento concebido para produtividade avançada e trabalho criativo intensivo, com ecrã de 144Hz e teclado retroiluminado.',
    specs: [
      { label: 'Processador', value: 'Intel Core i7-13700H (14 núcleos)' },
      { label: 'Memória RAM', value: '16 GB DDR5 5200 MHz' },
      { label: 'Armazenamento', value: '512 GB PCIe 4.0 NVMe M.2' },
      { label: 'Ecrã', value: '15.6" IPS Full HD (1920x1080) 144Hz' },
      { label: 'Peso', value: '1.68 kg' },
    ],
    imageUrl: createProductSvg('Computadores', 'NexoPro 15"', '#0284c7', 'laptop'),
    imageAlt: 'Portátil NexoPro 15 polegadas em cinzento espacial',
  },
  {
    id: 'prod-2',
    name: 'Ultrabook SlimAir 13" M3 16GB 512GB',
    category: 'computadores',
    description: 'Chassis unibody ultrafino em alumínio reciclado com autonomia até 18 horas e arrefecimento passivo silencioso.',
    specs: [
      { label: 'Processador', value: 'Chip M3 com CPU 8-Core e GPU 10-Core' },
      { label: 'Memória RAM', value: '16 GB de memória unificada' },
      { label: 'Armazenamento', value: '512 GB SSD ultra-rápido' },
      { label: 'Ecrã', value: '13.6" Liquid Retina com True Tone' },
      { label: 'Peso', value: '1.24 kg' },
    ],
    imageUrl: createProductSvg('Computadores', 'SlimAir 13"', '#38bdf8', 'laptop'),
    imageAlt: 'Ultrabook SlimAir 13 polegadas prateado aberto',
  },
  {
    id: 'prod-3',
    name: 'Desktop Gaming Titan X Ryzen 7 RTX 4070',
    category: 'computadores',
    description: 'Computador fixo de alto desempenho para jogos e renderização 3D, com refrigeração líquida e iluminação discreta.',
    specs: [
      { label: 'Processador', value: 'AMD Ryzen 7 7800X3D (8 núcleos / 16 threads)' },
      { label: 'Placa Gráfica', value: 'NVIDIA GeForce RTX 4070 12GB GDDR6X' },
      { label: 'Memória RAM', value: '32 GB DDR5 6000 MHz RGB' },
      { label: 'Armazenamento', value: '1 TB NVMe SSD Gen4' },
      { label: 'Fonte de Alimentação', value: '750W 80 Plus Gold Modular' },
    ],
    imageUrl: createProductSvg('Computadores', 'Titan X Gaming', '#0ea5e9', 'laptop'),
    imageAlt: 'Torre desktop gaming Titan X com vidro lateral',
  },

  // SMARTPHONES
  {
    id: 'prod-4',
    name: 'Smartphone Apex Pro 5G 256GB',
    category: 'smartphones',
    description: 'Topo de gama com sistema de tripla câmara ótica de 50 MP, ecrã AMOLED LTPO adaptativo e certificação IP68.',
    specs: [
      { label: 'Ecrã', value: '6.7" Quad HD+ AMOLED 120Hz LTPO' },
      { label: 'Processador', value: 'Snapdragon 8 Gen 3 (4 nm)' },
      { label: 'Câmaras', value: '50 MP Principal + 50 MP Ultra-Grande Angular + 64 MP Periscópio 3x' },
      { label: 'Bateria', value: '5000 mAh com Carga Rápida 65W' },
      { label: 'Armazenamento', value: '256 GB UFS 4.0' },
    ],
    imageUrl: createProductSvg('Smartphones', 'Apex Pro 5G', '#0284c7', 'phone'),
    imageAlt: 'Smartphone Apex Pro 5G em preto titânio',
  },
  {
    id: 'prod-5',
    name: 'Smartphone NovaLite 5G 128GB',
    category: 'smartphones',
    description: 'Equilíbrio ideal entre autonomia prolongada de 2 dias, ecrã fluido de 90Hz e conectividade 5G rápida.',
    specs: [
      { label: 'Ecrã', value: '6.5" FHD+ AMOLED 90Hz' },
      { label: 'Processador', value: 'MediaTek Dimensity 7050 5G' },
      { label: 'Câmara', value: 'Principal 64 MP com IA + Macro 2 MP' },
      { label: 'Bateria', value: '4800 mAh com Carga SuperSpeed 33W' },
      { label: 'Armazenamento', value: '128 GB expansível via MicroSD' },
    ],
    imageUrl: createProductSvg('Smartphones', 'NovaLite 5G', '#38bdf8', 'phone'),
    imageAlt: 'Smartphone NovaLite 5G azul celeste',
  },
  {
    id: 'prod-6',
    name: 'Smartphone FoldMaster Ultra 512GB',
    category: 'smartphones',
    description: 'Smartphone dobrável premium que se transforma em tablet compacto para multitarefa sem concessões.',
    specs: [
      { label: 'Ecrã Principal', value: '7.6" Dynamic AMOLED 2X 120Hz dobrável' },
      { label: 'Ecrã Secundário', value: '6.2" Dynamic AMOLED 2X 120Hz' },
      { label: 'Memória e Disco', value: '12 GB RAM + 512 GB Armazenamento' },
      { label: 'Resistência', value: 'Classificação IPX8 contra água' },
      { label: 'Bateria', value: '4400 mAh com partilha sem fios' },
    ],
    imageUrl: createProductSvg('Smartphones', 'FoldMaster Ultra', '#6366f1', 'phone'),
    imageAlt: 'Smartphone dobrável FoldMaster Ultra semiaberto',
  },

  // ÁUDIO
  {
    id: 'prod-7',
    name: 'Auscultadores Sem Fios SonarMax ANC',
    category: 'audio',
    description: 'Auscultadores circum-aurais com cancelamento ativo de ruído líder, áudio de alta resolução e almofadas em espuma viscoelástica.',
    specs: [
      { label: 'Cancelamento Ruído', value: 'ANC Híbrido com 8 microfones calibrados' },
      { label: 'Autonomia', value: 'Até 40 horas com ANC ligado (60h desligado)' },
      { label: 'Conectividade', value: 'Bluetooth 5.3 Multiponto e Jack 3.5mm' },
      { label: 'Codecs Áudio', value: 'LDAC, AAC, SBC de baixa latência' },
      { label: 'Carregamento', value: 'USB-C rápido (10 min = 5 horas de reprodução)' },
    ],
    imageUrl: createProductSvg('Áudio', 'SonarMax ANC', '#0284c7', 'headphones'),
    imageAlt: 'Auscultadores SonarMax ANC pretos com detalhes metálicos',
  },
  {
    id: 'prod-8',
    name: 'Auriculares True Wireless SoundPulse Pro',
    category: 'audio',
    description: 'Auriculares sem fios compactos com isolamento acústico superior, resistência ao suor e som calibrado em estúdio.',
    specs: [
      { label: 'Tipo', value: 'In-Ear True Wireless com pontas em silicone' },
      { label: 'Cancelamento Ruído', value: 'ANC Dinâmico até -35 dB' },
      { label: 'Autonomia', value: '8 horas + 24 horas na caixa de carregamento' },
      { label: 'Resistência', value: 'Classificação IPX5 à chuva e suor' },
      { label: 'Carregamento', value: 'Estojo compatível com carregamento sem fios Qi' },
    ],
    imageUrl: createProductSvg('Áudio', 'SoundPulse Pro', '#38bdf8', 'headphones'),
    imageAlt: 'Estojo aberto com auriculares SoundPulse Pro',
  },
  {
    id: 'prod-9',
    name: 'Coluna Bluetooth Portátil BassWave 360',
    category: 'audio',
    description: 'Coluna portátil robusta com som omnidirecional 360°, graves encorpados e autonomia para um fim de semana inteiro.',
    specs: [
      { label: 'Potência', value: '30W RMS com radiadores passivos duplos' },
      { label: 'Proteção', value: 'Certificação IP67 (submersível em água e poeira)' },
      { label: 'Autonomia', value: 'Até 18 horas de reprodução contínua' },
      { label: 'Conexão', value: 'Bluetooth 5.3 com modo emparelhamento TWS duplo' },
      { label: 'Peso', value: '720 g' },
    ],
    imageUrl: createProductSvg('Áudio', 'BassWave 360', '#0ea5e9', 'headphones'),
    imageAlt: 'Coluna portátil BassWave 360 cilíndrica',
  },

  // ACESSÓRIOS
  {
    id: 'prod-10',
    name: 'Monitor UltraWide 34" Curvo WQHD 165Hz',
    category: 'acessorios',
    description: 'Monitor panorâmico imersivo curvatura 1500R, perfeito para produtividade multijanela e jogabilidade envolvente.',
    specs: [
      { label: 'Painel', value: '34" VA Antirreflexo Curvatura 1500R' },
      { label: 'Resolução', value: 'WQHD 3440 x 1440 (proporção 21:9)' },
      { label: 'Taxa de Atualização', value: '165Hz com AMD FreeSync Premium' },
      { label: 'Cores e Brilho', value: '99% sRGB, HDR400, 350 nits' },
      { label: 'Conetividade', value: '2x HDMI 2.0, 1x DisplayPort 1.4, Hub USB 3.0' },
    ],
    imageUrl: createProductSvg('Acessórios', 'UltraWide 34"', '#0284c7', 'monitor'),
    imageAlt: 'Monitor curvo panorâmico de 34 polegadas com suporte ergonómico',
  },
  {
    id: 'prod-11',
    name: 'Teclado Mecânico RGB Pro Compact',
    category: 'acessorios',
    description: 'Teclado mecânico formato 75% com layout português PT-PT, switches táteis lubrificados e estrutura com amortecimento acústico.',
    specs: [
      { label: 'Layout', value: 'Português de Portugal (ISO-PT) formato 75%' },
      { label: 'Switches', value: 'Mecânicos Táteis Red (50M cliques, hot-swap)' },
      { label: 'Construção', value: 'Placa superior em alumínio aeroespacial com espuma PORON' },
      { label: 'Iluminação', value: 'RGB personalizável tecla a tecla com perfis na memória' },
      { label: 'Cabo', value: 'Cabo entrançado USB-C amovível de 1.8 m' },
    ],
    imageUrl: createProductSvg('Acessórios', 'Teclado RGB Pro', '#38bdf8', 'monitor'),
    imageAlt: 'Teclado mecânico compacto com retroiluminação suave',
  },
  {
    id: 'prod-12',
    name: 'Rato Sem Fios Ergonómico MasterFlow',
    category: 'acessorios',
    description: 'Rato de precisão anatómico com roda de deslocamento eletromagnética, sensor de vidro e conectividade tripla.',
    specs: [
      { label: 'Sensor', value: 'Óptico Darkfield de alta precisão 4000 DPI' },
      { label: 'Conexão', value: 'Bluetooth Low Energy ou recetor USB LogiBolt 2.4 GHz' },
      { label: 'Autonomia', value: 'Até 70 dias com carga completa via USB-C' },
      { label: 'Botões', value: '7 botões programáveis com roda horizontal de polegar' },
      { label: 'Compatibilidade', value: 'Windows, macOS, Linux' },
    ],
    imageUrl: createProductSvg('Acessórios', 'MasterFlow Rato', '#0ea5e9', 'monitor'),
    imageAlt: 'Rato ergonómico sem fios cinzento escuro com apoio de polegar',
  },
];

export const INITIAL_OFFERS: Offer[] = [
  // prod-1 (Portátil NexoPro 15): Concorrente TechNorte e ByteZone
  {
    id: 'off-1',
    productId: 'prod-1',
    sellerId: 'seller-technorte',
    priceInCents: 89900, // 899,00 €
    stock: 6,
  },
  {
    id: 'off-2',
    productId: 'prod-1',
    sellerId: 'seller-bytezone',
    priceInCents: 92900, // 929,00 €
    stock: 3,
  },

  // prod-2 (Ultrabook SlimAir 13): GadgetHub
  {
    id: 'off-3',
    productId: 'prod-2',
    sellerId: 'seller-gadgethub',
    priceInCents: 124900, // 1 249,00 €
    stock: 4,
  },

  // prod-3 (Desktop Gaming Titan X): TechNorte
  {
    id: 'off-4',
    productId: 'prod-3',
    sellerId: 'seller-technorte',
    priceInCents: 169900, // 1 699,00 €
    stock: 2,
  },

  // prod-4 (Smartphone Apex Pro 5G): Três lojas com concorrência
  {
    id: 'off-5',
    productId: 'prod-4',
    sellerId: 'seller-bytezone',
    priceInCents: 74900, // 749,00 € (menor preço disponível)
    stock: 5,
  },
  {
    id: 'off-6',
    productId: 'prod-4',
    sellerId: 'seller-technorte',
    priceInCents: 75900, // 759,00 €
    stock: 2,
  },
  {
    id: 'off-7',
    productId: 'prod-4',
    sellerId: 'seller-gadgethub',
    priceInCents: 76900, // 769,00 €
    stock: 8,
  },

  // prod-5 (Smartphone NovaLite 5G): TechNorte
  {
    id: 'off-8',
    productId: 'prod-5',
    sellerId: 'seller-technorte',
    priceInCents: 24900, // 249,00 €
    stock: 12,
  },

  // prod-6 (Smartphone FoldMaster Ultra): Totalmente ESGOTADO (stock 0)
  {
    id: 'off-9',
    productId: 'prod-6',
    sellerId: 'seller-bytezone',
    priceInCents: 159900, // 1 599,00 €
    stock: 0,
  },

  // prod-7 (Auscultadores SonarMax ANC): Concorrente TechNorte e GadgetHub
  {
    id: 'off-10',
    productId: 'prod-7',
    sellerId: 'seller-technorte',
    priceInCents: 17900, // 179,00 €
    stock: 7,
  },
  {
    id: 'off-11',
    productId: 'prod-7',
    sellerId: 'seller-gadgethub',
    priceInCents: 18900, // 189,00 €
    stock: 5,
  },

  // prod-8 (Auriculares SoundPulse Pro): ByteZone
  {
    id: 'off-12',
    productId: 'prod-8',
    sellerId: 'seller-bytezone',
    priceInCents: 9900, // 99,00 €
    stock: 15,
  },

  // prod-9 (Coluna BassWave 360): GadgetHub
  {
    id: 'off-13',
    productId: 'prod-9',
    sellerId: 'seller-gadgethub',
    priceInCents: 6900, // 69,00 €
    stock: 9,
  },

  // prod-10 (Monitor UltraWide 34): Concorrente ByteZone e TechNorte
  {
    id: 'off-14',
    productId: 'prod-10',
    sellerId: 'seller-bytezone',
    priceInCents: 38900, // 389,00 €
    stock: 4,
  },
  {
    id: 'off-15',
    productId: 'prod-10',
    sellerId: 'seller-technorte',
    priceInCents: 39900, // 399,00 €
    stock: 3,
  },

  // prod-11 (Teclado Mecânico RGB Pro Compact): GadgetHub
  {
    id: 'off-12b',
    productId: 'prod-11',
    sellerId: 'seller-gadgethub',
    priceInCents: 5990, // 59,90 €
    stock: 14,
  },

  // prod-12 (Rato Sem Fios Ergonómico MasterFlow): TechNorte
  {
    id: 'off-13b',
    productId: 'prod-12',
    sellerId: 'seller-technorte',
    priceInCents: 4990, // 49,90 €
    stock: 10,
  },
];

export const INITIAL_DEMO_ORDERS: DemoOrder[] = [
  {
    id: 'ord-demo-101',
    createdAt: '2026-10-01T10:30:00Z',
    groups: [
      {
        sellerId: 'seller-technorte',
        sellerName: 'TechNorte',
        items: [
          {
            productId: 'prod-1',
            productName: 'Portátil NexoPro 15" i7 16GB 512GB SSD',
            sellerId: 'seller-technorte',
            sellerName: 'TechNorte',
            priceInCents: 89900,
            quantity: 1,
          },
        ],
        subtotalInCents: 89900,
      },
      {
        sellerId: 'seller-bytezone',
        sellerName: 'ByteZone',
        items: [
          {
            productId: 'prod-8',
            productName: 'Auriculares True Wireless SoundPulse Pro',
            sellerId: 'seller-bytezone',
            sellerName: 'ByteZone',
            priceInCents: 9900,
            quantity: 1,
          },
        ],
        subtotalInCents: 9900,
      },
    ],
    totalInCents: 99800,
  },
];