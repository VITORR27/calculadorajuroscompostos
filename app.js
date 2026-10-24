(function () {
  var $ = function (id) { return document.getElementById(id); };
  var brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  var num = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function ler(texto) {
    var t = String(texto).trim().replace(/\s/g, '').replace(/^R\$/, '');
    if (t === '') return NaN;
    if (t.indexOf(',') > -1) t = t.replace(/\./g, '').replace(',', '.');
    else if ((t.match(/\./g) || []).length > 1) t = t.replace(/\./g, '');
    return Number(t);
  }

  function mostrarErro(el, msg) {
    el.textContent = msg;
    el.hidden = !msg;
  }

  /* Formata campos de dinheiro ao sair do campo */
  ['pv', 'pmt', 'm-alvo', 'm-pv', 'm-pmt'].forEach(function (id) {
    $(id).addEventListener('blur', function () {
      var v = ler(this.value);
      if (!isNaN(v) && v >= 0) this.value = num.format(v);
    });
    $(id).addEventListener('focus', function () { this.select(); });
  });
  ['taxa', 'm-taxa'].forEach(function (id) {
    $(id).addEventListener('blur', function () {
      var v = ler(this.value);
      if (!isNaN(v) && v >= 0) this.value = num.format(v);
    });
  });

  /* O contador de simulações, o formulário de lead e o popup ficam em lead.js */
  function contarSimulacao(ctx) {
    if (window.contarSimulacao) window.contarSimulacao(ctx);
  }

  /* ---------- Calculadora principal ---------- */
  var ultima = null;

  function lerForm() {
    return {
      pv: ler($('pv').value),
      pmt: ler($('pmt').value),
      taxa: ler($('taxa').value),
      taxaUn: $('taxa-un').value,
      prazo: ler($('prazo').value),
      prazoUn: $('prazo-un').value,
      momento: $('momento').value
    };
  }

  function validar(o) {
    if (isNaN(o.pv) || o.pv < 0) return 'Informe um valor inicial válido (pode ser zero).';
    if (isNaN(o.pmt) || o.pmt < 0) return 'Informe um aporte mensal válido (pode ser zero).';
    if (o.pv === 0 && o.pmt === 0) return 'Informe um valor inicial ou um aporte mensal.';
    if (isNaN(o.taxa) || o.taxa < 0) return 'Informe uma taxa de juros válida.';
    if (isNaN(o.prazo) || o.prazo <= 0) return 'Informe um período maior que zero.';
    if (Calc.meses(o.prazo, o.prazoUn) > 1200) return 'O período máximo é de 100 anos (1.200 meses).';
    if (Calc.meses(o.prazo, o.prazoUn) < 1) return 'O período precisa ter pelo menos 1 mês.';
    return '';
  }

  function desenharGrafico(linhas, pv) {
    var W = 640, H = 240, pl = 8, pr = 8, pt = 10, pb = 22;
    var n = linhas.length;
    var max = linhas[n - 1].saldo || 1;
    var x = function (k) { return pl + (k / n) * (W - pl - pr); };
    var y = function (v) { return pt + (1 - v / max) * (H - pt - pb); };

    var pts1 = [[x(0), y(pv)]], pts2 = [[x(0), y(pv)]];
    var passo = Math.max(1, Math.floor(n / 240));
    linhas.forEach(function (l, k) {
      if ((k + 1) % passo === 0 || k === n - 1) {
        pts1.push([x(k + 1), y(l.saldo)]);
        pts2.push([x(k + 1), y(l.investido)]);
      }
    });
    var linha = function (p) { return p.map(function (q, k) { return (k ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join(' '); };
    var area = function (p) { return linha(p) + ' L' + p[p.length - 1][0].toFixed(1) + ' ' + y(0) + ' L' + p[0][0].toFixed(1) + ' ' + y(0) + ' Z'; };

    var anos = n / 12;
    var rotulo = anos >= 2 ? Math.round(anos) + ' anos' : n + ' meses';

    $('grafico').innerHTML =
      '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Evolução do montante e do total investido">' +
      '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(0) + '" y2="' + y(0) + '" class="eixo"/>' +
      '<path d="' + area(pts1) + '" class="area1"/>' +
      '<path d="' + area(pts2) + '" class="area2"/>' +
      '<path d="' + linha(pts1) + '" class="linha1"/>' +
      '<path d="' + linha(pts2) + '" class="linha2"/>' +
      '<text x="' + pl + '" y="' + (H - 6) + '" class="txt">Início</text>' +
      '<text x="' + (W - pr) + '" y="' + (H - 6) + '" text-anchor="end" class="txt">' + rotulo + '</text>' +
      '</svg>';
  }

  function mostrarResultado(r, o) {
    $('r-final').textContent = brl.format(r.final);
    $('r-investido').textContent = brl.format(r.investido);
    $('r-juros').textContent = brl.format(r.juros);
    desenharGrafico(r.linhas, o.pv);

    var html = '<tr class="ini"><td>0</td><td>—</td><td>—</td><td>' + brl.format(o.pv) + '</td><td>' + brl.format(0) + '</td><td>' + brl.format(o.pv) + '</td></tr>';
    var partes = [html];
    r.linhas.forEach(function (l) {
      partes.push('<tr><td>' + l.mes + '</td><td>' + brl.format(l.aporte) + '</td><td>' + brl.format(l.juros) +
        '</td><td>' + brl.format(l.investido) + '</td><td>' + brl.format(l.jurosAc) + '</td><td>' + brl.format(l.saldo) + '</td></tr>');
    });
    $('tabela').innerHTML = partes.join('');
    $('resultado').hidden = false;
    $('tabela-box').open = false;
  }

  $('form-calc').addEventListener('submit', function (e) {
    e.preventDefault();
    var o = lerForm();
    var erro = validar(o);
    mostrarErro($('erro-calc'), erro);
    if (erro) { $('resultado').hidden = true; return; }
    var r = Calc.simular(o);
    ultima = o;
    mostrarResultado(r, o);
    $('resultado').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    contarSimulacao({
      calc: 'juros-compostos', valor_inicial: o.pv, aporte_mensal: o.pmt,
      taxa: o.taxa, taxa_por: o.taxaUn, prazo: o.prazo, prazo_em: o.prazoUn,
      valor_final: Math.round(r.final * 100) / 100
    });
  });

  $('limpar').addEventListener('click', function () {
    $('pv').value = '';
    $('pmt').value = '';
    $('taxa').value = '';
    $('prazo').value = '';
    $('taxa-un').value = 'ano';
    $('prazo-un').value = 'ano';
    $('momento').value = 'fim';
    mostrarErro($('erro-calc'), '');
    $('resultado').hidden = true;
    $('pv').focus();
  });

  /* ---------- Simulador de meta ---------- */
  var modo = 'aporte';
  var abas = document.querySelectorAll('.aba');
  abas.forEach(function (a) {
    a.addEventListener('click', function () {
      modo = a.dataset.modo;
      abas.forEach(function (b) { b.classList.toggle('ativa', b === a); });
      $('campo-m-prazo').hidden = modo === 'prazo';
      $('campo-m-pmt').hidden = modo === 'aporte';
      $('res-meta').hidden = true;
      mostrarErro($('erro-meta'), '');
    });
  });

  var proposta = null;

  function textoPrazo(m) {
    var a = Math.floor(m / 12), r = m % 12, p = [];
    if (a) p.push(a + (a === 1 ? ' ano' : ' anos'));
    if (r) p.push(r + (r === 1 ? ' mês' : ' meses'));
    return p.join(' e ') || '0 mês';
  }

  $('form-meta').addEventListener('submit', function (e) {
    e.preventDefault();
    var alvo = ler($('m-alvo').value), pv = ler($('m-pv').value), taxa = ler($('m-taxa').value);
    var taxaUn = $('m-taxa-un').value;
    var erro = '';
    if (isNaN(alvo) || alvo <= 0) erro = 'Informe o valor que você quer alcançar.';
    else if (isNaN(pv) || pv < 0) erro = 'Informe quanto você já tem (pode ser zero).';
    else if (isNaN(taxa) || taxa < 0) erro = 'Informe uma taxa de juros válida.';

    var i = isNaN(taxa) ? 0 : Calc.taxaMensal(taxa, taxaUn);
    var txt = '';

    if (!erro && modo === 'aporte') {
      var prazo = ler($('m-prazo').value), un = $('m-prazo-un').value;
      if (isNaN(prazo) || prazo <= 0) erro = 'Informe em quanto tempo quer chegar lá.';
      else if (Calc.meses(prazo, un) > 1200 || Calc.meses(prazo, un) < 1) erro = 'O período deve ficar entre 1 mês e 100 anos.';
      if (!erro) {
        var n = Calc.meses(prazo, un);
        var p = Calc.aporteNecessario(alvo, pv, i, n);
        if (p === 0) {
          txt = 'Só com o que você já tem, a meta de ' + brl.format(alvo) + ' é atingida em ' + textoPrazo(n) + '. Não precisa aportar nada.';
          proposta = { pv: pv, pmt: 0, taxa: taxa, taxaUn: taxaUn, prazo: n, prazoUn: 'mes', momento: 'fim' };
        } else {
          var total = pv + p * n;
          txt = 'Para chegar a ' + brl.format(alvo) + ' em ' + textoPrazo(n) + ', você precisa investir ' + brl.format(p) +
            ' por mês. Desse total, ' + brl.format(total) + ' saem do seu bolso e ' + brl.format(alvo - total) + ' vêm dos juros.';
          proposta = { pv: pv, pmt: p, taxa: taxa, taxaUn: taxaUn, prazo: n, prazoUn: 'mes', momento: 'fim' };
        }
      }
    } else if (!erro) {
      var pmt = ler($('m-pmt').value);
      if (isNaN(pmt) || pmt < 0) erro = 'Informe quanto pode investir por mês.';
      else if (pmt === 0 && pv === 0) erro = 'Informe um valor inicial ou um aporte mensal.';
      if (!erro) {
        var m = Calc.prazoNecessario(alvo, pv, pmt, i);
        if (m === null) {
          txt = 'Com esses valores a meta não é atingida em 100 anos. Tente aumentar o aporte ou a taxa.';
          proposta = null;
        } else if (m === 0) {
          txt = 'Você já tem o valor da meta. Nada a esperar.';
          proposta = null;
        } else {
          txt = 'Investindo ' + brl.format(pmt) + ' por mês, você chega a ' + brl.format(alvo) + ' em ' + textoPrazo(m) + '.';
          proposta = { pv: pv, pmt: pmt, taxa: taxa, taxaUn: taxaUn, prazo: m, prazoUn: 'mes', momento: 'fim' };
        }
      }
    }

    mostrarErro($('erro-meta'), erro);
    if (erro) { $('res-meta').hidden = true; return; }
    $('res-meta-txt').textContent = txt;
    $('usar').hidden = !proposta;
    $('res-meta').hidden = false;
    contarSimulacao({ calc: 'meta', modo: modo, valor_desejado: alvo, ja_tenho: pv, taxa: taxa, taxa_por: taxaUn });
  });

  $('limpar-meta').addEventListener('click', function () {
    ['m-alvo', 'm-pv', 'm-taxa', 'm-prazo', 'm-pmt'].forEach(function (id) { $(id).value = ''; });
    $('m-taxa-un').value = 'ano';
    $('m-prazo-un').value = 'ano';
    mostrarErro($('erro-meta'), '');
    $('res-meta').hidden = true;
    $('m-alvo').focus();
  });

  $('usar').addEventListener('click', function () {
    if (!proposta) return;
    $('pv').value = num.format(proposta.pv);
    $('pmt').value = num.format(proposta.pmt);
    $('taxa').value = num.format(proposta.taxa);
    $('taxa-un').value = proposta.taxaUn;
    $('prazo').value = String(proposta.prazo);
    $('prazo-un').value = 'mes';
    $('momento').value = 'fim';
    var o = lerForm();
    var r = Calc.simular(o);
    ultima = o;
    mostrarErro($('erro-calc'), '');
    mostrarResultado(r, o);
    $('calculadora').scrollIntoView({ behavior: 'smooth' });
  });

  /* Preenche a calculadora quando o endereço traz valores (links das outras ferramentas) */
  (function () {
    var q;
    try { q = new URLSearchParams(location.search); } catch (e) { return; }
    var achou = false;
    ['pv', 'pmt', 'taxa', 'prazo'].forEach(function (k) {
      if (!q.has(k)) return;
      var v = ler(q.get(k));
      if (isNaN(v) || v < 0) return;
      $(k).value = k === 'prazo' ? String(v) : num.format(v);
      achou = true;
    });
    [['taxaUn', 'taxa-un'], ['prazoUn', 'prazo-un']].forEach(function (p) {
      var v = q.get(p[0]);
      if (v === 'ano' || v === 'mes') { $(p[1]).value = v; achou = true; }
    });
    if (achou) setTimeout(function () { $('calculadora').scrollIntoView(); }, 50);
  })();
})();
