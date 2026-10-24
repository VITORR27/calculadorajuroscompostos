/* Funções puras de cálculo (sem acesso ao DOM). */
(function (root) {
  function taxaMensal(taxa, unidade) {
    var i = taxa / 100;
    return unidade === 'ano' ? Math.pow(1 + i, 1 / 12) - 1 : i;
  }

  function meses(prazo, unidade) {
    return Math.round(unidade === 'ano' ? prazo * 12 : prazo);
  }

  /* Simulação mês a mês. momento: 'fim' | 'inicio' */
  function simular(o) {
    var i = taxaMensal(o.taxa, o.taxaUn);
    var n = meses(o.prazo, o.prazoUn);
    var saldo = o.pv;
    var investido = o.pv;
    var jurosAc = 0;
    var linhas = [];
    for (var m = 1; m <= n; m++) {
      var juros;
      if (o.momento === 'inicio') {
        saldo += o.pmt;
        juros = saldo * i;
        saldo += juros;
      } else {
        juros = saldo * i;
        saldo += juros + o.pmt;
      }
      investido += o.pmt;
      jurosAc += juros;
      linhas.push({ mes: m, aporte: o.pmt, juros: juros, investido: investido, jurosAc: jurosAc, saldo: saldo });
    }
    return { i: i, n: n, linhas: linhas, final: saldo, investido: investido, juros: jurosAc };
  }

  /* Aporte mensal necessário (aporte no fim do mês). */
  function aporteNecessario(alvo, pv, i, n) {
    var fator = Math.pow(1 + i, n);
    var falta = alvo - pv * fator;
    if (falta <= 0) return 0;
    if (i === 0) return falta / n;
    return falta * i / (fator - 1);
  }

  /* Meses até atingir a meta (aporte no fim do mês). Retorna null se passar de 100 anos. */
  function prazoNecessario(alvo, pv, pmt, i) {
    if (pv >= alvo) return 0;
    var saldo = pv;
    for (var m = 1; m <= 1200; m++) {
      saldo = saldo * (1 + i) + pmt;
      if (saldo >= alvo - 0.005) return m;
    }
    return null;
  }

  /* Formatação e leitura de números no padrão brasileiro. */
  var brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  var num = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function ler(texto) {
    var t = String(texto).trim().replace(/\s/g, '').replace(/^R\$/, '');
    if (t === '') return NaN;
    if (t.indexOf(',') > -1) t = t.replace(/\./g, '').replace(',', '.');
    else if ((t.match(/\./g) || []).length > 1) t = t.replace(/\./g, '');
    return Number(t);
  }

  var api = { taxaMensal: taxaMensal, meses: meses, simular: simular, aporteNecessario: aporteNecessario, prazoNecessario: prazoNecessario, brl: brl, num: num, ler: ler };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Calc = api;
})(this);
