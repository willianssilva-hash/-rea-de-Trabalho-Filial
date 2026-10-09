# Área de Trabalho Filial — Central Pública

Central que reúne **todos os painéis e repositórios** da operação em um único link.
Qualquer pessoa com o link consegue visualizar tudo — **sem login e sem cadastro**.

## 🔗 Link para compartilhar

**https://willianssilva-hash.github.io/-rea-de-Trabalho-Filial/**

Basta enviar este link para a equipe (WhatsApp, e-mail etc.): a página abre
direto no navegador de qualquer pessoa, exibindo todos os repositórios públicos
com botões para abrir cada painel.

## Painéis e repositórios

| Item | Descrição | Link |
|---|---|---|
| 🏠 Área de Trabalho Filial | Esta central | [Abrir](https://willianssilva-hash.github.io/-rea-de-Trabalho-Filial/) |
| 🚛 Cockpit Diário | Frota e motoristas — filial (BA) e matriz (SP) | [Abrir](https://willianssilva-hash.github.io/Cockpit/) · [Repositório](https://github.com/willianssilva-hash/Cockpit) |
| 📡 Torre de Controle — Monitoramento | Planilhas de monitoramento filial e matriz: entregas, ocorrências, devoluções e mapa | [Abrir](https://willianssilva-hash.github.io/Monitoramento2/) · [Repositório](https://github.com/willianssilva-hash/Monitoramento2) |
| 📦 Controle de Carregamentos | Carregamentos matriz (ARU) e filial (FSA) | [Abrir](https://willianssilva-hash.github.io/Controle-de-carregamentos/) · [Repositório](https://github.com/willianssilva-hash/Controle-de-carregamentos) |
| 📅 Daily Captação | Programação / Fechamento | [Abrir](https://willianssilva-hash.github.io/Daily-Capta-o/) · [Repositório](https://github.com/willianssilva-hash/Daily-Capta-o) |
| 🗂️ CONTROLERPA | Controle ERP | [Repositório](https://github.com/willianssilva-hash/CONTROLERPA) |

## Como funciona

- Página **100% estática** (`index.html`), sem build e sem backend — publicada
  pelo GitHub Pages a partir da branch `main`.
- A lista de repositórios é buscada **automaticamente** na API pública do
  GitHub (`users/willianssilva-hash/repos`): repositórios públicos novos
  aparecem sozinhos, sem precisar editar nada.
  - Resultado com cache de 5 minutos no navegador (evita estourar o limite da API).
  - Se a API falhar, a página exibe a lista salva embutida no código.
- Cada cartão mostra nome amigável, descrição, data da última atualização e
  botões **Abrir painel** (quando o repositório tem GitHub Pages) e **Repositório**.

## Acesso

Todos os repositórios e painéis envolvidos são **públicos**. Para que um
repositório apareça no link compartilhado, ele precisa estar público
(Settings → General → Danger Zone → Change visibility → Public).

## Adicionar um repositório novo

1. Crie o repositório como **público** — ele aparece sozinho na central.
2. (Opcional) Para exibir nome/descrição/ícone amigáveis, adicione uma entrada
   na lista `KNOWN` dentro de `index.html`.

## Desenvolvimento local

```bash
python3 -m http.server 8080 --bind 0.0.0.0
```

Acesse `http://localhost:8080`.
