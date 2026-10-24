# Receber os leads numa planilha do Google

Os leads do formulário são enviados para um Google Apps Script, que grava cada um numa linha da sua planilha. É gratuito e não precisa de servidor.

## Passo a passo

1. Crie uma planilha nova no Google Sheets (ex.: "Leads - Juros Compostos").
2. Menu **Extensões → Apps Script**.
3. Apague o conteúdo e cole o código abaixo. Salve.
4. Clique em **Implantar → Nova implantação → Tipo: App da Web**.
   - Executar como: **Eu**
   - Quem tem acesso: **Qualquer pessoa**
5. Autorize quando o Google pedir e copie a **URL do app da Web** (termina em `/exec`).
6. No arquivo `ads.js`, cole a URL em `leadsEndpoint` e mude `leadPopupAtivo` para `true`.
7. Faça o commit. O site publica sozinho.

Para testar sem salvar nada, abra o site com `?preview=1` no final do endereço. Depois de configurar a URL, faça um teste real e confira se a linha apareceu na planilha.

Se mudar o código do script, é preciso criar uma **nova implantação** (ou editar a existente e escolher "Nova versão") para a mudança valer.

## Código do Apps Script

```javascript
var ABA = 'Leads';

function limpar(v) {
  v = String(v == null ? '' : v);
  // evita que o texto seja interpretado como fórmula na planilha
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function doPost(e) {
  var planilha = SpreadsheetApp.getActiveSpreadsheet();
  var aba = planilha.getSheetByName(ABA) || planilha.insertSheet(ABA);
  var d = JSON.parse(e.postData.contents);

  if (aba.getLastRow() === 0) {
    aba.appendRow([
      'Data', 'Nome', 'E-mail', 'Telefone', 'Interesses', 'Consentimento',
      'Texto do consentimento', 'Página', 'Gatilho', 'Parâmetros da URL',
      'Última simulação', 'Simulações na sessão'
    ]);
  }

  aba.appendRow([
    limpar(d.data), limpar(d.nome), limpar(d.email), limpar(d.telefone),
    limpar((d.interesses || []).join(', ')), d.consentimento ? 'sim' : 'não',
    limpar(d.texto_consentimento), limpar(d.origem), limpar(d.gatilho), limpar(d.utm),
    limpar(JSON.stringify(d.simulacao || {})), limpar(d.simulacoes_na_sessao)
  ]);

  return ContentService.createTextOutput('ok');
}
```

## Cuidados

- A URL do script fica visível no código do site. Qualquer pessoa pode enviar dados falsos para ela. O formulário tem um campo-armadilha contra robôs, mas revise a planilha de vez em quando.
- A planilha guarda dados pessoais. Mantenha-a privada, compartilhe só com quem precisa e apague os dados de quem pedir (LGPD).
- Só envie mensagens para quem marcou a autorização. A coluna "Consentimento" e o texto aceito ficam registrados em cada linha.
- Cada lead traz um resumo da última simulação feita (valores e prazos), que serve para personalizar o contato.
