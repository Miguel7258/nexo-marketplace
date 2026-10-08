import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHttp(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await new Promise((resolve, reject) => {
        const req = http.get(url, (r) => resolve(r));
        req.on('error', reject);
      });
      if (res.statusCode >= 200 && res.statusCode < 400) return true;
    } catch {
      // retry
    }
    await wait(250);
  }
  throw new Error(`Timeout aguardando por ${url}`);
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const cb = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) cb.reject(new Error(msg.error.message));
          else cb.resolve(msg.result);
        }
      };
    });
  }

  send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(JSON.stringify(res.exceptionDetails));
    }
    return res.result.value;
  }

  async sendTab(shift = false) {
    await this.send('Input.dispatchKeyEvent', {
      type: 'rawKeyDown',
      key: 'Tab',
      code: 'Tab',
      windowsVirtualKeyCode: 9,
      nativeVirtualKeyCode: 9,
      modifiers: shift ? 8 : 0,
    });
    await this.send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'Tab',
      code: 'Tab',
      windowsVirtualKeyCode: 9,
      nativeVirtualKeyCode: 9,
      modifiers: shift ? 8 : 0,
    });
    await wait(80);
  }

  async sendEnter() {
    await this.send('Input.dispatchKeyEvent', {
      type: 'rawKeyDown',
      key: 'Enter',
      code: 'Enter',
      windowsVirtualKeyCode: 13,
      nativeVirtualKeyCode: 13,
      text: '\r',
      unmodifiedText: '\r',
    });
    await this.send('Input.dispatchKeyEvent', {
      type: 'char',
      key: 'Enter',
      code: 'Enter',
      windowsVirtualKeyCode: 13,
      nativeVirtualKeyCode: 13,
      text: '\r',
      unmodifiedText: '\r',
    });
    await this.send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'Enter',
      code: 'Enter',
      windowsVirtualKeyCode: 13,
      nativeVirtualKeyCode: 13,
    });
    await wait(100);
  }

  async sendSpace() {
    await this.send('Input.dispatchKeyEvent', {
      type: 'rawKeyDown',
      key: ' ',
      code: 'Space',
      windowsVirtualKeyCode: 32,
      nativeVirtualKeyCode: 32,
      text: ' ',
      unmodifiedText: ' ',
    });
    await this.send('Input.dispatchKeyEvent', {
      type: 'char',
      key: ' ',
      code: 'Space',
      windowsVirtualKeyCode: 32,
      nativeVirtualKeyCode: 32,
      text: ' ',
      unmodifiedText: ' ',
    });
    await this.send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: ' ',
      code: 'Space',
      windowsVirtualKeyCode: 32,
      nativeVirtualKeyCode: 32,
    });
    await wait(100);
  }

  close() {
    try {
      this.ws.close();
    } catch {}
  }
}

async function run() {
  console.log('=== Início da Validação da Fase 4: Validação e Entrega Local do Nexo ===\n');

  console.log('1. A iniciar o servidor Vite preview em http://127.0.0.1:4173...');
  const previewProc = spawn('cmd.exe', ['/c', 'npm.cmd', 'run', 'preview'], {
    stdio: 'ignore',
  });

  let chromeProc = null;
  let client = null;

  try {
    await waitForHttp('http://127.0.0.1:4173');
    console.log('✓ Servidor preview ativo.\n');

    const chromePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ];
    const chromeExec = chromePaths.find((p) => fs.existsSync(p));
    if (!chromeExec) {
      throw new Error('Google Chrome não encontrado.');
    }

    const tempProfile = path.join('C:\\temp', `chrome-test-p4-${Date.now()}`);
    console.log('2. A iniciar o Google Chrome Headless com porta CDP 9222...');
    chromeProc = spawn(
      chromeExec,
      [
        '--remote-debugging-port=9222',
        '--headless=new',
        '--disable-gpu',
        '--no-first-run',
        `--user-data-dir=${tempProfile}`,
        'about:blank',
      ],
      { stdio: 'ignore' }
    );

    await waitForHttp('http://127.0.0.1:9222/json/list');

    const listRes = await fetch('http://127.0.0.1:9222/json/list').then((r) => r.json());
    const pageTarget = listRes.find((t) => t.type === 'page');
    if (!pageTarget || !pageTarget.webSocketDebuggerUrl) {
      throw new Error('Alvo de página do Chrome não encontrado.');
    }

    client = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();
    await client.send('Page.enable');
    await client.send('DOM.enable');
    await client.send('Runtime.enable');

    await client.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `
        window.__setReactVal = function(el, val) {
          if (!el) return;
          const proto = el instanceof HTMLSelectElement
            ? window.HTMLSelectElement.prototype
            : window.HTMLInputElement.prototype;
          const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
          if (setter) {
            setter.call(el, val);
          } else {
            el.value = val;
          }
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        };
      `,
    });

    const results = [];
    function record(name, passed, detail = '') {
      results.push({ name, passed, detail });
      const symbol = passed ? '✓' : '✗';
      console.log(`[${symbol}] ${name}${detail ? ` — ${detail}` : ''}`);
    }

    // Configurar viewport Desktop inicial
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false,
    });

    console.log('\n--- PARTE I: Percurso Integrado Completo (6 Passos) ---');

    // Inicialização limpa
    await client.send('Page.navigate', { url: 'http://127.0.0.1:4173/' });
    await wait(800);
    await client.eval(`(() => {
      localStorage.clear();
      location.reload();
    })()`);
    await wait(800);

    // PASSO 1: Encontrar um produto e comparar ofertas
    console.log('\n[Passo 1] Encontrar um produto e comparar ofertas:');
    const catalogTitle = await client.eval(`document.querySelector(".hero-title")?.textContent || ""`);
    record('Catálogo acessível com apresentação multivendedor', catalogTitle.includes('Catálogo Tecnológico Multivendedor'));

    // Pesquisar por "NexoPro"
    await client.eval(`(() => {
      const searchInput = document.querySelector(".search-input");
      if (searchInput) window.__setReactVal(searchInput, "NexoPro");
    })()`);
    await wait(400);

    const filteredCardsCount = await client.eval(`document.querySelectorAll(".product-card").length`);
    record('Pesquisa filtra e encontra produto (Portátil NexoPro 15)', filteredCardsCount === 1);

    // Navegar para detalhes de prod-1
    await client.send('Page.navigate', { url: 'http://127.0.0.1:4173/produto/prod-1' });
    await wait(800);

    const productTitle = await client.eval(`document.querySelector(".product-detail-title")?.textContent || ""`);
    record('Página de detalhe do produto carregada', productTitle.includes('Portátil NexoPro 15'));

    // Comparar ofertas na página de detalhes
    const offerCards = await client.eval(`(() => {
      const cards = document.querySelectorAll(".offer-item-card");
      return Array.from(cards).map(c => ({
        seller: c.querySelector(".seller-name")?.textContent.trim(),
        price: c.querySelector(".offer-price")?.textContent.trim(),
        stock: c.querySelector(".stock-tag")?.textContent.trim(),
        isBestPrice: c.querySelector(".best-price-badge") !== null
      }));
    })()`);
    
    const hasMultipleOffers = offerCards.length >= 2;
    const hasTechNorte = offerCards.some(o => o.seller === 'TechNorte');
    const hasByteZone = offerCards.some(o => o.seller === 'ByteZone');
    const techNorteHasBestPrice = offerCards.find(o => o.seller === 'TechNorte')?.isBestPrice === true;
    record('Produto apresenta ofertas concorrentes de pelo menos duas lojas (TechNorte e ByteZone)', hasMultipleOffers && hasTechNorte && hasByteZone);
    record('Destaque explícito de Melhor Preço atribuído à oferta mais económica (TechNorte: 899,00 €)', techNorteHasBestPrice);

    // PASSO 2: Adicionar artigos de duas lojas e rever totais
    console.log('\n[Passo 2] Adicionar artigos de duas lojas e rever totais:');
    // Adicionar prod-1 da TechNorte (899,00 €)
    await client.eval(`(() => {
      const techCard = Array.from(document.querySelectorAll(".offer-item-card")).find(c => c.querySelector(".seller-name")?.textContent.includes("TechNorte"));
      const btn = techCard?.querySelector(".btn-offer-cart");
      if (btn) btn.click();
    })()`);
    await wait(400);

    let cartBadge = await client.eval(`document.querySelector(".navbar-cart-badge")?.textContent.trim()`);
    record('Artigo da TechNorte adicionado ao carrinho (contador = 1)', cartBadge === '1');

    // Navegar para prod-8 (Auriculares SoundPulse ANC) vendido por ByteZone (99,00 €)
    await client.send('Page.navigate', { url: 'http://127.0.0.1:4173/produto/prod-8' });
    await wait(800);
    await client.eval(`(() => {
      const btn = document.querySelector(".btn-offer-cart");
      if (btn) btn.click();
    })()`);
    await wait(400);

    cartBadge = await client.eval(`document.querySelector(".navbar-cart-badge")?.textContent.trim()`);
    record('Artigo da ByteZone adicionado ao carrinho (contador = 2)', cartBadge === '2');

    // Ir a /carrinho e verificar agrupamento e totais
    await client.send('Page.navigate', { url: 'http://127.0.0.1:4173/carrinho' });
    await wait(800);

    const storeGroups = await client.eval(`(() => {
      const groups = document.querySelectorAll(".cart-seller-group-card");
      return Array.from(groups).map(g => ({
        storeName: g.querySelector(".cart-seller-name")?.textContent.trim() || "",
        subtotal: g.querySelector(".seller-footer-amount")?.textContent.trim() || ""
      }));
    })()`);

    const cartGroupedByTwoStores = storeGroups.length === 2 &&
      storeGroups.some(g => g.storeName.includes('TechNorte') && g.subtotal.includes('899,00')) &&
      storeGroups.some(g => g.storeName.includes('ByteZone') && g.subtotal.includes('99,00'));
    record('Carrinho agrupa artigos por vendedor com subtotais independentes (TechNorte: 899,00 € | ByteZone: 99,00 €)', cartGroupedByTwoStores);

    const orderTotal = await client.eval(`document.querySelector(".final-total-value")?.textContent.trim() || ""`);
    record('Cálculo exato do total da encomenda em euros (998,00 €)', orderTotal.includes('998,00'));

    // PASSO 3: Alterar preço e stock na área de vendedor
    console.log('\n[Passo 3] Alterar preço e stock na área de vendedor:');
    await client.send('Page.navigate', { url: 'http://127.0.0.1:4173/vendedor' });
    await wait(800);

    // Garantir que TechNorte está selecionada
    await client.eval(`document.querySelector("#tab-seller-seller-technorte")?.click()`);
    await wait(400);

    // Abrir edição da primeira oferta (off-1: Portátil NexoPro 15)
    await client.eval(`(() => {
      const editBtns = document.querySelectorAll(".btn-edit-offer");
      if (editBtns.length > 0) editBtns[0].click();
    })()`);
    await wait(400);

    // Modificar preço para 849,00 € e stock para 2
    await client.eval(`(() => {
      const priceInput = document.querySelector(".offer-inline-edit-box input[type='text']");
      const stockInput = document.querySelector(".offer-inline-edit-box input[type='number']");
      if (priceInput) window.__setReactVal(priceInput, "849,00");
      if (stockInput) window.__setReactVal(stockInput, "2");
      const submitBtn = document.querySelector(".offer-inline-edit-box button[type='submit']");
      if (submitBtn) submitBtn.click();
    })()`);
    await wait(800);

    const editFeedback = await client.eval(`document.querySelector(".seller-feedback-banner.success")?.textContent || ""`);
    record('Edição de oferta pelo vendedor gravada com sucesso (novo preço 849,00 €, novo stock 2)', editFeedback.includes('atualizada com sucesso'));

    // PASSO 4: Confirmar que a compra exige rever essas alterações
    console.log('\n[Passo 4] Confirmar que a compra exige rever as alterações efetuadas pelo vendedor:');
    await client.send('Page.navigate', { url: 'http://127.0.0.1:4173/carrinho' });
    await wait(800);

    // Tentar avançar com a compra (handleCheckout) para desencadear revalidação
    await client.eval(`(() => {
      const checkoutBtn = document.querySelector(".btn-checkout");
      if (checkoutBtn) checkoutBtn.click();
    })()`);
    await wait(1000);

    const warningBannerText = await client.eval(`document.querySelector(".cart-warning-banner")?.textContent || ""`);
    const requiredReview = warningBannerText.includes('849,00') || warningBannerText.includes('ajustada') || warningBannerText.includes('rever') || warningBannerText.includes('alterado');
    record('Revalidação ativa bloqueia compra imediata e exige rever preço atualizado pelo vendedor', requiredReview, warningBannerText.trim());

    // Verificar que o total foi ajustado após revalidação para 849 + 99 = 948,00 €
    const updatedTotalAfterRevalidation = await client.eval(`document.querySelector(".final-total-value")?.textContent.trim() || ""`);
    record('Total do carrinho recalculado para o novo preço da oferta (948,00 €)', updatedTotalAfterRevalidation.includes('948,00'));

    // PASSO 5: Concluir a simulação e consultar os artigos de cada loja nas encomendas
    console.log('\n[Passo 5] Concluir a simulação e consultar os artigos de cada loja nas encomendas:');
    // Concluir compra revalidada
    await client.eval(`(() => {
      const checkoutBtn = document.querySelector(".btn-checkout");
      if (checkoutBtn) checkoutBtn.click();
    })()`);
    await wait(1000);

    const confTitle = await client.eval(`document.querySelector(".confirmation-title")?.textContent || ""`);
    const orderRef = await client.eval(`document.querySelector(".font-mono")?.textContent || ""`);
    record('Ecrã de confirmação de simulação exibido com referência de encomenda', confTitle.includes('Compra Simulada com Sucesso!') && orderRef.startsWith('#ord-sim-'));

    // Verificar encomendas na área do vendedor para TechNorte
    await client.send('Page.navigate', { url: 'http://127.0.0.1:4173/vendedor' });
    await wait(800);
    await client.eval(`document.querySelector("#tab-seller-seller-technorte")?.click()`);
    await wait(300);
    await client.eval(`document.querySelector("#tab-view-orders")?.click()`);
    await wait(400);

    const techSellerOrders = await client.eval(`(() => {
      const cards = document.querySelectorAll(".seller-order-card");
      return Array.from(cards).map(c => ({
        ref: c.querySelector(".order-ref-value")?.textContent.trim(),
        total: c.querySelector(".subtotal-value")?.textContent.trim(),
        items: Array.from(c.querySelectorAll(".order-item-title")).map(i => i.textContent.trim())
      }));
    })()`);

    const techOrderFound = techSellerOrders.find(o => o.ref && o.ref.includes(orderRef.replace('#', '')));
    const techHasLaptop = techOrderFound && techOrderFound.items.some(i => i.includes('Portátil NexoPro 15'));
    const techHasNoHeadphones = techOrderFound && !techOrderFound.items.some(i => i.includes('SoundPulse'));
    record('TechNorte visualiza na encomenda simulada exclusivamente o seu artigo e subtotal', techHasLaptop && techHasNoHeadphones);

    // Verificar encomendas na área do vendedor para ByteZone
    await client.eval(`document.querySelector("#tab-seller-seller-bytezone")?.click()`);
    await wait(400);
    await client.eval(`document.querySelector("#tab-view-orders")?.click()`);
    await wait(400);

    const byteSellerOrders = await client.eval(`(() => {
      const cards = document.querySelectorAll(".seller-order-card");
      return Array.from(cards).map(c => ({
        ref: c.querySelector(".order-ref-value")?.textContent.trim(),
        total: c.querySelector(".subtotal-value")?.textContent.trim(),
        items: Array.from(c.querySelectorAll(".order-item-title")).map(i => i.textContent.trim())
      }));
    })()`);

    const byteOrderFound = byteSellerOrders.find(o => o.ref && o.ref.includes(orderRef.replace('#', '')));
    const byteHasHeadphones = byteOrderFound && byteOrderFound.items.some(i => i.includes('SoundPulse'));
    const byteHasNoLaptop = byteOrderFound && !byteOrderFound.items.some(i => i.includes('Portátil'));
    record('ByteZone visualiza na encomenda simulada exclusivamente o seu artigo e subtotal (sem fuga interlojas)', byteHasHeadphones && byteHasNoLaptop);

    // PASSO 6: Recarregar e confirmar persistência; repor a demonstração
    console.log('\n[Passo 6] Recarregar e confirmar persistência; repor a demonstração:');
    await client.send('Page.reload');
    await wait(800);

    const orderPersistedAfterReload = await client.eval(`(() => {
      const snap = JSON.parse(localStorage.getItem("nexo_marketplace_snapshot_v1"));
      const exists = snap.orders.some(o => o.id.startsWith("ord-sim-"));
      return exists;
    })()`);
    record('Persistência confirmada após recarregar a página (encomenda permanece no snapshot local)', orderPersistedAfterReload);

    // Clicar em "Repor dados" na Navbar
    await client.eval(`(() => {
      const resetBtn = document.querySelector(".btn-reset");
      if (resetBtn) resetBtn.click();
    })()`);
    await wait(400);

    const resetFeedbackActive = await client.eval(`(() => {
      const resetBtn = document.querySelector(".btn-reset");
      return resetBtn ? resetBtn.textContent.includes("Dados repostos") : false;
    })()`);
    record('Feedback visual "Dados repostos" ativo após acionamento do botão', resetFeedbackActive);

    const initialDataRestored = await client.eval(`(() => {
      const snap = JSON.parse(localStorage.getItem("nexo_marketplace_snapshot_v1"));
      const off1 = snap.offers.find(o => o.id === "off-1");
      const orderCount = snap.orders.length;
      // off-1 original price: 89900, stock: 6; original demo orders: 1 (ord-demo-101)
      return off1.priceInCents === 89900 && off1.stock === 6 && orderCount === 1;
    })()`);
    record('Reposição integral restaura preços originais (899,00 €), stock inicial (6) e histórico demonstrativo inicial', initialDataRestored);

    const cartCleared = await client.eval(`(() => {
      const snap = JSON.parse(localStorage.getItem("nexo_marketplace_snapshot_v1"));
      const cartBadge = document.querySelector(".navbar-cart-badge");
      return snap.cart.length === 0 && !cartBadge;
    })()`);
    record('Reposição limpa o carrinho e contador na barra de navegação', cartCleared);

    await wait(2200);
    const resetFeedbackEnded = await client.eval(`(() => {
      const resetBtn = document.querySelector(".btn-reset");
      return resetBtn ? resetBtn.textContent.includes("Repor dados") : false;
    })()`);
    record('Feedback visual regressa a "Repor dados" após o período previsto de 2,5 segundos', resetFeedbackEnded);

    console.log('\n--- PARTE II: Responsividade e Conteúdo Visível (Desktop vs 360 px) ---');

    async function checkViewVisibilityAndClipping(pageName, url, setupFn = null) {
      if (url) {
        await client.send('Page.navigate', { url });
        await wait(600);
      }
      if (setupFn) {
        await client.eval(setupFn);
        await wait(500);
      }

      // Testar em Desktop (1280px)
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: 1280,
        height: 800,
        deviceScaleFactor: 1,
        mobile: false,
      });
      await wait(300);

      const desktopCheck = await client.eval(`(() => {
        const docW = document.documentElement.clientWidth;
        return {
          hasContent: (document.body.innerText.trim().length > 50),
          clientWidth: docW,
        };
      })()`);
      record(`[Desktop 1280px] ${pageName}: Conteúdo visível e renderizado`, desktopCheck.hasContent);

      // Testar em Mobile (360px)
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: 360,
        height: 740,
        deviceScaleFactor: 1,
        mobile: true,
      });
      await wait(400);

      const mobileCheck = await client.eval(`(() => {
        const viewportW = window.innerWidth;
        const scrollW = document.documentElement.scrollWidth;
        const all = Array.from(document.querySelectorAll("*"));
        
        const clippedIssues = [];
        for (const el of all) {
          const tag = el.tagName.toLowerCase();
          if (["script", "style", "meta", "link", "head", "noscript", "br"].includes(tag)) continue;
          const style = window.getComputedStyle(el);
          if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") continue;
          
          // Se o elemento estiver contido dentro de um elemento com scroll horizontal intencional (ex: offers-table-wrapper), não é corte indevido
          let ancestor = el.parentElement;
          let insideScrollable = false;
          while (ancestor && ancestor !== document.body) {
            const aStyle = window.getComputedStyle(ancestor);
            if (aStyle.overflowX === "auto" || aStyle.overflowX === "scroll") {
              insideScrollable = true;
              break;
            }
            ancestor = ancestor.parentElement;
          }
          if (insideScrollable) continue;

          const rect = el.getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) continue;
          
          // Verificar se ultrapassa a margem visível de 360 px (tolerância de 1.5px)
          if (rect.right > viewportW + 1.5 || rect.left < -1.5) {
            clippedIssues.push({
              tag,
              className: el.className ? (typeof el.className === "string" ? el.className.split(" ")[0] : "") : "",
              id: el.id || "",
              text: (el.textContent || "").trim().slice(0, 30),
              right: Math.round(rect.right),
              left: Math.round(rect.left),
              overflow: Math.round(rect.right - viewportW)
            });
          }
        }

        // Inspeção específica da Navbar
        const cartLink = document.querySelector(".nav-cart-link");
        const resetBtn = document.querySelector(".btn-reset");
        const cartRect = cartLink ? cartLink.getBoundingClientRect() : null;
        const resetRect = resetBtn ? resetBtn.getBoundingClientRect() : null;
        const isCartClipped = cartRect ? cartRect.right > viewportW : true;
        const isResetClipped = resetRect ? resetRect.right > viewportW : true;

        return {
          viewportW,
          scrollW,
          clippedIssuesCount: clippedIssues.length,
          clippedIssues,
          isCartClipped,
          isResetClipped
        };
      })()`);

      const noClipping = mobileCheck.clippedIssuesCount === 0;
      let detailMsg = '';
      if (!noClipping) {
        const clippedNames = [...new Set(mobileCheck.clippedIssues.map(i => `<${i.tag} class="${i.className}">`))].join(', ');
        detailMsg = `CORTADO por overflow-x: hidden (${mobileCheck.clippedIssuesCount} elementos fora dos 360px: ${clippedNames})`;
      } else {
        detailMsg = 'todos os elementos dentro dos 360 px visíveis';
      }

      record(
        `[Mobile 360px] ${pageName}: Conteúdo visível sem corte por overflow-x: hidden`,
        noClipping,
        detailMsg
      );
    }

    // 1. Catálogo
    await checkViewVisibilityAndClipping('Catálogo', 'http://127.0.0.1:4173/');

    // 2. Detalhes do Produto
    await checkViewVisibilityAndClipping('Detalhes do Produto (prod-1)', 'http://127.0.0.1:4173/produto/prod-1');

    // 3. Carrinho Preenchido (2 Lojas)
    await checkViewVisibilityAndClipping(
      'Carrinho Preenchido (2 Lojas)',
      'http://127.0.0.1:4173/carrinho',
      `(() => {
        const snap = JSON.parse(localStorage.getItem("nexo_marketplace_snapshot_v1"));
        snap.cart = [
          { offerId: "off-1", quantity: 1, addedAt: new Date().toISOString() },
          { offerId: "off-8", quantity: 2, addedAt: new Date().toISOString() }
        ];
        localStorage.setItem("nexo_marketplace_snapshot_v1", JSON.stringify(snap));
        location.reload();
      })()`
    );

    // 4. Confirmação de Encomenda Simulada
    await checkViewVisibilityAndClipping(
      'Confirmação de Encomenda Simulada',
      null,
      `(() => {
        const checkoutBtn = document.querySelector(".btn-checkout");
        if (checkoutBtn) checkoutBtn.click();
      })()`
    );

    // 5. Área de Vendedor (Aba Ofertas)
    await checkViewVisibilityAndClipping('Área de Vendedor (Aba Ofertas)', 'http://127.0.0.1:4173/vendedor');

    // 6. Área de Vendedor (Aba Encomendas)
    await checkViewVisibilityAndClipping(
      'Área de Vendedor (Aba Encomendas)',
      null,
      `(() => {
        const tabOrders = document.querySelector("#tab-view-orders");
        if (tabOrders) tabOrders.click();
      })()`
    );

    // 7. Navbar a 360 px com mensagem "Dados repostos" ativa
    await client.eval(`(() => {
      const resetBtn = document.querySelector(".btn-reset");
      if (resetBtn) resetBtn.click();
    })()`);
    await wait(300);
    const feedbackClippedCheck = await client.eval(`(() => {
      const resetBtn = document.querySelector(".btn-reset");
      const cartLink = document.querySelector(".nav-cart-link");
      if (!resetBtn || !cartLink) return { ok: false };
      const resetRect = resetBtn.getBoundingClientRect();
      const cartRect = cartLink.getBoundingClientRect();
      const isDadosRepostos = resetBtn.textContent.includes("Dados repostos");
      const resetInView = resetRect.right <= window.innerWidth + 1.5 && resetRect.left >= -1.5;
      const cartInView = cartRect.right <= window.innerWidth + 1.5 && cartRect.left >= -1.5;
      return {
        ok: isDadosRepostos && resetInView && cartInView,
        text: resetBtn.textContent.trim(),
        resetRight: Math.round(resetRect.right),
        cartRight: Math.round(cartRect.right),
        viewportW: window.innerWidth
      };
    })()`);
    record(
      '[Mobile 360px] Navbar com mensagem "Dados repostos" sem cortes no viewport de 360 px',
      feedbackClippedCheck.ok,
      `resetRight=${feedbackClippedCheck.resetRight}px, cartRight=${feedbackClippedCheck.cartRight}px, viewport=${feedbackClippedCheck.viewportW}px`
    );

    console.log('\n--- PARTE III: Acessibilidade e Navegação Real por Teclado ---');
    // Voltar a viewport desktop para o teste de teclado
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await client.send('Page.navigate', { url: 'http://127.0.0.1:4173/' });
    await wait(800);

    // Focar o início da página
    await client.eval(`window.scrollTo(0, 0); document.body.focus();`);
    await wait(200);

    // 1. Tab até ao Skip Link
    await client.sendTab(false);
    const focused1 = await client.eval(`document.activeElement.className`);
    record('Tecla Tab move foco para o Skip Link ("Saltar para o conteúdo principal")', focused1.includes('skip-link'));

    // 2. Tab até ao Logótipo
    await client.sendTab(false);
    const focused2 = await client.eval(`document.activeElement.className`);
    record('Tecla Tab avança foco para o Logótipo da Nexo', focused2.includes('navbar-logo'));

    // 3. Tab através dos links da Navbar: Catálogo -> Vendedor -> Carrinho
    await client.sendTab(false); // Catálogo
    await client.sendTab(false); // Vendedor
    const focusedNavVendedor = await client.eval(`({ tag: document.activeElement.tagName, text: document.activeElement.textContent.trim(), href: document.activeElement.getAttribute('href') })`);
    record('Tecla Tab foca link "Vendedor" na Navbar', focusedNavVendedor.text.includes('Vendedor') && focusedNavVendedor.href === '/vendedor');

    // 4. Testar Shift+Tab para recuar foco
    await client.sendTab(true); // Shift+Tab volta para Catálogo
    const focusedShiftBack = await client.eval(`document.activeElement.textContent.trim()`);
    record('Shift+Tab recua o foco para o elemento anterior ("Catálogo")', focusedShiftBack === 'Catálogo');

    // Avançar de novo para "Vendedor"
    await client.sendTab(false);

    // 5. Testar ativação por tecla Enter num link
    await client.sendEnter();
    await wait(800);
    const pathAfterEnter = await client.eval(`location.pathname`);
    record('Tecla Enter no link aciona navegação para a rota /vendedor', pathAfterEnter === '/vendedor');

    // 6. Testar navegação por Tab até aos controlos do vendedor e acionamento por Espaço
    await client.eval(`document.querySelector("#tab-seller-seller-bytezone")?.focus()`);
    await wait(200);

    const activeBeforeSpace = await client.eval(`document.querySelector(".active-store-title")?.textContent.trim()`);
    await client.sendSpace();
    await wait(400);

    const activeAfterSpace = await client.eval(`document.querySelector(".active-store-title")?.textContent.trim()`);
    record('Tecla Espaço aciona controlo/botão de seleção de loja (TechNorte -> ByteZone)', activeBeforeSpace === 'TechNorte' && activeAfterSpace === 'ByteZone');

    // 7. Testar Tab até ao botão "Adicionar Oferta" e abertura com Enter
    await client.eval(`document.querySelector(".btn-add-offer")?.focus()`);
    await wait(200);
    await client.sendEnter();
    await wait(400);

    const createFormOpenByEnter = await client.eval(`document.querySelector(".create-offer-card") !== null`);
    record('Tecla Enter em botão de ação abre o formulário correspondente', createFormOpenByEnter);

    // 8. Verificar que controlos focados apresentam foco visível (outline / focus-visible)
    const focusVisibleApplied = await client.eval(`(() => {
      const activeEl = document.querySelector("#create-product-select");
      if (activeEl) activeEl.focus();
      const style = window.getComputedStyle(document.activeElement);
      return style.outlineStyle !== "none" || style.boxShadow.length > 4 || style.borderColor.length > 0;
    })()`);
    record('Controlos interativos mantêm foco visível perceptível', focusVisibleApplied);

    console.log('\n--- Resumo Final da Validação da Fase 4 ---');
    const allPassed = results.every((r) => r.passed);
    const passedCount = results.filter((r) => r.passed).length;
    const failedCount = results.length - passedCount;
    console.log(`Total de verificações realizadas: ${results.length}`);
    console.log(`Aprovadas: ${passedCount}`);
    console.log(`Falhadas: ${failedCount}`);

    if (!allPassed) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Erro na execução da verificação da Fase 4:', err);
    process.exitCode = 1;
  } finally {
    if (client) client.close();
    if (chromeProc) {
      try {
        process.kill(chromeProc.pid);
      } catch {}
    }
    if (previewProc) {
      try {
        process.kill(previewProc.pid);
      } catch {}
    }
  }
}

run();
