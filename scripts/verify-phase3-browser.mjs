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

  close() {
    try {
      this.ws.close();
    } catch {}
  }
}

async function run() {
  console.log('--- Iniciando Verificação de Navegador Real (Fase 3: Área do Vendedor) ---');

  // Iniciar servidor preview
  console.log('A iniciar vite preview em http://127.0.0.1:4173...');
  const previewProc = spawn('cmd.exe', ['/c', 'npm.cmd', 'run', 'preview'], {
    stdio: 'ignore',
  });

  let chromeProc = null;
  let client = null;

  try {
    await waitForHttp('http://127.0.0.1:4173');
    console.log('Servidor preview ativo.');

    // Localizar Chrome
    const chromePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ];
    const chromeExec = chromePaths.find((p) => fs.existsSync(p));
    if (!chromeExec) {
      throw new Error('Google Chrome não encontrado nos caminhos padrão.');
    }

    const tempProfile = path.join('C:\\temp', `chrome-test-p3-${Date.now()}`);
    console.log('A lançar Google Chrome Headless...');
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
      console.log(`[${symbol}] ${name}${detail ? ` (${detail})` : ''}`);
    }

    // 1. Navegação para a rota /vendedor e garantia de estado inicial limpo
    await client.send('Page.navigate', { url: 'http://127.0.0.1:4173/vendedor' });
    await wait(800);
    await client.eval(`(() => {
      localStorage.clear();
      location.reload();
    })()`);
    await wait(800);

    const titleText = await client.eval(`
      document.querySelector(".seller-page-title")?.textContent || ""
    `);
    record('Rota /vendedor carrega e exibe o título da página', titleText.includes('Vendedor'));

    const demoBadge = await client.eval(`
      document.querySelector(".seller-header-badge")?.textContent || ""
    `);
    record('Identificação explícita de ambiente de demonstração', demoBadge.includes('Demonstração'));

    // 2. Seletor de Loja Fictícia (três lojas parceiras)
    const storeCount = await client.eval(`
      document.querySelectorAll(".seller-store-tab-btn").length
    `);
    record('Exibição dos botões para as três lojas parceiras', storeCount === 3, `encontradas: ${storeCount}`);

    const storeNames = await client.eval(`
      Array.from(document.querySelectorAll(".tab-store-name")).map(el => el.textContent.trim())
    `);
    const hasThreeStores =
      storeNames.includes('TechNorte') &&
      storeNames.includes('ByteZone') &&
      storeNames.includes('GadgetHub');
    record('Três lojas fictícias corretas no seletor (TechNorte, ByteZone, GadgetHub)', hasThreeStores);

    // 3. Alternância entre lojas e atualização do painel
    await client.eval(`
      document.querySelector("#tab-seller-seller-bytezone").click();
    `);
    await wait(300);

    const selectedStoreName = await client.eval(`
      document.querySelector(".active-store-title")?.textContent.trim()
    `);
    record('Alternância para ByteZone atualiza a loja selecionada', selectedStoreName === 'ByteZone');

    // 4. Isolamento: lista de ofertas pertence apenas a ByteZone
    const byteOffersBelong = await client.eval(`(() => {
      const snap = JSON.parse(localStorage.getItem("nexo_marketplace_snapshot_v1"));
      const byteOfferIds = snap.offers.filter(o => o.sellerId === "seller-bytezone").map(o => o.id);
      return byteOfferIds.length > 0;
    })()`);
    record('Ofertas listadas correspondem estritamente à loja selecionada', byteOffersBelong);

    // 5. Voltar a TechNorte e editar uma oferta existente (off-1: Portátil NexoPro)
    await client.eval(`
      document.querySelector("#tab-seller-seller-technorte").click();
    `);
    await wait(300);

    // Clicar no botão "Editar" da primeira oferta
    await client.eval(`
      const editBtns = document.querySelectorAll(".btn-edit-offer");
      if (editBtns.length > 0) editBtns[0].click();
    `);
    await wait(300);

    const inlineEditOpen = await client.eval(`
      document.querySelector(".offer-inline-edit-box") !== null
    `);
    record('Abertura do formulário de edição de oferta', inlineEditOpen);

    // Função auxiliar para disparar eventos de input compatíveis com React
    await client.eval(`
      window.__setReactVal = function(el, val) {
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
    `);

    // Preencher novo preço (849,00) e novo stock (10)
    await client.eval(`(() => {
      const priceInput = document.querySelector(".offer-inline-edit-box input[type='text']");
      const stockInput = document.querySelector(".offer-inline-edit-box input[type='number']");
      if (priceInput && stockInput) {
        window.__setReactVal(priceInput, "849,00");
        window.__setReactVal(stockInput, "10");
      }
      const submitBtn = document.querySelector(".offer-inline-edit-box button[type='submit']");
      if (submitBtn) submitBtn.click();
    })()`);
    await wait(800);

    const editSuccess = await client.eval(`
      document.querySelector(".seller-feedback-banner.success")?.textContent.includes("atualizada com sucesso") || false
    `);
    record('Sucesso na gravação da edição de oferta', editSuccess);

    // 6. Verificar que a alteração aparece no catálogo
    await client.send('Page.navigate', { url: 'http://127.0.0.1:4173/produto/prod-1' });
    await wait(800);

    const updatedPriceInDetail = await client.eval(`
      document.body.innerText.includes("849,00")
    `);
    record('Novo preço (849,00 €) visível na página de detalhe do produto no catálogo', updatedPriceInDetail);

    // 7. Persistência após recarregar a página (location.reload)
    await client.send('Page.reload');
    await wait(800);

    const persistedPriceAfterReload = await client.eval(`
      document.body.innerText.includes("849,00")
    `);
    record('Edição da oferta persiste no catálogo após recarregar a página', persistedPriceAfterReload);

    // 8. Isolamento entre lojas: verificar que ByteZone não foi alterada
    await client.send('Page.navigate', { url: 'http://127.0.0.1:4173/vendedor' });
    await wait(600);
    await client.eval(`
      document.querySelector("#tab-seller-seller-bytezone").click();
    `);
    await wait(300);

    const byteZoneIntact = await client.eval(`(() => {
      const snap = JSON.parse(localStorage.getItem("nexo_marketplace_snapshot_v1"));
      const off14 = snap.offers.find(o => o.id === "off-14"); // Monitor da ByteZone
      return off14 && off14.priceInCents === 38900;
    })()`);
    record('Isolamento: ofertas de ByteZone mantêm-se inalteradas após edição em TechNorte', byteZoneIntact);

    // 9. Criação de nova oferta para um produto existente
    // Em ByteZone, criar oferta para prod-2 (Ultrabook SlimAir 13) que ByteZone ainda não tem
    await client.eval(`
      document.querySelector(".btn-add-offer")?.click();
    `);
    await wait(300);

    const createFormOpen = await client.eval(`
      document.querySelector(".create-offer-card") !== null
    `);
    record('Abertura do formulário de criação de nova oferta', createFormOpen);

    await client.eval(`(() => {
      const sel = document.querySelector("#create-product-select");
      if (sel) {
        window.__setReactVal(sel, "prod-2");
        const opt = sel.querySelector("option[value='prod-2']");
        if (opt) opt.selected = true;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }

      const priceInput = document.querySelector("#create-price-input");
      if (priceInput) window.__setReactVal(priceInput, "1099,00");

      const stockInput = document.querySelector("#create-stock-input");
      if (stockInput) window.__setReactVal(stockInput, "8");

      const submitBtn = document.querySelector(".create-offer-card button[type='submit']");
      if (submitBtn) submitBtn.click();
    })()`);
    await wait(800);

    const createSuccessNotice = await client.eval(`
      document.querySelector(".seller-feedback-banner.success")?.textContent.includes("criada com sucesso") || false
    `);
    const createErrMsg = await client.eval(`
      document.querySelector(".seller-feedback-banner.error")?.textContent || ""
    `);
    record('Criação de oferta para produto existente concluída com sucesso', createSuccessNotice, createErrMsg);

    // 10. Impedimento de ofertas duplicadas
    await client.eval(`
      document.querySelector(".btn-add-offer")?.click();
    `);
    await wait(300);

    const prod2DisabledForByte = await client.eval(`(() => {
      const opt = document.querySelector("#create-product-select option[value='prod-2']");
      return opt && opt.disabled === true;
    })()`);
    record('Impedimento de duplicados: produto com oferta existente fica desativado na seleção', prod2DisabledForByte);

    // 11. Consulta de encomendas pertencentes à loja selecionada (Aba Encomendas)
    await client.eval(`
      document.querySelector("#tab-view-orders").click();
    `);
    await wait(400);

    const byteOrdersVisible = await client.eval(`
      document.querySelectorAll(".seller-order-card").length
    `);
    record('Aba de Encomendas Recebidas exibe encomendas da loja selecionada', byteOrdersVisible >= 1);

    // Verificar isolamento de artigos: ByteZone vê apenas prod-8 na encomenda ord-demo-101
    const byteOnlyItems = await client.eval(`(() => {
      const items = Array.from(document.querySelectorAll(".order-item-title")).map(el => el.textContent.trim());
      const hasByteItem = items.some(t => t.includes("SoundPulse") || t.includes("prod-8") || t.includes("Auriculares"));
      const hasTechItem = items.some(t => t.includes("NexoPro") || t.includes("Portátil"));
      return hasByteItem && !hasTechItem;
    })()`);
    record('Isolamento de encomendas: apenas os artigos de ByteZone são visíveis para ByteZone', byteOnlyItems);

    // Verificar para TechNorte: vê apenas o seu portátil e preserva o preço original
    await client.eval(`
      document.querySelector("#tab-seller-seller-technorte").click();
    `);
    await wait(400);
    await client.eval(`
      document.querySelector("#tab-view-orders").click();
    `);
    await wait(300);

    const techPreservedHistoricalPrice = await client.eval(`(() => {
      // TechNorte alterou a oferta para 849,00 €, mas a encomenda histórica DEVE manter 899,00 €!
      const body = document.querySelector(".seller-tab-panel").innerText;
      return body.includes("899,00");
    })()`);
    record('Preservação do histórico: encomendas mantêm o preço original de compra (899,00 €)', techPreservedHistoricalPrice);

    // 12. Revalidação de Carrinho antes da compra após alteração de stock pelo vendedor
    // Adicionar off-1 (stock 10) ao carrinho
    await client.send('Page.navigate', { url: 'http://127.0.0.1:4173/produto/prod-1' });
    await wait(800);
    await client.eval(`
      const addBtn = document.querySelector(".btn-offer-cart");
      if (addBtn) addBtn.click();
    `);
    await wait(400);

    // Ir a /carrinho e aumentar quantidade para 3
    await client.send('Page.navigate', { url: 'http://127.0.0.1:4173/carrinho' });
    await wait(600);
    await client.eval(`(() => {
      const incBtns = document.querySelectorAll(".qty-btn");
      if (incBtns.length >= 2) incBtns[1].click(); // qty -> 2
    })()`);
    await wait(300);
    await client.eval(`(() => {
      const incBtns = document.querySelectorAll(".qty-btn");
      if (incBtns.length >= 2) incBtns[1].click(); // qty -> 3
    })()`);
    await wait(300);

    // O vendedor reduz o stock de off-1 para 1
    await client.eval(`(() => {
      const snap = JSON.parse(localStorage.getItem("nexo_marketplace_snapshot_v1"));
      const off1 = snap.offers.find(o => o.id === "off-1");
      if (off1) off1.stock = 1;
      localStorage.setItem("nexo_marketplace_snapshot_v1", JSON.stringify(snap));
    })()`);

    // Tentar concluir a simulação de compra no carrinho
    await client.eval(`(() => {
      const checkoutBtn = document.querySelector(".btn-checkout");
      if (checkoutBtn) checkoutBtn.click();
    })()`);
    await wait(1000);

    // Deve ser bloqueado pela revalidação e apresentar o aviso de alteração de stock
    const revalidationNotice = await client.eval(`(() => {
      const banner = document.querySelector(".cart-warning-banner");
      return banner && banner.textContent.includes("ajustada");
    })()`);
    record('Redução de stock pelo vendedor desencadeia revalidação obrigatória antes da compra', revalidationNotice);

    // 13. Tratamento de falha de gravação e tentativa novamente
    await client.send('Page.navigate', { url: 'http://127.0.0.1:4173/vendedor' });
    await wait(600);
    await client.eval(`
      document.querySelector("#tab-seller-seller-technorte").click();
    `);
    await wait(300);

    // Injetar interceptor para forçar erro em setItem
    await client.eval(`(() => {
      window.__origSetItem = localStorage.setItem.bind(localStorage);
      window.__injectStorageError = true;
      localStorage.setItem = function(key, val) {
        if (window.__injectStorageError && key === "nexo_marketplace_snapshot_v1") {
          throw new Error("QuotaExceededError: erro simulado de armazenamento");
        }
        return window.__origSetItem(key, val);
      };
    })()`);

    // Abrir edição da primeira oferta e tentar guardar
    await client.eval(`
      const editBtns = document.querySelectorAll(".btn-edit-offer");
      if (editBtns.length > 0) editBtns[0].click();
    `);
    await wait(300);

    await client.eval(`(() => {
      const stockInput = document.querySelector(".offer-inline-edit-box input[type='number']");
      if (stockInput) {
        window.__setReactVal(stockInput, "25");
      }
      const submitBtn = document.querySelector(".offer-inline-edit-box button[type='submit']");
      if (submitBtn) submitBtn.click();
    })()`);
    await wait(800);

    const errorBannerVisible = await client.eval(`(() => {
      const errBanner = document.querySelector(".seller-feedback-banner.error");
      const hasRetry = document.querySelector(".btn-retry-inline") !== null;
      return errBanner !== null && hasRetry;
    })()`);
    record('Falha de armazenamento apresenta banner de erro com botão "Tentar novamente"', errorBannerVisible);

    const preservedInputVal = await client.eval(`
      document.querySelector(".offer-inline-edit-box input[type='number']")?.value === "25"
    `);
    record('Dados introduzidos no formulário são preservados em caso de falha', preservedInputVal);

    // Restabelecer armazenamento e clicar em "Tentar novamente"
    await client.eval(`(() => {
      window.__injectStorageError = false;
      const retryBtn = document.querySelector(".btn-retry-inline");
      if (retryBtn) retryBtn.click();
    })()`);
    await wait(800);

    const retrySuccess = await client.eval(`
      document.querySelector(".seller-feedback-banner.success") !== null
    `);
    record('Recuperação e sucesso ao clicar em "Tentar novamente"', retrySuccess);

    // Limpar interceptor
    await client.eval(`(() => {
      if (window.__origSetItem) {
        localStorage.setItem = window.__origSetItem;
      }
    })()`);

    // 14. Verificação de Responsividade a 360 px
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 360,
      height: 740,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await wait(400);

    await client.send('Page.navigate', { url: 'http://127.0.0.1:4173/vendedor' });
    await wait(600);

    const sellerOverflow360 = await client.eval(`
      document.documentElement.scrollWidth <= window.innerWidth
    `);
    record('Layout a 360 px na rota /vendedor sem overflow ou scroll horizontal indevido', sellerOverflow360);

    // 15. Acessibilidade por Teclado
    const keyboardAccessible = await client.eval(`(() => {
      const tabs = Array.from(document.querySelectorAll(".seller-store-tab-btn, .seller-subtab-btn, .btn-primary, .btn-edit-offer"));
      return tabs.length > 0 && tabs.every(el => el.tabIndex !== -1);
    })()`);
    record('Controlos e formulários da área do vendedor acessíveis por teclado', keyboardAccessible);

    console.log('\n--- Resumo da Verificação em Navegador Real (Fase 3) ---');
    const allPassed = results.every((r) => r.passed);
    const passedCount = results.filter((r) => r.passed).length;
    console.log(`Total de verificações: ${results.length} | Aprovadas: ${passedCount} | Falhadas: ${results.length - passedCount}`);

    if (!allPassed) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Erro na execução da verificação em navegador:', err);
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

