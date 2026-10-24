/* Lógica das ferramentas extras (uma página por ferramenta, escolhida por data-pagina no body). */
(function () {
  var pag = document.body.getAttribute('data-pagina');
  var form = document.getElementById('form-ferr');
  if (!pag || !form) return;

  var $ = function (id) { return document.getElementById(id); };
  var ler = Calc.ler;
  var brl = function (v) { return Calc.brl.format(v); };
  var pct = function (v) { return Calc.num.format(v) + '%'; };
  var vazio = function (v) { return isNaN(v); };

  function textoPrazo(m) {
    var a = Math.floor(m / 12), r = m % 12, p = [];
    if (a) p.push(a + (a === 1 ? ' ano' : ' anos'));
    if (r) p.push(r + (r === 1 ? ' mês' : ' meses'));
    return p.join(' e ') || '0 mês';
  }

  function dado(rotulo, valor, destaque) {
    return '<div class="dado' + (destaque ? ' destaque' : '') + '"><small>' + rotulo + '</small><strong>' + valor + '</strong></div>';
  }

  document.querySelectorAll('[data-moeda]').forEach(function (el) {
    el.addEventListener('blur', function () {
      var v = ler(this.value);
      if (!isNaN(v) && v >= 0) this.value = Calc.num.format(v);
    });
    el.addEventListener('focus', function () { this.select(); });
  });

  /* ---------- Juros simples x compostos ---------- */
  function simplesCompostos() {
    var c = ler($('c').value), t = ler($('t').value), tu = $('t-un').value;
    var p = ler($('p').value), pu = $('p-un').value;
    if (vazio(c) || c <= 0) return { erro: 'Informe o valor investido.' };
    if (vazio(t) || t < 0) return { erro: 'Informe uma taxa de juros válida.' };
    if (vazio(p) || p <= 0) return { erro: 'Informe o período.' };
    var n = Calc.meses(p, pu);
    if (n < 1 || n > 1200) return { erro: 'O período deve ficar entre 1 mês e 100 anos.' };

    var im = tu === 'ano' ? t / 100 / 12 : t / 100;   // juros simples: taxa proporcional por mês
    var ic = Calc.taxaMensal(t, tu);                   // juros compostos: taxa equivalente por mês
    var simp = function (k) { return c * (1 + im * k); };
    var comp = function (k) { return c * Math.pow(1 + ic, k); };

    var passo = n <= 24 ? 1 : 12, ks = [];
    for (var k = passo; k < n; k += passo) ks.push(k);
    ks.push(n);
    var linhas = ks.map(function (k) {
      return '<tr><td>' + textoPrazo(k) + '</td><td>' + brl(simp(k)) + '</td><td>' + brl(comp(k)) +
        '</td><td>' + brl(comp(k) - simp(k)) + '</td></tr>';
    }).join('');

    return {
      html:
        '<div class="resumo">' + dado('Montante com juros compostos', brl(comp(n)), true) +
        dado('Montante com juros simples', brl(simp(n))) +
        dado('Diferença', brl(comp(n) - simp(n))) + '</div>' +
        '<p class="nota">Nos juros compostos, a taxa anual é convertida na taxa mensal equivalente. Nos juros simples, a taxa anual é dividida por 12. Por isso, em prazos curtos (menos de 12 meses) o simples pode render um pouco mais.</p>' +
        '<div class="rolagem"><table><thead><tr><th>Período</th><th>Juros simples</th><th>Juros compostos</th><th>Diferença</th></tr></thead><tbody>' + linhas + '</tbody></table></div>',
      ctx: { calc: 'simples-x-compostos' }
    };
  }

  /* ---------- Orçamento 50/30/20 ---------- */
  function orcamento() {
    var r = ler($('renda').value);
    var pn = ler($('pn').value), pd = ler($('pd').value), pp = ler($('pp').value);
    var an = ler($('an').value), ad = ler($('ad').value);
    if (vazio(r) || r <= 0) return { erro: 'Informe sua renda mensal líquida.' };
    if (vazio(pn) || vazio(pd) || vazio(pp) || pn < 0 || pd < 0 || pp < 0) return { erro: 'Informe as três porcentagens.' };
    var soma = pn + pd + pp;
    if (Math.abs(soma - 100) > 0.01) return { erro: 'As porcentagens somam ' + Calc.num.format(soma) + '%. Ajuste para somar 100%.' };

    var vn = r * pn / 100, vd = r * pd / 100, vp = r * pp / 100;
    var tenho = !vazio(an) && !vazio(ad) && an >= 0 && ad >= 0;
    var hojeP = tenho ? r - an - ad : NaN;

    function situacaoGasto(hoje, ideal) {
      if (vazio(hoje)) return '—';
      return hoje <= ideal ? 'Dentro da meta' : 'Acima em ' + brl(hoje - ideal);
    }
    var sitP = '—';
    if (!vazio(hojeP)) sitP = hojeP >= vp ? 'Dentro da meta' : 'Faltam ' + brl(vp - hojeP);

    var linhas =
      '<tr><td>Necessidades</td><td>' + pct(pn) + '</td><td>' + brl(vn) + '</td><td>' + (vazio(an) ? '—' : brl(an)) + '</td><td>' + situacaoGasto(an, vn) + '</td></tr>' +
      '<tr><td>Desejos</td><td>' + pct(pd) + '</td><td>' + brl(vd) + '</td><td>' + (vazio(ad) ? '—' : brl(ad)) + '</td><td>' + situacaoGasto(ad, vd) + '</td></tr>' +
      '<tr><td>Poupança e investimentos</td><td>' + pct(pp) + '</td><td>' + brl(vp) + '</td><td>' + (vazio(hojeP) ? '—' : brl(hojeP)) + '</td><td>' + sitP + '</td></tr>';

    var link = 'index.html?pv=0&pmt=' + vp.toFixed(2) + '&taxa=10&taxaUn=ano&prazo=10&prazoUn=ano';
    return {
      html:
        '<div class="resumo">' + dado('Necessidades', brl(vn)) + dado('Desejos', brl(vd)) + dado('Poupança e investimentos', brl(vp), true) + '</div>' +
        '<div class="rolagem"><table><thead><tr><th>Categoria</th><th>Meta</th><th>Valor ideal</th><th>Hoje</th><th>Situação</th></tr></thead><tbody>' + linhas + '</tbody></table></div>' +
        '<p class="nota">Guardando ' + brl(vp) + ' por mês, <a href="' + link + '">veja quanto isso pode render na calculadora de juros compostos</a> (o link usa 10% ao ano só como exemplo; ajuste para a taxa que você espera).</p>',
      ctx: { calc: 'orcamento-50-30-20' }
    };
  }

  /* ---------- Reserva de emergência ---------- */
  function reserva() {
    var d = ler($('desp').value), m = Number($('meses').value);
    var g = ler($('guardado').value), a = ler($('aporte').value);
    var t = ler($('t').value), tu = $('t-un').value;
    if (vazio(d) || d <= 0) return { erro: 'Informe suas despesas mensais essenciais.' };
    if (vazio(g) || g < 0) return { erro: 'Informe quanto você já guardou (pode ser zero).' };
    if (vazio(a) || a < 0) return { erro: 'Informe quanto pode guardar por mês (pode ser zero).' };
    if (vazio(t) || t < 0) return { erro: 'Informe o rendimento esperado (pode ser zero).' };

    var alvo = d * m, falta = Math.max(0, alvo - g);
    var cards = '<div class="resumo">' + dado('Reserva ideal', brl(alvo), true) + dado('Você já tem', brl(g)) + dado('Falta', brl(falta)) + '</div>';

    var msg;
    if (falta === 0) {
      msg = 'Você já completou a reserva para ' + m + ' meses de despesas. O próximo passo é mantê-la em um lugar seguro e com resgate rápido.';
    } else {
      var meses = Calc.prazoNecessario(alvo, g, a, Calc.taxaMensal(t, tu));
      if (meses === null) {
        msg = 'Com esse aporte, a reserva não fica pronta em 100 anos. Aumente o valor guardado por mês.';
      } else {
        msg = 'Guardando ' + brl(a) + ' por mês, você completa a reserva em <strong>' + textoPrazo(meses) + '</strong>.';
      }
    }
    return { html: cards + '<p class="nota nota-destaque">' + msg + '</p>', ctx: { calc: 'reserva-emergencia' } };
  }

  /* ---------- Independência financeira ---------- */
  function independencia() {
    var renda = ler($('renda').value), pv = ler($('pv').value), pmt = ler($('pmt').value);
    var real = ler($('real').value), ret = ler($('ret').value), anos = ler($('anos').value);
    if (vazio(renda) || renda <= 0) return { erro: 'Informe a renda mensal que você quer ter.' };
    if (vazio(pv) || pv < 0) return { erro: 'Informe seu patrimônio atual (pode ser zero).' };
    if (vazio(pmt) || pmt < 0) return { erro: 'Informe quanto investe por mês (pode ser zero).' };
    if (vazio(real) || real < 0) return { erro: 'Informe o retorno real esperado (pode ser zero).' };
    if (vazio(ret) || ret <= 0) return { erro: 'Informe a taxa de retirada anual (maior que zero).' };
    if (pv === 0 && pmt === 0) return { erro: 'Informe seu patrimônio atual ou um aporte mensal.' };

    var alvo = renda * 12 / (ret / 100);
    var i = Calc.taxaMensal(real, 'ano');
    var m = Calc.prazoNecessario(alvo, pv, pmt, i);
    var cards = '<div class="resumo">' + dado('Patrimônio necessário', brl(alvo), true) + dado('Você tem hoje', brl(pv)) + dado('Renda desejada por ano', brl(renda * 12)) + '</div>';

    var msg;
    if (m === 0) msg = 'Seu patrimônio atual já alcança o valor necessário para essa renda.';
    else if (m === null) msg = 'Com esse aporte, o patrimônio não chega lá em 100 anos. Aumente o aporte ou revise a renda desejada.';
    else {
      var aportado = pmt * m, juros = Math.max(0, alvo - pv - aportado);
      msg = 'Com ' + brl(pmt) + ' por mês, você chega lá em <strong>' + textoPrazo(m) + '</strong>. Nesse caminho, cerca de ' + brl(aportado) + ' saem do seu bolso e cerca de ' + brl(juros) + ' vêm do rendimento.';
    }

    var extra = '';
    if (!vazio(anos) && anos > 0 && anos <= 100) {
      var p = Calc.aporteNecessario(alvo, pv, i, Math.round(anos * 12));
      extra = '<p class="nota nota-destaque">Para chegar em ' + anos + (anos === 1 ? ' ano' : ' anos') + ', você precisaria investir ' + (p === 0 ? 'nada além do que já tem' : '<strong>' + brl(p) + '</strong> por mês') + '.</p>';
    }
    return {
      html: cards + '<p class="nota nota-destaque">' + msg + '</p>' + extra +
        '<p class="nota">Os valores estão em poder de compra de hoje, porque o retorno informado é acima da inflação. A taxa de retirada é uma referência, não uma garantia.</p>',
      ctx: { calc: 'independencia-financeira' }
    };
  }

  var tratadores = { 'simples-compostos': simplesCompostos, 'orcamento': orcamento, 'reserva': reserva, 'independencia': independencia };

  function mostrarErro(msg) {
    $('erro-ferr').textContent = msg;
    $('erro-ferr').hidden = !msg;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var fn = tratadores[pag];
    if (!fn) return;
    var r = fn();
    mostrarErro(r.erro || '');
    if (r.erro) { $('saida').hidden = true; return; }
    $('saida').innerHTML = r.html;
    $('saida').hidden = false;
    $('saida').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    if (window.contarSimulacao) window.contarSimulacao(r.ctx);
  });

  $('limpar-ferr').addEventListener('click', function () {
    form.querySelectorAll('input[type="text"]').forEach(function (i) { i.value = ''; });
    mostrarErro('');
    $('saida').hidden = true;
    var primeiro = form.querySelector('input[type="text"]');
    if (primeiro) primeiro.focus();
  });
})();
