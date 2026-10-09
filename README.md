# Área de trabalho — Repositórios

Painel estático para reunir links de projetos e painéis publicados. O atalho inicial abre diretamente o Monitoramento2 em uma nova aba:

- <https://willianssilva-hash.github.io/Monitoramento2/>

## Usar localmente

Abra `index.html` no navegador ou sirva a pasta com qualquer servidor estático. Por exemplo:

```bash
python3 -m http.server 4173
```

Depois, acesse `http://localhost:4173`.

## Publicar

O workflow `.github/workflows/deploy-pages.yml` publica o painel no GitHub Pages sempre que a branch de trabalho do Arena é atualizada. Após a primeira implantação, o endereço público é:

- <https://willianssilva-hash.github.io/-rea-de-Trabalho-Filial/>

O painel não precisa de backend; os arquivos `index.html`, `styles.css` e `app.js` podem ser servidos por qualquer hospedagem estática. Caso seja a primeira publicação desse repositório, o GitHub poderá pedir que a fonte do Pages seja configurada como **GitHub Actions** em **Settings → Pages**.

## Adicionar outros links

Use **Adicionar repositório** no painel e informe o nome, o endereço e, opcionalmente, uma descrição. O formulário aceita links com ou sem `https://`, valida endereços web e impede duplicatas. Os dados e favoritos ficam salvos no `localStorage` do navegador em uso; portanto, cada navegador/dispositivo mantém sua própria lista. O botão de cada cartão abre o endereço cadastrado em uma nova aba.
