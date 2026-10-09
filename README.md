# ÁREA DE TRABALHO FILIAL — Colormaq

Painel estático da Colormaq para reunir links de projetos e painéis publicados, com identidade visual em azul e branco. O botão **Torre de Controle Monitoramento** abre diretamente o Painel de Monitoramento em uma nova aba:

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

## Compartilhar

O endereço público do painel é <https://willianssilva-hash.github.io/-rea-de-Trabalho-Filial/>. Você pode enviar esse link para outras pessoas. Os links adicionados pelo formulário e os favoritos são mantidos no armazenamento local de cada navegador; para que novos itens apareçam para todos, seria necessário conectá-los a um serviço compartilhado.

## Adicionar outros links

Use **Adicionar repositório** no painel e informe o nome, o setor (Captação, Monitoramento ou Liberação), o endereço e, opcionalmente, uma descrição. Os links são exibidos agrupados pelo setor selecionado; também é possível iniciar o cadastro diretamente em um setor vazio. O formulário aceita links com ou sem `https://`, valida endereços web e impede duplicatas. Os dados e favoritos ficam salvos no `localStorage` do navegador em uso; portanto, cada navegador/dispositivo mantém sua própria lista. Repositórios salvos em versões anteriores sem setor são mantidos visíveis e migrados para **Monitoramento**. O botão de cada cartão abre o endereço cadastrado em uma nova aba.
