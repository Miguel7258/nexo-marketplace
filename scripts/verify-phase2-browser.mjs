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
  console.log('--- Iniciando Verificação de Navegador Real (Fase 2 + Integridade) ---');

  // 1. Iniciar servidor de preview
  console.log('A iniciar vite preview em http://127.0.0.1:4173...');
  const previewProc = spawn('cmd.exe', ['/c', 'npm.cmd', 'run', 'preview'], {
    stdio: 'ignore',
  });

  let chromeProc = null;
  let client = null;

  try {
    await waitForHttp('http://127.0.0.1:4173');
    console.log('Servidor preview ativo.');

    // 2. Localizar Chrome
    const chromePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ];
    const chromeExec = chromePaths.find((p) => fs.existsSync(p));
    if (!chromeExec) {
      throw new Error('Google Chrome não encontrado nos caminhos padrão.');
    }

    const tempProfile = path.join('C:\\temp', `chrome-test-${Date.now()}`);
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
    const page = listRes.find((p) => p.type === 'page');
    if (!page) throw new Error('Nenhuma página disponível no Chrome.');

    client = new CDPClient(page.webSocketDebuggerUrl);
    await client.connect();
    await client.send('Page.enable');
    await client.send('Runtime.enable');

    const results = [];
    function record(name, passed, detail = '') {
      results.push({ name, passed, detail });
      const status = passed ? '✓ PASSOU' : '✗ FALHOU';
      console.log(`[${status}] ${name} ${detail ? '(' + detail + ')' : ''}`);
    }

    // Configurar viewport desktop
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false,
    });

    // 1. Carga inicial e reset
    await client.send('Page.navigate', { url: 'http://127.0.0.1:4173/' });
    await wait(800);
    await client.eval(`
      localStorage.clear();
      window.dispatchEvent(new Event('storage'));
      window.location.reload();
    `);
    await wait(1000);

    const title = await client.eval('document.title');
    record('Carga inicial do catálogo', title.includes('Nexo'), `Título: ${title}`);

    const initialBadge = await client.eval(`
      const b = document.querySelector('.navbar-cart-badge');
      b ? b.textContent.trim() : null;
    `);
    record('Contador inicial do carrinho vazio', initialBadge === null);

    // 2. Navegar para o Produto 1 (com 2 lojas: TechNorte e ByteZone)
    await client.send('Page.navigate', { url: 'http://127.0.0.1:4173/produto/prod-1' });
    await wait(800);

    const offersCount = await client.eval('document.querySelectorAll(".offer-item-card").length');
    record('Página de produto com ofertas concorrentes', offersCount >= 2, `${offersCount} ofertas encontradas`);

    // 3. Adicionar oferta TechNorte ao carrinho
    const addedTechNorte = await client.eval(`(() => {
      const btn = Array.from(document.querySelectorAll(".offer-item-card")).find(c => c.textContent.includes("TechNorte"))?.querySelector(".btn-offer-cart");
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    })()`);
    record('Adicionar oferta da TechNorte ao carrinho', addedTechNorte);
    await wait(500);

    const badgeAfter1 = await client.eval(`
      const b = document.querySelector('.navbar-cart-badge');
      b ? b.textContent.trim() : null;
    `);
    record('Atualização do contador do carrinho para 1 artigo', badgeAfter1 === '1', `Badge: ${badgeAfter1}`);

    // 4. Navegar para o Produto 8 (ByteZone) e adicionar ao carrinho
    await client.send('Page.navigate', { url: 'http://127.0.0.1:4173/produto/prod-8' });
    await wait(800);

    const addedByteZone = await client.eval(`(() => {
      const btn = Array.from(document.querySelectorAll(".offer-item-card")).find(c => c.textContent.includes("ByteZone"))?.querySelector(".btn-offer-cart");
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    })()`);
    record('Adicionar oferta da ByteZone ao carrinho', addedByteZone);
    await wait(500);

    const badgeAfter2 = await client.eval(`
      const b = document.querySelector('.navbar-cart-badge');
      b ? b.textContent.trim() : null;
    `);
    record('Atualização do contador do carrinho para 2 artigos', badgeAfter2 === '2', `Badge: ${badgeAfter2}`);

    // 5. Navegar para o Carrinho (/carrinho)
    await client.send('Page.navigate', { url: 'http://127.0.0.1:4173/carrinho' });
    await wait(800);

    const cartGroupsCount = await client.eval('document.querySelectorAll(".cart-seller-group-card").length');
    record('Carrinho agrupa artigos em 2 lojas parceiras distintas', cartGroupsCount === 2, `${cartGroupsCount} grupos de loja`);

    const hasBothSellers = await client.eval(`(() => {
      const text = document.body.textContent;
      return text.includes("TechNorte") && text.includes("ByteZone");
    })()`);
    record('Presença explícita de TechNorte e ByteZone no carrinho', hasBothSellers);

    const totalBeforeIncrement = await client.eval(`
      document.querySelector(".final-total-value")?.textContent.trim() || ""
    `);
    record('Cálculo exato do total em euros (998,00 €)', totalBeforeIncrement.includes('998,00'));

    // 6. Testar incremento de quantidade na ByteZone
    const incrementSuccess = await client.eval(`(() => {
      const byteZoneGroup = Array.from(document.querySelectorAll(".cart-seller-group-card")).find(c => c.textContent.includes("ByteZone"));
      const plusBtn = byteZoneGroup?.querySelector(".qty-btn[title*='mais'], .qty-btn:last-child");
      if (plusBtn) {
        plusBtn.click();
        return true;
      }
      return false;
    })()`);
    record('Incremento de quantidade na loja ByteZone', incrementSuccess);
    await wait(500);

    const totalAfterIncrement = await client.eval(`
      document.querySelector(".final-total-value")?.textContent.trim() || ""
    `);
    record('Recálculo do total após incremento (1 097,00 €)', totalAfterIncrement.includes('1 097') || totalAfterIncrement.includes('1097'), `Total: ${totalAfterIncrement}`);

    // 7. Simulação sem recolha de dados pessoais
    const hasPersonalInputs = await client.eval(`
      document.querySelectorAll("input[type='text'], input[type='email'], input[type='tel'], input[name*='card']").length
    `);
    record('Compra demonstrativa sem recolha de dados pessoais ou formulários de pagamento', hasPersonalInputs === 0);

    // 8. Concluir Compra Demonstrativa
    const clickedCheckout = await client.eval(`(() => {
      const btn = document.querySelector(".btn-checkout");
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    })()`);
    record('Acionamento do botão Concluir Compra Demonstrativa', clickedCheckout);
    await wait(1200);

    // 9. Verificar Ecrã de Confirmação
    const confirmationTitle = await client.eval(`
      document.querySelector(".confirmation-title")?.textContent.trim() || ""
    `);
    record('Apresentação do ecrã de confirmação de simulação', confirmationTitle.includes('Sucesso'), `Título: ${confirmationTitle}`);

    const hasOrderReference = await client.eval(`
      document.querySelector(".meta-value.font-mono")?.textContent.trim() || ""
    `);
    record('Geração inequívoca de referência de encomenda (#ord-sim-...)', hasOrderReference.startsWith('#ord-sim'), `Ref: ${hasOrderReference}`);

    const finalBadgeAfterOrder = await client.eval(`
      const b = document.querySelector('.navbar-cart-badge');
      b ? b.textContent.trim() : null;
    `);
    record('Esvaziamento do carrinho e reposição do contador da Navbar', finalBadgeAfterOrder === null);

    // 10. Navegar novamente a /carrinho e verificar estado vazio
    await client.send('Page.navigate', { url: 'http://127.0.0.1:4173/carrinho' });
    await wait(600);
    const emptyCartMsg = await client.eval(`
      document.querySelector(".empty-cart-title")?.textContent.trim() || ""
    `);
    record('Apresentação de estado de carrinho vazio após compra', emptyCartMsg.includes('vazio'));

    // 11. Verificar dedução de stock no catálogo (TechNorte de prod-1 tinha 6, foi comprado 1 -> resta 5)
    await client.send('Page.navigate', { url: 'http://127.0.0.1:4173/produto/prod-1' });
    await wait(600);
    const techNorteStockText = await client.eval(`(() => {
      const card = Array.from(document.querySelectorAll(".offer-item-card")).find(c => c.textContent.includes("TechNorte"));
      return card?.querySelector(".stock-tag")?.textContent.trim() || "";
    })()`);
    record('Dedução de stock refletida na oferta (5 unidades em stock)', techNorteStockText.includes('5 unidade'));

    // 12. Testar Reposição de Dados via Navbar
    const resetClicked = await client.eval(`(() => {
      const btn = document.querySelector(".btn-reset");
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    })()`);
    record('Acionamento do botão Repor Dados na Navbar', resetClicked);
    await wait(800);

    const techNorteStockAfterReset = await client.eval(`(() => {
      const card = Array.from(document.querySelectorAll(".offer-item-card")).find(c => c.textContent.includes("TechNorte"));
      return card?.querySelector(".stock-tag")?.textContent.trim() || "";
    })()`);
    record('Reposição integral restaura o stock original (6 unidades)', techNorteStockAfterReset.includes('6 unidade'));

    // 13. Simulação de falha de armazenamento no navegador e recuperação consistente
    console.log('\n--- Teste de Falha de Armazenamento no Navegador ---');
    // Adicionar artigo ao carrinho
    await client.send('Page.navigate', { url: 'http://127.0.0.1:4173/produto/prod-1' });
    await wait(600);
    await client.eval(`
      Array.from(document.querySelectorAll(".offer-item-card")).find(c => c.textContent.includes("TechNorte"))?.querySelector(".btn-offer-cart")?.click();
    `);
    await wait(500);

    // Navegar para /carrinho
    await client.send('Page.navigate', { url: 'http://127.0.0.1:4173/carrinho' });
    await wait(600);

    // Injetar falha simulada no localStorage.setItem
    await client.eval(`
      window.__origSetItem = localStorage.setItem;
      localStorage.setItem = (key, value) => {
        if (key.includes('snapshot')) {
          throw new Error('QuotaExceededError simulada no browser');
        }
        return window.__origSetItem.call(localStorage, key, value);
      };
    `);

    // Tentar checkout que irá falhar no setItem
    await client.eval(`document.querySelector(".btn-checkout")?.click()`);
    await wait(800);

    // Validar ausência de falso sucesso e presença de banner de erro
    const hasErrorBanner = await client.eval(`
      document.querySelector(".cart-error-banner") !== null
    `);
    record('Apresentação de banner de erro inteligível em caso de falha de armazenamento', hasErrorBanner);

    const confirmationNotShown = await client.eval(`
      document.querySelector(".confirmation-card") === null
    `);
    record('Ausência de falso sucesso quando o armazenamento falha', confirmationNotShown);

    const cartStillPresent = await client.eval(`
      document.querySelectorAll(".cart-seller-group-card").length > 0
    `);
    record('Carrinho e artigos preservados no ecrã após erro de persistência', cartStillPresent);

    // Recarregar a página e confirmar que nada foi corrompido ou perdido
    await client.eval(`window.location.reload()`);
    await wait(800);

    const cartAfterReload = await client.eval(`
      document.querySelectorAll(".cart-seller-group-card").length > 0
    `);
    record('Carrinho permanece intacto após recarregar a página na sequência da falha', cartAfterReload);

    // Restaurar setItem e testar recuperação com sucesso
    await client.eval(`
      if (window.__origSetItem) {
        localStorage.setItem = window.__origSetItem;
      }
    `);

    // Clicar em Tentar novamente
    await client.eval(`
      const retryBtn = document.querySelector(".btn-retry-action") || document.querySelector(".btn-checkout");
      retryBtn?.click();
    `);
    await wait(1200);

    const recoveredSuccess = await client.eval(`
      document.querySelector(".confirmation-title")?.textContent.includes("Sucesso") || false
    `);
    record('Recuperação bem-sucedida após restabelecimento do armazenamento', recoveredSuccess);

    // 14. Verificação de Responsividade em Mobile (360 px)
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 360,
      height: 740,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await wait(400);

    // Verificar /produto/prod-1 a 360px
    await client.send('Page.navigate', { url: 'http://127.0.0.1:4173/produto/prod-1' });
    await wait(600);
    const prodOverflow = await client.eval(`
      document.documentElement.scrollWidth <= window.innerWidth
    `);
    record('Visualização móvel (360 px) no detalhe do produto sem overflow horizontal', prodOverflow);

    // Verificar /carrinho a 360px
    await client.send('Page.navigate', { url: 'http://127.0.0.1:4173/carrinho' });
    await wait(600);
    const cartOverflow = await client.eval(`
      document.documentElement.scrollWidth <= window.innerWidth
    `);
    record('Visualização móvel (360 px) no carrinho sem overflow horizontal', cartOverflow);

    console.log('\n--- Resumo da Verificação em Navegador Real ---');
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
