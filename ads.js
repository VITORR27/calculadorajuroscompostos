/*
 * Configuração dos anúncios.
 *
 * 1. Crie sua conta no Google AdSense e cadastre o domínio do site.
 * 2. Preencha "client" com seu ID de editor (ex.: "ca-pub-1234567890123456").
 * 3. Crie uma unidade de anúncio para cada posição e cole o ID numérico em "slots".
 * 4. Atualize também o arquivo ads.txt com o mesmo ID.
 *
 * Enquanto "client" estiver vazio, o site mostra apenas espaços reservados.
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
  popupAtivo: true,      // liga/desliga o popup
  popupACada: 2,         // exibe a cada N simulações
  popupSegundos: 5       // tempo até liberar o botão de fechar
};

(function () {
  var cfg = window.ADS_CONFIG;

  function renderizar() {
    var blocos = document.querySelectorAll('.ad[data-ad]');
    blocos.forEach(function (el) {
      if (el.dataset.pronto) return;
      var nome = el.dataset.ad;
      var slot = cfg.slots[nome];
      el.dataset.pronto = "1";
      el.style.minWidth = el.dataset.w + "px";
      el.style.minHeight = el.dataset.h + "px";

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
        el.textContent = 'Espaço publicitário ' + el.dataset.w + '×' + el.dataset.h;
      }
    });
  }

  function carregarScript() {
    if (!cfg.client) return;
    var s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(cfg.client);
    document.head.appendChild(s);
  }

  /* Chamado quando um bloco novo fica visível (ex.: popup). */
  window.ativarAnuncios = function (container) {
    if (!cfg.client) return;
    var itens = container.querySelectorAll('ins.adsbygoogle:not([data-ativado])');
    itens.forEach(function (ins) {
      ins.setAttribute('data-ativado', '1');
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
    });
  };

  carregarScript();
  renderizar();
  window.ativarAnuncios(document);
})();
