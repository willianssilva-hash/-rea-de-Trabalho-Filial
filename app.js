(() => {
  "use strict";

  const STORAGE_KEY = "workspace-repositories-v1";
  const SECTORS = ["Captação", "Monitoramento", "Liberação"];
  const DEFAULT_REPOSITORIES = [
    {
      id: "monitoramento2",
      name: "Painel de Monitoramento",
      sector: "Monitoramento",
      url: "https://willianssilva-hash.github.io/Monitoramento2/",
      description: "Acesse diretamente as informações do Painel de Monitoramento da filial.",
      favorite: false,
      builtIn: true,
    },
  ];
  const TONES = ["blue", "sky", "navy"];

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
    sector: document.querySelector("#repo-sector"),
    sectorError: document.querySelector("#sector-error"),
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
      const savedRepositories = parsed.filter(isValidSavedRepository);
      const normalizedRepositories = savedRepositories.map((repository) => {
        const normalizedRepository = repository.id === "monitoramento2"
          ? {
              ...repository,
              name: DEFAULT_REPOSITORIES[0].name,
              url: DEFAULT_REPOSITORIES[0].url,
              description: DEFAULT_REPOSITORIES[0].description,
              builtIn: true,
            }
          : { ...repository };
        normalizedRepository.sector = SECTORS.includes(repository.sector) ? repository.sector : "Monitoramento";
        return normalizedRepository;
      });
      if (normalizedRepositories.some((repository, index) => repository.sector !== savedRepositories[index].sector)) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedRepositories));
        } catch (migrationError) {
          console.warn("Não foi possível migrar os setores dos repositórios salvos.", migrationError);
        }
      }
      return normalizedRepositories;
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

  function iconForRepository(repository, tone) {
    if (repository.id === "monitoramento2" || /monitoramento|monitoring/i.test(repository.name)) {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 19.5h17M5.5 16V9.5M10 16V5.5M14.5 16v-4M19 16V7"/><path d="m4.5 7.5 5-3 4.5 5 5-3"/></svg>';
    }
    if (tone === "blue") {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/><path d="M9 8h6M9 12h6M9 16h3"/></svg>';
    }
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M3.8 12h16.4M12 3.5c2.1 2.3 3.1 5.1 3.1 8.5s-1 6.2-3.1 8.5c-2.1-2.3-3.1-5.1-3.1-8.5s1-6.2 3.1-8.5Z"/></svg>';
  }

  function iconForAccessButton(name) {
    const normalizedName = String(name)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR");

    const icons = [
      [/estoque|inventario|almoxarifado|armazem|produto/, '<svg class="access-context-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4.4 7.6 7.6 4.3 7.6-4.3M12 12v9m-4.5-15.5 9 5"/></svg>'],
      [/venda|comercial|cliente|crm|pedido/, '<svg class="access-context-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19.5h16M6 16V9m4 7V5m4 11v-4m4 4V7"/><path d="m5 7 5-3 4 4 5-3"/></svg>'],
      [/financ|contab|fatur|pagamento|recebimento|custo|orcamento|caixa/, '<svg class="access-context-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5c-.7-.8-1.7-1.2-3.2-1.2-1.7 0-2.8.8-2.8 2s1.1 1.8 2.8 2.1 2.8.9 2.8 2.2-1.2 2.2-3.1 2.2c-1.5 0-2.7-.5-3.5-1.4M12 5.5v13"/></svg>'],
      [/recursos humanos|equipe|colaborador|funcionario|pessoa|(^|[^a-z])rh([^a-z]|$)/, '<svg class="access-context-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19v-1.2A4.8 4.8 0 0 1 8.3 13h1.4a4.8 4.8 0 0 1 4.8 4.8V19M16 5.2a3.2 3.2 0 0 1 0 6.2M16.7 13h.8a3.8 3.8 0 0 1 3.8 3.8V19"/></svg>'],
      [/logist|transporte|entrega|frete|rota/, '<svg class="access-context-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z"/><circle cx="7.5" cy="18" r="2"/><circle cx="17.5" cy="18" r="2"/></svg>'],
      [/produc|fabrica|operacao|industrial/, '<svg class="access-context-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 20V9l6 3V8l6 4V5h6v15H3Z"/><path d="M7 16h2m3 0h2m3 0h2M17 8h1"/></svg>'],
      [/qualidade|auditoria|compliance|seguranca/, '<svg class="access-context-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 6v5.5c0 4.3-3 7.5-8 9.5-5-2-8-5.2-8-9.5V6l8-3Z"/><path d="m8.5 12 2.3 2.3 4.8-5"/></svg>'],
      [/relatorio|indicador|analitico|analytics|dados|(^|[^a-z])bi([^a-z]|$)/, '<svg class="access-context-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19.5h16M6 16V9m4 7V5m4 11v-4m4 4V7"/></svg>'],
      [/codigo|desenvolvimento|repositorio|(^|[^a-z])git([^a-z]|$)|(^|[^a-z])dev([^a-z]|$)/, '<svg class="access-context-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-12-2 14"/></svg>'],
      [/monitor|controle|torre/, '<svg class="access-context-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4M6 13l3-3 2.5 2.5L17 7"/></svg>'],
      [/painel|dashboard|portal|sistema/, '<svg class="access-context-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg>'],
    ];

    const matchingIcon = icons.find(([pattern]) => pattern.test(normalizedName));
    return matchingIcon
      ? matchingIcon[1]
      : '<svg class="access-context-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg>';
  }

  function createCard(repository, index) {
    const tone = repository.id === "monitoramento2" ? "blue" : TONES[index % TONES.length];
    const name = escapeHTML(repository.name);
    const href = escapeHTML(repository.url);
    const accessLabel = repository.id === "monitoramento2" ? "Torre de Controle Monitoramento" : name;
    const accessIcon = iconForAccessButton(repository.name);
    const accessAriaLabel = repository.id === "monitoramento2"
      ? "Abrir Torre de Controle Monitoramento em uma nova aba"
      : `Abrir ${name} em uma nova aba`;
    const favoriteLabel = repository.favorite
      ? `Remover ${name} dos favoritos`
      : `Adicionar ${name} aos favoritos`;
    const escapedId = escapeHTML(repository.id);
    const moveOptions = SECTORS
      .filter((sector) => sector !== repository.sector)
      .map((sector) => `<button class="repo-action-item" type="button" data-move-id="${escapedId}" data-move-sector="${escapeHTML(sector)}">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 6h12M4 10h8M4 14h6"/><path d="m13 12 3 3 3-3"/></svg>
        <span>${escapeHTML(sector)}</span>
      </button>`)
      .join("");
    const removeAction = repository.builtIn
      ? '<p class="repo-protected-note">O painel padrão é mantido na área de trabalho.</p>'
      : `<button class="repo-action-item repo-remove-item" type="button" data-remove-id="${escapedId}">
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3.5 5.5h13M8 5.5V3.8h4v1.7M6 7.5l.6 9h6.8l.6-9M8.5 8.5v5.5m3-5.5v5.5"/></svg>
          <span>Remover repositório</span>
        </button>`;

    return `
      <article class="repo-card">
        <div class="repo-card-top">
          <div class="repo-icon" data-tone="${tone}">${iconForRepository(repository, tone)}</div>
          <div class="repo-card-actions">
            <button class="favorite-button${repository.favorite ? " is-favorite" : ""}" type="button" data-favorite-id="${escapedId}" aria-label="${favoriteLabel}" aria-pressed="${Boolean(repository.favorite)}">
              <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m10 2.5 2.3 4.66 5.14.75-3.72 3.62.88 5.12L10 14.23l-4.6 2.42.88-5.12-3.72-3.62 5.14-.75L10 2.5Z"/></svg>
            </button>
            <details class="repo-actions-menu">
              <summary class="repo-actions-trigger" aria-label="Opções para ${name}" title="Opções do repositório">
                <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="4" r="1"/><circle cx="10" cy="10" r="1"/><circle cx="10" cy="16" r="1"/></svg>
              </summary>
              <div class="repo-actions-panel">
                <span class="repo-menu-heading">Mover para</span>
                ${moveOptions}
                <div class="repo-menu-divider"></div>
                ${removeAction}
              </div>
            </details>
          </div>
        </div>
        <h3 title="${name}">${name}</h3>
        <a class="open-repo-button primary-access-button" href="${href}" target="_blank" rel="noopener noreferrer" aria-label="${accessAriaLabel}">
          ${accessIcon}
          <span class="access-button-label">${accessLabel}</span>
          <svg class="external-link-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M9 3h4v4M13 3 7 9"/><path d="M11 9v3.5a.5.5 0 0 1-.5.5h-7a.5.5 0 0 1-.5-.5v-7a.5.5 0 0 1 .5-.5H7"/></svg>
        </a>
      </article>`;
  }

  function createSectorGroup(sector, sectorRepositories, showSectorActions) {
    const sectorIndex = SECTORS.indexOf(sector);
    const headingId = `sector-title-${sectorIndex}`;
    const escapedSector = escapeHTML(sector);
    const cards = sectorRepositories.length
      ? `<div class="repo-grid" role="group" aria-label="Repositórios do setor ${escapedSector}">${sectorRepositories.map((repository) => createCard(repository, repositories.indexOf(repository))).join("")}</div>`
      : `<div class="sector-empty">
          <span class="sector-empty-icon" aria-hidden="true">+</span>
          <span>Nenhum repositório neste setor ainda.</span>
          <button class="sector-add-button" type="button" data-add-sector="${escapedSector}" aria-label="Adicionar repositório ao setor ${escapedSector}">Adicionar em ${escapedSector}</button>
        </div>`;
    const addButton = showSectorActions && sectorRepositories.length
      ? `<button class="sector-add-button" type="button" data-add-sector="${escapedSector}" aria-label="Adicionar repositório ao setor ${escapedSector}">
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4v12M4 10h12" /></svg>
          <span>Adicionar</span>
        </button>`
      : "";

    return `<section class="sector-group" aria-labelledby="${headingId}">
      <div class="sector-heading">
        <div class="sector-heading-title">
          <span class="sector-marker" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M4 15.5h12M5.5 13V8m4 5V4.5m4 8.5v-3"/><path d="m4.5 6.5 5-3 4.5 5 3-2"/></svg></span>
          <h3 id="${headingId}">${escapedSector}</h3>
          <span class="sector-count">${sectorRepositories.length}</span>
        </div>
        ${addButton}
      </div>
      ${cards}
    </section>`;
  }

  function render() {
    const query = elements.search.value.trim().toLocaleLowerCase("pt-BR");
    const visibleRepositories = repositories.filter((repository) => {
      if (activeFilter === "favorites" && !repository.favorite) return false;
      const searchContent = `${repository.sector} ${repository.name} ${repository.description || ""} ${repository.url}`;
      return searchContent.toLocaleLowerCase("pt-BR").includes(query);
    });
    const showingAllSectors = activeFilter === "all" && !query;
    const sectorGroups = SECTORS.map((sector) => {
      const sectorRepositories = visibleRepositories.filter((repository) => repository.sector === sector);
      if (sectorRepositories.length === 0 && !showingAllSectors) return "";
      return createSectorGroup(sector, sectorRepositories, showingAllSectors);
    }).join("");

    elements.count.textContent = String(repositories.length).padStart(2, "0");
    elements.sidebarCount.textContent = String(repositories.length);
    elements.grid.innerHTML = sectorGroups;
    elements.grid.hidden = !sectorGroups;
    elements.empty.hidden = visibleRepositories.length > 0 || showingAllSectors;

    if (activeFilter === "favorites" && !query) {
      elements.emptyTitle.textContent = "Seus favoritos aparecem aqui";
      elements.emptyCopy.textContent = "Marque um repositório com a estrela para encontrá-lo rapidamente nesta lista.";
    } else {
      elements.emptyTitle.textContent = "Nenhum repositório encontrado";
      elements.emptyCopy.textContent = query
        ? "Tente buscar por outro nome, descrição ou endereço."
        : "Adicione um repositório à Área de Trabalho Filial para organizar seus acessos.";
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

  function openDialog(sector) {
    elements.form.reset();
    clearSectorError();
    clearUrlError();
    if (SECTORS.includes(sector)) elements.sector.value = sector;
    elements.dialog.showModal();
    window.setTimeout(() => elements.name.focus(), 0);
  }

  function clearSectorError() {
    elements.sectorError.textContent = "";
    elements.sectorError.classList.remove("visible");
    elements.sector.removeAttribute("aria-invalid");
  }

  function showSectorError(message) {
    elements.sectorError.textContent = message;
    elements.sectorError.classList.add("visible");
    elements.sector.setAttribute("aria-invalid", "true");
    elements.sector.focus();
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
    const sector = elements.sector.value;
    const description = elements.description.value.trim();
    const rawUrl = elements.url.value;

    if (!name) {
      elements.name.focus();
      elements.name.setAttribute("aria-invalid", "true");
      return;
    }
    elements.name.removeAttribute("aria-invalid");
    clearSectorError();
    clearUrlError();
    if (!SECTORS.includes(sector)) {
      showSectorError("Selecione o setor deste repositório.");
      return;
    }

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
      sector,
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
    showToast(saved ? `${name} foi adicionado à Área de Trabalho Filial.` : `${name} foi adicionado, mas não pôde ser salvo neste navegador.`);
  });

  elements.url.addEventListener("input", clearUrlError);
  elements.sector.addEventListener("change", clearSectorError);
  elements.name.addEventListener("input", () => elements.name.removeAttribute("aria-invalid"));
  elements.grid.addEventListener("click", (event) => {
    const addButton = event.target.closest("[data-add-sector]");
    if (addButton) {
      openDialog(addButton.dataset.addSector);
      return;
    }
    const moveButton = event.target.closest("[data-move-id]");
    if (moveButton) {
      const repository = repositories.find((item) => item.id === moveButton.dataset.moveId);
      const destination = moveButton.dataset.moveSector;
      if (!repository || !SECTORS.includes(destination) || repository.sector === destination) return;
      const previousSector = repository.sector;
      repository.sector = destination;
      const saved = saveRepositories();
      if (!saved) repository.sector = previousSector;
      render();
      showToast(saved ? `${repository.name} movido para ${destination}.` : "Não foi possível salvar a mudança de setor.");
      return;
    }
    const removeButton = event.target.closest("[data-remove-id]");
    if (removeButton) {
      const repository = repositories.find((item) => item.id === removeButton.dataset.removeId);
      if (!repository) return;
      if (repository.builtIn) {
        showToast("O Painel de Monitoramento padrão não pode ser removido.");
        return;
      }
      if (!window.confirm(`Deseja remover “${repository.name}” da área de trabalho?`)) return;
      const previousRepositories = repositories;
      repositories = repositories.filter((item) => item.id !== repository.id);
      const saved = saveRepositories();
      if (!saved) repositories = previousRepositories;
      render();
      showToast(saved ? `${repository.name} foi removido da área de trabalho.` : "Não foi possível salvar a remoção.");
      return;
    }
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
  document.querySelectorAll(".sector-nav a").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (activeFilter !== "all" || elements.search.value.trim()) {
        event.preventDefault();
        elements.search.value = "";
        setFilter("all");
        window.setTimeout(() => document.querySelector(link.hash)?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
      }
    });
  });

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
