/*
 * Controla o que acontece a cada simulação:
 *  - 1ª simulação: nada
 *  - 2ª simulação: formulário de lead (nome, e-mail, telefone)
 *  - 4ª, 6ª, 8ª...: popup de anúncio com botão de fechar liberado após alguns segundos
 * O contador vale para todas as calculadoras do site e dura enquanto a aba estiver aberta.
 */
(function () {
  var cfg = window.ADS_CONFIG || {};
  var memoria = 0;
  var preview = /[?&]preview=1/.test(location.search);
  var leadAtivo = !!cfg.leadsEndpoint || preview;
  var ultimoFoco = null;
  var timer = null;

  /* ---------- contador ---------- */
  function lerContagem() {
    try { return parseInt(sessionStorage.getItem('jc_sims') || '0', 10) || 0; } catch (e) { return memoria; }
  }
  function gravarContagem(v) {
    memoria = v;
    try { sessionStorage.setItem('jc_sims', String(v)); } catch (e) {}
  }

  /* ---------- estado do lead ---------- */
  function estadoLead() {
    try {
      var v = JSON.parse(localStorage.getItem('jc_lead') || 'null');
      if (!v) return null;
      if (v.s === 'ok') return 'ok';
      if (v.s === 'skip' && Date.now() - v.t < 7 * 86400000) return 'skip';
    } catch (e) {}
    return null;
  }
  function gravarLead(s) {
    try { localStorage.setItem('jc_lead', JSON.stringify({ s: s, t: Date.now() })); } catch (e) {}
  }

  /* ---------- HTML dos modais ---------- */
  var TEXTO_CONSENTIMENTO =
    'Autorizo o contato por e-mail, telefone e WhatsApp com informações sobre a planilha de controle financeiro e outros produtos e serviços financeiros. Posso cancelar quando quiser.';

  var lead = document.createElement('div');
  lead.id = 'lead';
  lead.className = 'popup';
  lead.hidden = true;
  lead.innerHTML =
    '<div class="popup-caixa lead-caixa" role="dialog" aria-modal="true" aria-labelledby="lead-titulo">' +
    '<button type="button" class="lead-x" id="lead-x" aria-label="Fechar">×</button>' +
    '<div id="lead-corpo">' +
    '<h2 id="lead-titulo">Organize também o resto das suas finanças</h2>' +
    '<p class="lead-txt">Deixe seus dados e avisamos quando a planilha de controle financeiro pessoal estiver pronta. Você também recebe dicas e novidades sobre produtos financeiros. É gratuito.</p>' +
    '<form id="lead-form" novalidate>' +
    '<label class="campo"><span>Nome</span><div class="entrada"><input id="lead-nome" type="text" autocomplete="name"></div></label>' +
    '<label class="campo"><span>E-mail</span><div class="entrada"><input id="lead-email" type="email" autocomplete="email" inputmode="email"></div></label>' +
    '<label class="campo"><span>Telefone com DDD (WhatsApp)</span><div class="entrada"><input id="lead-tel" type="tel" autocomplete="tel" inputmode="tel" placeholder="(11) 91234-5678"></div></label>' +
    '<fieldset class="lead-int"><legend>Tenho interesse em (opcional)</legend>' +
    '<label class="check"><input type="checkbox" name="int" value="planilha-controle-financeiro"><span>Planilha de controle financeiro</span></label>' +
    '<label class="check"><input type="checkbox" name="int" value="investimentos"><span>Investimentos</span></label>' +
    '<label class="check"><input type="checkbox" name="int" value="sair-das-dividas"><span>Sair das dívidas</span></label>' +
    '</fieldset>' +
    '<label class="check check-obrig"><input type="checkbox" id="lead-aceite"><span>' + TEXTO_CONSENTIMENTO +
    ' <a href="privacidade.html" target="_blank" rel="noopener">Política de privacidade</a>.</span></label>' +
    '<input type="text" id="lead-site" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">' +
    '<p id="lead-erro" class="erro" role="alert" hidden></p>' +
    '<p id="lead-teste" class="lead-teste" hidden>Modo de teste: nada será salvo.</p>' +
    '<div class="acoes"><button type="submit" class="btn btn-primario">Quero receber</button>' +
    '<button type="button" id="lead-nao" class="btn btn-sec">Agora não</button></div>' +
    '</form></div>' +
    '<div id="lead-sucesso" hidden>' +
    '<h2>Tudo certo!</h2><p id="lead-sucesso-txt"></p>' +
    '<button type="button" id="lead-fechar" class="btn btn-primario">Continuar simulando</button></div>' +
    '</div>';
  document.body.appendChild(lead);

  var anuncio = document.createElement('div');
  anuncio.id = 'popup';
  anuncio.className = 'popup';
  anuncio.hidden = true;
  anuncio.innerHTML =
    '<div class="popup-caixa" role="dialog" aria-modal="true" aria-label="Publicidade">' +
    '<div class="popup-topo"><span>Publicidade</span>' +
    '<button type="button" id="popup-fechar" disabled>Fechar</button></div>' +
    '<div class="ad" data-ad="popup" data-w="300" data-h="250" data-lazy></div></div>';
  document.body.appendChild(anuncio);

  var $ = function (id) { return document.getElementById(id); };

  function travar(sim) { document.documentElement.classList.toggle('modal-aberto', sim); }

  /* ---------- formulário de lead ---------- */
  function mostrarErro(msg) {
    $('lead-erro').textContent = msg;
    $('lead-erro').hidden = !msg;
  }

  function abrirLead(origem) {
    ultimoFoco = document.activeElement;
    lead.setAttribute('data-origem', origem || 'simulacao');
    $('lead-corpo').hidden = false;
    $('lead-sucesso').hidden = true;
    $('lead-teste').hidden = !!cfg.leadsEndpoint;
    mostrarErro('');
    lead.hidden = false;
    travar(true);
    setTimeout(function () { $('lead-nome').focus(); }, 30);
  }

  function fecharLead() {
    lead.hidden = true;
    travar(false);
    if (ultimoFoco && ultimoFoco.focus) { try { ultimoFoco.focus(); } catch (e) {} }
  }

  $('lead-tel').addEventListener('input', function () {
    var d = this.value.replace(/\D/g, '').slice(0, 11), s = d;
    if (d.length > 10) s = '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
    else if (d.length > 6) s = '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    else if (d.length > 2) s = '(' + d.slice(0, 2) + ') ' + d.slice(2);
    else if (d.length > 0) s = '(' + d;
    this.value = s;
  });

  function pular() {
    gravarLead('skip');
    fecharLead();
  }
  $('lead-nao').addEventListener('click', pular);
  $('lead-x').addEventListener('click', pular);
  $('lead-fechar').addEventListener('click', fecharLead);
  lead.addEventListener('click', function (e) { if (e.target === lead && !$('lead-corpo').hidden) pular(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !lead.hidden) { if ($('lead-corpo').hidden) fecharLead(); else pular(); }
  });

  $('lead-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var nome = $('lead-nome').value.trim();
    var email = $('lead-email').value.trim();
    var tel = $('lead-tel').value.replace(/\D/g, '');

    if (nome.length < 2 || !/[A-Za-zÀ-ÿ]/.test(nome)) return mostrarErro('Informe seu nome.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return mostrarErro('Informe um e-mail válido.');
    if (!(tel.length === 10 || (tel.length === 11 && tel.charAt(2) === '9')) || tel.slice(0, 2) < '11') {
      return mostrarErro('Informe um telefone válido com DDD.');
    }
    if (!$('lead-aceite').checked) return mostrarErro('Marque a autorização de contato para continuar.');
    mostrarErro('');

    var interesses = [];
    lead.querySelectorAll('input[name="int"]:checked').forEach(function (c) { interesses.push(c.value); });

    function sucesso() {
      gravarLead('ok');
      $('lead-sucesso-txt').textContent = cfg.leadsEndpoint
        ? 'Obrigado, ' + nome.split(' ')[0] + '! Você entrou na lista e vamos escrever para ' + email + '. Para sair a qualquer momento, basta pedir o cancelamento.'
        : 'Modo de teste: o formulário funcionou, mas nada foi salvo porque o endereço de coleta ainda não foi configurado.';
      $('lead-corpo').hidden = true;
      $('lead-sucesso').hidden = false;
      $('lead-fechar').focus();
    }

    if ($('lead-site').value) return sucesso(); // robô: finge sucesso e não envia
    if (!cfg.leadsEndpoint) return sucesso();

    var botao = lead.querySelector('button[type="submit"]');
    botao.disabled = true;
    var dados = {
      data: new Date().toISOString(),
      nome: nome,
      email: email,
      telefone: $('lead-tel').value,
      interesses: interesses,
      consentimento: true,
      texto_consentimento: TEXTO_CONSENTIMENTO,
      origem: location.pathname,
      gatilho: lead.getAttribute('data-origem'),
      utm: location.search,
      simulacao: window.JC_ultimaSim || null,
      simulacoes_na_sessao: lerContagem()
    };
    fetch(cfg.leadsEndpoint, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(dados)
    }).then(function () {
      botao.disabled = false;
      sucesso();
    }).catch(function () {
      botao.disabled = false;
      mostrarErro('Não foi possível enviar agora. Verifique sua conexão e tente de novo.');
    });
  });

  /* ---------- popup de anúncio ---------- */
  function abrirAnuncio() {
    var btn = $('popup-fechar');
    var restante = cfg.popupSegundos || 5;
    ultimoFoco = document.activeElement;
    btn.disabled = true;
    btn.textContent = 'Fechar em ' + restante + 's';
    anuncio.hidden = false;
    travar(true);
    window.renderizarAnuncios(anuncio);
    window.ativarAnuncios(anuncio);
    clearInterval(timer);
    timer = setInterval(function () {
      restante--;
      if (restante <= 0) {
        clearInterval(timer);
        btn.disabled = false;
        btn.textContent = 'Fechar';
        btn.focus();
      } else {
        btn.textContent = 'Fechar em ' + restante + 's';
      }
    }, 1000);
  }

  $('popup-fechar').addEventListener('click', function () {
    if (this.disabled) return;
    anuncio.hidden = true;
    travar(false);
    if (ultimoFoco && ultimoFoco.focus) { try { ultimoFoco.focus(); } catch (e) {} }
  });

  /* ---------- API usada pelas calculadoras ---------- */
  window.contarSimulacao = function (contexto) {
    if (contexto) window.JC_ultimaSim = contexto;
    var n = lerContagem() + 1;
    gravarContagem(n);

    var noLead = cfg.leadNaSimulacao || 2;
    var inicio = cfg.popupInicio || 4;
    var cada = cfg.popupACada || 2;

    if (n === noLead) {
      if (leadAtivo && !estadoLead()) abrirLead('simulacao');
    } else if (cfg.popupAtivo && window.JC_anunciosAtivos && n >= inicio && (n - inicio) % cada === 0) {
      abrirAnuncio();
    }
  };

  /* Botões "Quero ser avisado" espalhados pelas páginas */
  document.querySelectorAll('[data-abrir-lead]').forEach(function (b) {
    if (!leadAtivo) { var s = b.closest('.lista-espera'); if (s) s.hidden = true; return; }
    b.addEventListener('click', function () { abrirLead(b.getAttribute('data-abrir-lead')); });
  });
})();
