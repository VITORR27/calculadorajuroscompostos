/*
 * Configuração de anúncios, leads e popups.
 *
 * ANÚNCIOS (Google AdSense)
 *  1. Crie a conta no AdSense e cadastre o endereço do site.
 *  2. Preencha "client" com seu ID de editor (ex.: "ca-pub-1234567890123456").
 *  3. Crie uma unidade de anúncio para cada posição e cole o ID numérico em "slots".
 *  4. Atualize também o arquivo ads.txt com o mesmo ID.
 *  Enquanto "client" estiver vazio, o site mostra apenas espaços reservados.
 *
 * LEADS
 *  Cole em "leadsEndpoint" a URL do Google Apps Script (veja docs/leads-google-sheets.md).
 *  Sem essa URL o formulário de leads fica desligado. Para ver o formulário em teste,
 *  abra o site com ?preview=1 no final do endereço (nada é salvo nesse modo).
 */
window.ADS_CONFIG = {
  client: "",
  slots: {
    top: "",
    left: "",
    right: "",
    mid: "",
    bottom: "",
    popup: ""
  },

  leadsEndpoint: "https://script.google.com/macros/s/AKfycbySaW3ga6OwtOcssVY6iYTzOV4dsGzBfwD7tBadADM-kPBag7J6ztgvrjje_rh8ZNlh/exec",     // URL do Apps Script que grava os leads na planilha
  leadPopupAtivo: false, // true = liga o formulário de lead (só depois de preencher leadsEndpoint)
  leadNaSimulacao: 2,    // o formulário de lead aparece nesta simulação

  popupAtivo: false,      // liga/desliga o popup de anúncio (ligar só depois da aprovação do AdSense)
  popupInicio: 4,        // primeiro popup de anúncio, na simulação número 4
  popupACada: 2,         // depois, um a cada 2 simulações (4, 6, 8...)
  popupSegundos: 5,      // segundos até liberar o botão de fechar
  esconderEspacosVazios: true // true = esconde as caixas de anúncio enquanto não houver ID do AdSense
};

(function () {
  var cfg = window.ADS_CONFIG;

  /* ---------- Consentimento (LGPD) ---------- */
  function lerConsentimento() {
    try { return localStorage.getItem('jc_consent'); } catch (e) { return null; }
  }
  function gravarConsentimento(v) {
    try { localStorage.setItem('jc_consent', v); } catch (e) {}
  }
  function aplicarPersonalizacao() {
    window.adsbygoogle = window.adsbygoogle || [];
    // Sem consentimento explícito, só anúncios não personalizados.
    window.adsbygoogle.requestNonPersonalizedAds = lerConsentimento() === 'all' ? 0 : 1;
  }

  function mostrarAvisoCookies() {
    if (lerConsentimento()) return;
    var d = document.createElement('div');
    d.className = 'cookies';
    d.setAttribute('role', 'region');
    d.setAttribute('aria-label', 'Aviso de cookies');
    d.innerHTML =
      '<p>Usamos cookies para exibir anúncios e entender como o site é usado. Você pode permitir anúncios personalizados ou manter só o essencial. ' +
      '<a href="privacidade.html#cookies">Saiba mais</a></p>' +
      '<div class="cookies-bt">' +
      '<button type="button" class="btn btn-sec" data-c="essential">Só o essencial</button>' +
      '<button type="button" class="btn btn-primario" data-c="all">Aceitar</button>' +
      '</div>';
    d.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-c]');
      if (!b) return;
      gravarConsentimento(b.getAttribute('data-c'));
      aplicarPersonalizacao();
      d.remove();
    });
    document.body.appendChild(d);
  }

  /* ---------- Anúncios ---------- */
  function adicionarMeta() {
    if (!cfg.client || document.querySelector('meta[name="google-adsense-account"]')) return;
    var m = document.createElement('meta');
    m.name = 'google-adsense-account';
    m.content = cfg.client;
    document.head.appendChild(m);
  }

  function carregarScript() {
    if (!cfg.client) return;
    var s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(cfg.client);
    document.head.appendChild(s);
  }

  /*
   * Monta os blocos de anúncio. Sem argumento, trata os blocos da página (menos os "lazy").
   * Com um container, trata também os blocos "lazy" dele (usado pelo popup, que só
   * cria o anúncio quando fica visível).
   */
  window.renderizarAnuncios = function (container) {
    var raiz = container || document;
    raiz.querySelectorAll('.ad[data-ad]').forEach(function (el) {
      if (el.dataset.pronto) return;
      if (!container && el.hasAttribute('data-lazy')) return;
      var slot = cfg.slots[el.dataset.ad];
      el.dataset.pronto = '1';
      el.setAttribute('data-rotulo', 'Publicidade');
      el.style.minWidth = el.dataset.w + 'px';
      el.style.minHeight = el.dataset.h + 'px';

      if (cfg.client && slot) {
        var ins = document.createElement('ins');
        ins.className = 'adsbygoogle';
        ins.style.display = 'block';
        ins.style.width = el.dataset.w + 'px';
        ins.style.height = el.dataset.h + 'px';
        ins.setAttribute('data-ad-client', cfg.client);
        ins.setAttribute('data-ad-slot', slot);
        el.appendChild(ins);
      } else {
        el.classList.add('ad-vazio');
        var t = document.createElement('span');
        t.textContent = 'Espaço publicitário ' + el.dataset.w + '×' + el.dataset.h;
        el.appendChild(t);
      }
    });
  };

  /* Ativa os anúncios criados dentro de um container que acabou de ficar visível. */
  window.ativarAnuncios = function (container) {
    if (!cfg.client) return;
    aplicarPersonalizacao();
    container.querySelectorAll('ins.adsbygoogle:not([data-ativado])').forEach(function (ins) {
      ins.setAttribute('data-ativado', '1');
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
    });
  };

  /* Sem ID do AdSense, nenhum espaço vazio aparece para o visitante.
     Para ver o layout dos anúncios em teste, abra o site com ?preview=1 no final do endereço. */
  var emTeste = /[?&]preview=1/.test(location.search);
  window.JC_anunciosAtivos = !!cfg.client || emTeste;
  if (cfg.esconderEspacosVazios && !window.JC_anunciosAtivos) document.documentElement.classList.add('sem-anuncios');

  aplicarPersonalizacao();
  adicionarMeta();
  carregarScript();
  window.renderizarAnuncios();
  window.ativarAnuncios(document);
  mostrarAvisoCookies();
})();
