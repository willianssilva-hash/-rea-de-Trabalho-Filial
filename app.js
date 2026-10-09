(() => {
  "use strict";

  const STORAGE_KEY = "workspace-repositories-v1";
  const DEFAULT_REPOSITORIES = [
    {
      id: "monitoramento2",
      name: "Monitoramento 2",
      url: "https://willianssilva-hash.github.io/Monitoramento2/",
      description: "Acesse diretamente as informações publicadas no painel Monitoramento2.",
      favorite: false,
      builtIn: true,
    },
  ];
  const TONES = ["blue", "green", "orange"];

  const elements = {
    grid: document.querySelector("#repo-grid"),
    count: document.querySelector("#repo-count"),
    sidebarCount: document.querySelector("#sidebar-count"),
    search: document.querySelector("#search-input"),
    empty: document.querySelector("#empty-state"),
    emptyTitle: document.querySelector("#empty-title"),
    emptyCopy: document.querySelector("#empty-copy"),
    dialog: document.querySelector("#repo-dialog"),
    form: document.querySelector("#repo-form"),
    name: document.querySelector("#repo-name"),
    url: document.querySelector("#repo-url"),
    description: document.querySelector("#repo-description"),
    urlError: document.querySelector("#url-error"),
    toast: document.querySelector("#toast"),
  };

  let repositories = loadRepositories();
  let activeFilter = "all";
  let toastTimeout;

  function loadRepositories() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === null) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_REPOSITORIES));
        return structuredClone(DEFAULT_REPOSITORIES);
      }
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) throw new TypeError("Formato de repositórios inválido");
      return parsed.filter(isValidSavedRepository);
    } catch (error) {
      console.warn("Não foi possível ler os repositórios salvos.", error);
      return structuredClone(DEFAULT_REPOSITORIES);
    }
  }

  function isValidSavedRepository(item) {
    if (!item || typeof item !== "object") return false;
    if (typeof item.id !== "string" || typeof item.name !== "string" || typeof item.url !== "string") return false;
    try {
      const url = new URL(item.url);
      return ["http:", "https:"].includes(url.protocol);
    } catch {
      return false;
    }
  }

  function saveRepositories() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(repositories));
      return true;
    } catch (error) {
      console.warn("Não foi possível salvar os repositórios.", error);
      return false;
    }
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[character]);
  }

  function getPlatform(urlString) {
    try {
      const hostname = new URL(urlString).hostname.toLowerCase();
      if (hostname === "github.io" || hostname.endsWith(".github.io")) {
        return { label: "GitHub Pages", source: "github", tone: "purple" };
      }
      if (hostname === "github.com" || hostname.endsWith(".github.com")) {
        return { label: "GitHub", source: "github", tone: "purple" };
      }
      if (hostname === "gitlab.com" || hostname.endsWith(".gitlab.io")) {
        return { label: hostname.endsWith(".gitlab.io") ? "GitLab Pages" : "GitLab", source: "github", tone: "orange" };
      }
      return { label: "Site externo", source: "site", tone: "green" };
    } catch {
      return { label: "Link externo", source: "site", tone: "green" };
    }
  }

  function getDisplayUrl(urlString) {
    try {
      const parsed = new URL(urlString);
      const path = decodeURIComponent(parsed.pathname).replace(/\/$/, "");
      return `${parsed.host}${path}`;
    } catch {
      return urlString;
    }
  }

  function iconForRepository(repository, tone) {
    if (repository.id === "monitoramento2" || /monitoramento|monitoring/i.test(repository.name)) {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 19.5h17M5.5 16V9.5M10 16V5.5M14.5 16v-4M19 16V7"/><path d="m4.5 7.5 5-3 4.5 5 5-3"/></svg>';
    }
    if (tone === "blue") {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/><path d="M9 8h6M9 12h6M9 16h3"/></svg>';
    }
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M3.8 12h16.4M12 3.5c2.1 2.3 3.1 5.1 3.1 8.5s-1 6.2-3.1 8.5c-2.1-2.3-3.1-5.1-3.1-8.5s1-6.2 3.1-8.5Z"/></svg>';
  }

  function createCard(repository, index) {
    const platform = getPlatform(repository.url);
    const tone = repository.id === "monitoramento2" ? "purple" : TONES[index % TONES.length];
    const name = escapeHTML(repository.name);
    const description = escapeHTML(repository.description || "Acesse este projeto diretamente.");
    const href = escapeHTML(repository.url);
    const displayUrl = escapeHTML(getDisplayUrl(repository.url));
    const favoriteLabel = repository.favorite
      ? `Remover ${name} dos favoritos`
      : `Adicionar ${name} aos favoritos`;

    return `
      <article class="repo-card">
        <div class="repo-card-top">
          <div class="repo-icon" data-tone="${tone}">${iconForRepository(repository, tone)}</div>
          <div class="repo-card-actions">
            <span class="repo-type">${escapeHTML(platform.label)}</span>
            <button class="favorite-button${repository.favorite ? " is-favorite" : ""}" type="button" data-favorite-id="${escapeHTML(repository.id)}" aria-label="${favoriteLabel}" aria-pressed="${Boolean(repository.favorite)}">
              <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m10 2.5 2.3 4.66 5.14.75-3.72 3.62.88 5.12L10 14.23l-4.6 2.42.88-5.12-3.72-3.62 5.14-.75L10 2.5Z"/></svg>
            </button>
          </div>
        </div>
        <h3 title="${name}">${name}</h3>
        <p class="repo-description">${description}</p>
        <div class="repo-link-host" title="${displayUrl}">
          <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7"/><path d="M3.2 10h13.6M10 3c1.8 2 2.7 4.3 2.7 7S11.8 15 10 17c-1.8-2-2.7-4.3-2.7-7S8.2 5 10 3Z"/></svg>
          <span>${displayUrl}</span>
        </div>
        <div class="repo-card-bottom">
          <span class="repo-source"><i class="source-dot" data-source="${platform.source}"></i>${escapeHTML(platform.label)}</span>
          <a class="open-repo-button" href="${href}" target="_blank" rel="noopener noreferrer" aria-label="Abrir ${name} em uma nova aba">
            Abrir repositório
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M9 3h4v4M13 3 7 9"/><path d="M11 9v3.5a.5.5 0 0 1-.5.5h-7a.5.5 0 0 1-.5-.5v-7a.5.5 0 0 1 .5-.5H7"/></svg>
          </a>
        </div>
      </article>`;
  }

  function render() {
    const query = elements.search.value.trim().toLocaleLowerCase("pt-BR");
    const visibleRepositories = repositories.filter((repository) => {
      if (activeFilter === "favorites" && !repository.favorite) return false;
      const searchContent = `${repository.name} ${repository.description || ""} ${repository.url} ${getPlatform(repository.url).label}`;
      return searchContent.toLocaleLowerCase("pt-BR").includes(query);
    });

    elements.count.textContent = String(repositories.length).padStart(2, "0");
    elements.sidebarCount.textContent = String(repositories.length);
    elements.grid.innerHTML = visibleRepositories.map((repository) => createCard(repository, repositories.indexOf(repository))).join("");
    elements.grid.hidden = visibleRepositories.length === 0;
    elements.empty.hidden = visibleRepositories.length > 0;

    if (activeFilter === "favorites" && !query) {
      elements.emptyTitle.textContent = "Seus favoritos aparecem aqui";
      elements.emptyCopy.textContent = "Marque um repositório com a estrela para encontrá-lo rapidamente nesta lista.";
    } else {
      elements.emptyTitle.textContent = "Nenhum repositório encontrado";
      elements.emptyCopy.textContent = query
        ? "Tente buscar por outro nome, descrição ou endereço."
        : "Adicione um repositório ao seu espaço para começar a organizar seus acessos.";
    }

    document.querySelectorAll(".filter-button").forEach((button) => {
      const isActive = button.dataset.filter === activeFilter;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
    document.querySelector("#favorites-nav").setAttribute("aria-pressed", String(activeFilter === "favorites"));
  }

  function setFilter(filter) {
    activeFilter = filter;
    render();
  }

  function openDialog() {
    elements.form.reset();
    clearUrlError();
    elements.dialog.showModal();
    window.setTimeout(() => elements.name.focus(), 0);
  }

  function clearUrlError() {
    elements.urlError.textContent = "";
    elements.urlError.classList.remove("visible");
    elements.url.removeAttribute("aria-invalid");
  }

  function showUrlError(message) {
    elements.urlError.textContent = message;
    elements.urlError.classList.add("visible");
    elements.url.setAttribute("aria-invalid", "true");
    elements.url.focus();
  }

  function normalizeUrl(rawValue) {
    let candidate = rawValue.trim();
    if (!/^[a-z][a-z\d+.-]*:/i.test(candidate)) candidate = `https://${candidate}`;
    const parsed = new URL(candidate);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new TypeError("Use um endereço que comece com http:// ou https://.");
    }
    if (!parsed.hostname || parsed.username || parsed.password) {
      throw new TypeError("Informe um endereço web válido, sem usuário ou senha.");
    }
    return parsed.href;
  }

  function showToast(message) {
    window.clearTimeout(toastTimeout);
    elements.toast.textContent = message;
    elements.toast.classList.add("visible");
    toastTimeout = window.setTimeout(() => elements.toast.classList.remove("visible"), 3200);
  }

  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = elements.name.value.trim();
    const description = elements.description.value.trim();
    const rawUrl = elements.url.value;

    if (!name) {
      elements.name.focus();
      elements.name.setAttribute("aria-invalid", "true");
      return;
    }
    elements.name.removeAttribute("aria-invalid");
    clearUrlError();

    let url;
    try {
      if (!rawUrl.trim()) throw new TypeError("Informe o endereço do repositório ou painel.");
      url = normalizeUrl(rawUrl);
    } catch (error) {
      showUrlError(error instanceof TypeError ? error.message : "Informe um endereço web válido.");
      return;
    }

    const duplicate = repositories.some((repository) => {
      try { return new URL(repository.url).href === url; } catch { return false; }
    });
    if (duplicate) {
      showUrlError("Este endereço já está salvo na sua área de trabalho.");
      return;
    }

    const repository = {
      id: globalThis.crypto?.randomUUID?.() || `repo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      url,
      description,
      favorite: false,
      builtIn: false,
    };
    repositories.unshift(repository);
    const saved = saveRepositories();
    elements.dialog.close();
    elements.search.value = "";
    setFilter("all");
    showToast(saved ? `${name} foi adicionado ao seu espaço.` : `${name} foi adicionado, mas não pôde ser salvo neste navegador.`);
  });

  elements.url.addEventListener("input", clearUrlError);
  elements.name.addEventListener("input", () => elements.name.removeAttribute("aria-invalid"));
  elements.grid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-favorite-id]");
    if (!button) return;
    const repository = repositories.find((item) => item.id === button.dataset.favoriteId);
    if (!repository) return;
    repository.favorite = !repository.favorite;
    saveRepositories();
    render();
    showToast(repository.favorite ? "Adicionado aos favoritos." : "Removido dos favoritos.");
  });

  document.querySelectorAll(".filter-button").forEach((button) => {
    button.addEventListener("click", () => setFilter(button.dataset.filter));
  });
  document.querySelector("#favorites-nav").addEventListener("click", () => {
    setFilter(activeFilter === "favorites" ? "all" : "favorites");
    document.querySelector("#repository-title").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  elements.search.addEventListener("input", render);

  ["#add-repo-button", "#sidebar-add", "#empty-add-button"].forEach((selector) => {
    document.querySelector(selector).addEventListener("click", openDialog);
  });
  document.querySelector("#dialog-close").addEventListener("click", () => elements.dialog.close());
  document.querySelector("#dialog-cancel").addEventListener("click", () => elements.dialog.close());
  elements.dialog.addEventListener("click", (event) => {
    if (event.target === elements.dialog) elements.dialog.close();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const target = event.target;
      const typing = target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if (!typing && !elements.dialog.open) {
        event.preventDefault();
        elements.search.focus();
      }
    }
    if (event.key === "Escape" && elements.dialog.open) elements.dialog.close();
  });

  render();
})();
