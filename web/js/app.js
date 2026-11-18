/* ==========================================================================
   LANTANA CAFÉ BISTRÓ — Interacción
   Carrito, pedido por WhatsApp, formulario, carrusel y animaciones.
   Sin dependencias externas.
   ========================================================================== */
(function () {
  "use strict";

  const D = window.LANTANA;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const STORAGE_KEY = "lantana-cart-v1";
  const FALLBACK_IMG = "assets/brand/patron.webp";

  /* ---------- Utilidades ---------- */
  const waLink = (text) => `https://wa.me/${D.whatsapp}?text=${encodeURIComponent(text)}`;
  const money = (n) => "Bs " + n.toLocaleString("es-BO");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const icon = (id) => `<svg class="icon" aria-hidden="true"><use href="#i-${id}"/></svg>`;

  /** URL optimizada para Unsplash; las rutas locales se devuelven tal cual. */
  function imgSrc(src, w) {
    return src.includes("images.unsplash.com") ? `${src}?auto=format&fit=crop&w=${w}&q=70` : src;
  }
  function imgSrcset(src, widths) {
    if (!src.includes("images.unsplash.com")) return "";
    return widths.map((w) => `${imgSrc(src, w)} ${w}w`).join(", ");
  }

  function openWhatsApp(text) {
    const url = waLink(text);
    const win = window.open(url, "_blank");
    if (win) win.opener = null;
    else window.location.href = url;
    return url;
  }

  function todayISO() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }

  function prettyDate(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-").map(Number);
    const txt = new Date(y, m - 1, d).toLocaleDateString("es-BO", { weekday: "long", day: "numeric", month: "long" });
    return txt.charAt(0).toUpperCase() + txt.slice(1);
  }

  let toastTimer;
  function toast(html) {
    const el = $("#toast");
    el.innerHTML = html;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  }

  // Si una foto de referencia no carga, mostramos el patrón de marca.
  document.addEventListener("error", (e) => {
    const t = e.target;
    if (t.tagName === "IMG" && !t.dataset.fellBack && !t.src.endsWith(FALLBACK_IMG)) {
      t.dataset.fellBack = "1";
      t.removeAttribute("srcset");
      t.src = FALLBACK_IMG;
    }
  }, true);

  /* ---------- Enlaces de WhatsApp y redes ---------- */
  function wireLinks(root = document) {
    $$("[data-wa]", root).forEach((a) => {
      const key = a.dataset.wa;
      a.href = waLink(D.messages[key] || D.messages.general);
      a.target = "_blank";
      a.rel = "noopener";
    });
    $$("[data-social]", root).forEach((a) => {
      a.href = D[a.dataset.social];
    });
  }

  /* ---------- Header ---------- */
  function initHeader() {
    const header = $("#header");
    const toggle = $(".nav-toggle");
    const nav = $("#main-nav");

    const hero = $("#inicio");
    const onScroll = () => {
      header.classList.toggle("scrolled", window.scrollY > 10);
      document.body.classList.toggle("past-hero", window.scrollY > hero.offsetHeight * 0.6);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const setOpen = (open) => {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
      nav.classList.toggle("open", open);
      document.body.classList.toggle("no-scroll", open);
    };
    toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
    $$("a", nav).forEach((a) => a.addEventListener("click", () => setOpen(false)));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
    window.matchMedia("(min-width: 960px)").addEventListener("change", () => setOpen(false));

    // Enlace activo según la sección visible
    const links = $$(".main-nav ul a");
    const map = new Map(links.map((a) => [a.getAttribute("href").slice(1), a]));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting && map.has(en.target.id)) {
          links.forEach((l) => l.classList.remove("active"));
          map.get(en.target.id).classList.add("active");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    map.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* ---------- Catálogo ---------- */
  function priceLabel(p) {
    if (p.comingSoon) return `<span class="product-price tbc">Muy pronto</span>`;
    const prices = p.options.map((o) => o.price).filter((n) => n != null);
    if (!prices.length) return `<span class="product-price tbc">Precio a confirmar</span>`;
    const min = Math.min(...prices);
    return `<span class="product-price">${prices.length > 1 ? "desde " : ""}${money(min)}</span>`;
  }

  /** Foto del producto según presentación y topping (ver `variants` en data.js). */
  function variantImage(p, optionId, toppingId) {
    const set = (p.variants && p.variants[optionId]) || {};
    // Si el topping no tiene foto propia, mostramos la presentación sin topping
    const hasOwn = Boolean(toppingId && set[toppingId]);
    const src = hasOwn ? set[toppingId] : set["sin-topping"];
    if (!src) return { src: p.img, alt: p.alt };
    const option = p.options.find((o) => o.id === optionId);
    const topping = hasOwn ? D.toppings.find((t) => t.id === toppingId) : null;
    const alt = `${p.name}${option ? ", " + option.label.toLowerCase() : ""}${topping ? ", con topping de " + topping.name.toLowerCase() : ", sin topping"}`;
    return { src, alt };
  }

  /** Presentación elegida al abrir: `defaultOption` (si existe) o la primera. */
  function defaultOpt(p) {
    return p.options.some((o) => o.id === p.defaultOption) ? p.defaultOption : p.options[0].id;
  }

  /** Foto con la que abre el producto: presentación por defecto + topping por defecto. */
  function initialImage(p) {
    const tp = p.toppings && D.toppings.some((t) => t.id === p.defaultTopping) ? p.defaultTopping : "";
    return variantImage(p, defaultOpt(p), tp);
  }

  /** Cambia la foto de una card o ficha para reflejar lo que el cliente eligió. */
  function updateMedia(root) {
    const c = carouselOf(root);
    if (c) {
      // Con carrusel: los botones de presentación y el topping NO cambian la foto;
      // solo hacemos una pausa breve en la rotación.
      holdCarousel(c);
      return;
    }
    const p = D.products.find((x) => x.id === root.dataset.id);
    const img = $("[data-media]", root);
    if (!p || !p.variants || !img) return;
    const selected = $(".opt[aria-checked='true']", root);
    const { src, alt } = variantImage(p, selected ? selected.dataset.opt : defaultOpt(p), $("[data-topping]", root)?.value);
    const target = imgSrc(src, 800);
    if (img.getAttribute("src") === target) return;
    img.classList.add("swapping");
    const pre = new Image();
    pre.onload = pre.onerror = () => {
      delete img.dataset.fellBack;
      img.srcset = imgSrcset(src, [480, 800, 1100]);
      img.src = target;
      img.alt = alt;
      img.classList.remove("swapping");
    };
    pre.src = target;
  }

  /* ---------- Carrusel de fotos por producto ----------
     Cada foto de `variants` (presentación × topping) es una diapositiva.
     Avanza sola cada 3 s de derecha a izquierda y se puede deslizar con el dedo;
     al deslizar a mano se marca la presentación de esa foto. Tras tocarlo, sigue rotando
     a los pocos segundos (la rotación automática no cambia lo que eligió el cliente). */
  const SLIDE_MS = 3000;

  /** Diapositivas del producto, empezando por la foto con la que abre. */
  function slidesFor(p) {
    if (!p.variants) return [];
    // Primero todos los sabores de la presentación inicial (empezando por su topping), luego las demás
    const rotate = (arr, first) => { const k = Math.max(0, arr.indexOf(first)); return arr.slice(k).concat(arr.slice(0, k)); };
    const keys = rotate(["sin-topping", ...D.toppings.map((t) => t.id)], p.toppings && p.defaultTopping ? p.defaultTopping : "sin-topping");
    const options = rotate(p.options, p.options.find((o) => o.id === defaultOpt(p)));
    const out = [];
    const seen = new Set();
    options.forEach((o) => {
      const set = p.variants[o.id];
      if (!set) return;
      keys.forEach((key) => {
        const src = set[key];
        if (!src || seen.has(src)) return;
        seen.add(src);
        const topping = key === "sin-topping" ? "" : key;
        out.push({ option: o.id, topping, src, alt: variantImage(p, o.id, topping).alt });
      });
    });
    return out;
  }

  /** HTML de la foto: carrusel si hay varias, o una sola imagen. */
  function mediaHTML(p, { sizes, widths, width, height, lazy }) {
    const slides = slidesFor(p);
    if (slides.length < 2) {
      const media = initialImage(p);
      return `<img data-media src="${imgSrc(media.src, 800)}" srcset="${imgSrcset(media.src, widths)}" sizes="${sizes}"
               alt="${esc(media.alt)}" width="${width}" height="${height}"${lazy ? ' loading="lazy"' : ""} decoding="async">`;
    }
    const img = (s, i, clone) => `<img src="${imgSrc(s.src, 800)}" srcset="${imgSrcset(s.src, widths)}" sizes="${sizes}"
               alt="${clone ? "" : esc(s.alt)}"${clone ? ' aria-hidden="true"' : ""} width="${width}" height="${height}"
               loading="${i === 0 && !lazy ? "eager" : "lazy"}" decoding="async">`;
    // La copia de la primera foto al final permite que el ciclo siga siempre hacia la izquierda
    return `
      <div class="media-track" data-track>${slides.map((s, i) => img(s, i)).join("")}${img(slides[0], 1, true)}</div>
      <div class="media-dots">${slides.map((s, i) =>
        `<button type="button" data-dot="${i}" aria-label="Ver foto ${i + 1} de ${slides.length}"${i === 0 ? ' aria-current="true"' : ""}></button>`).join("")}</div>`;
  }

  const carousels = [];

  /** El cliente tocó el carrusel o eligió algo: pausa breve y luego sigue rotando.
   *  La rotación automática solo cambia la foto, nunca la presentación ni el topping elegidos. */
  function holdCarousel(c) {
    c.nextAt = Date.now() + SLIDE_MS; // vuelve a contar 3 s desde el último cambio manual
  }
  const carouselOf = (root) => $("[data-track]", root)?._carousel || null;

  function setupCarousel(root, autoplay) {
    const track = $("[data-track]", root);
    if (!track) return null;
    const p = D.products.find((x) => x.id === root.dataset.id);
    const c = {
      root, track, p, slides: slidesFor(p), index: 0,
      stopped: !autoplay || reduceMotion, paused: false, visible: false,
      nextAt: Date.now() + SLIDE_MS + carousels.length * 280, // desfase para que no cambien todas a la vez
      programmatic: false, applyOnSettle: false, settleTimer: 0,
    };
    track._carousel = c;
    track.addEventListener("scroll", () => {
      if (!c.programmatic) holdCarousel(c); // mientras el cliente desliza, no avanzamos
      clearTimeout(c.settleTimer);
      c.settleTimer = setTimeout(() => carouselSettle(c), 110);
    }, { passive: true });
    if (autoplay) {
      // Pausa solo con el mouse encima (en celular el toque no debe dejarlo pausado)
      root.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") c.paused = true; });
      root.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") c.paused = false; });
      carouselIO.observe(track);
      carousels.push(c);
    }
    return c;
  }

  function carouselGo(c, i, { smooth, apply }) {
    const left = i * c.track.clientWidth;
    if (Math.abs(c.track.scrollLeft - left) < 1) {
      c.index = i;
      if (apply) carouselApply(c);
      carouselDots(c);
      return;
    }
    c.programmatic = true;
    c.applyOnSettle = apply;
    c.track.scrollTo({ left, behavior: smooth && !reduceMotion ? "smooth" : "instant" });
  }

  /** Al terminar de moverse: fija la foto actual y, si hace falta, la elección. */
  function carouselSettle(c) {
    const w = c.track.clientWidth;
    if (!w) return;
    let i = Math.round(c.track.scrollLeft / w);
    if (i >= c.slides.length) {
      // Llegamos a la copia de la primera foto: saltamos a la original sin animación
      c.programmatic = true;
      c.track.scrollTo({ left: 0, behavior: "instant" });
      i = 0;
    }
    const byUser = !c.programmatic;
    const apply = byUser || c.applyOnSettle;
    c.programmatic = false;
    c.applyOnSettle = false;
    if (byUser) holdCarousel(c); // el cliente está mirando: esperamos un poco antes de seguir
    c.index = i;
    if (apply) carouselApply(c);
    carouselDots(c);
  }

  /** Marca en la card/ficha la presentación de la foto visible (el topping lo elige solo el cliente). */
  function carouselApply(c) {
    const s = c.slides[c.index];
    if (!s) return;
    const opts = $$(".opt", c.root);
    if (opts.some((o) => o.dataset.opt === s.option)) {
      opts.forEach((o) => o.setAttribute("aria-checked", String(o.dataset.opt === s.option)));
    }
  }

  /** Al elegir topping: la foto no cambia, solo deja de rotar para no mover la presentación elegida. */
  function stopCarousel(root) {
    const c = carouselOf(root);
    if (c) holdCarousel(c);
  }

  function carouselDots(c) {
    $$("[data-dot]", c.root).forEach((d) =>
      d.dataset.dot === String(c.index) ? d.setAttribute("aria-current", "true") : d.removeAttribute("aria-current"));
    // Deja lista la siguiente foto para que no aparezca en blanco
    const next = c.track.children[c.index + 1];
    if (next) next.loading = "eager";
  }

  const carouselIO = new IntersectionObserver((entries) => {
    entries.forEach((en) => { en.target._carousel.visible = en.isIntersecting; });
  }, { threshold: 0.5 });

  // Cada carrusel avanza 3 s después de su último cambio (automático o manual)
  setInterval(() => {
    // Quitamos los carruseles de fichas ya cerradas o reemplazadas
    for (let j = carousels.length - 1; j >= 0; j--) {
      if (!carousels[j].track.isConnected) { carouselIO.unobserve(carousels[j].track); carousels.splice(j, 1); }
    }
    const now = Date.now();
    carousels.forEach((c) => {
      if (c.stopped) return;
      if (document.hidden || c.paused || !c.visible) {
        // En pausa (cursor encima, fuera de pantalla): al volver espera 3 s completos
        c.nextAt = Math.max(c.nextAt, now + SLIDE_MS);
        return;
      }
      if (now < c.nextAt) return;
      c.nextAt = now + SLIDE_MS;
      carouselGo(c, c.index + 1, { smooth: true, apply: false });
    });
  }, 200);

  // En celular el menú se muestra en filas compactas y el detalle se elige en una ficha
  const compactMQ = window.matchMedia("(max-width: 639px)");

  /** Presentación, topping, cantidad y botón de agregar. `prefix` evita ids repetidos. */
  function productConfig(p, prefix) {
    const story = p.story ? `<p class="product-story">${esc(p.story)}</p>` : "";
    // Producto temporalmente no disponible: se ve en el menú pero no se puede pedir
    // Se muestran sus precios (porción / entero) solo como referencia
    if (p.unavailable) {
      const ref = p.options.some((o) => o.price != null)
        ? `<ul class="price-ref" aria-label="Precios de ${esc(p.name)}">
            ${p.options.map((o) => `<li><span>${esc(o.label)}</span><small>${o.price != null ? money(o.price) : "A consultar"}</small></li>`).join("")}
          </ul>`
        : "";
      return `${story}${ref}<p class="soon-note">No disponible por el momento.</p>`;
    }
    if (p.comingSoon) {
      return `${story}<p class="soon-note">Muy pronto disponible para pedir. ¡Estamos preparando algo delicioso!</p>`;
    }
    const opts = p.options.length > 1
      ? `<div class="opt-group" role="radiogroup" aria-label="Presentación de ${esc(p.name)}">
          ${p.options.map((o, i) => `
            <button type="button" class="opt" role="radio" aria-checked="${o.id === defaultOpt(p)}" data-opt="${o.id}">
              <span>${esc(o.label)}</span><small>${o.price != null ? money(o.price) : "A consultar"}</small>
            </button>`).join("")}
        </div>`
      : "";
    const toppings = p.toppings
      ? `<div class="topping-select">
          <label for="tp-${prefix}-${p.id}">Topping (opcional)</label>
          <select id="tp-${prefix}-${p.id}" data-topping>
            <option value="">Sin topping</option>
            ${D.toppings.map((t) => `<option value="${t.id}"${t.id === p.defaultTopping ? " selected" : ""}>${esc(t.name)}</option>`).join("")}
          </select>
        </div>`
      : "";
    return `
      ${story}
      ${opts}
      ${toppings}
      <div class="product-actions">
        <div class="qty" aria-label="Cantidad">
          <button type="button" data-qty="-1" aria-label="Quitar uno">${icon("minus")}</button>
          <output aria-live="polite">1</output>
          <button type="button" data-qty="1" aria-label="Agregar uno">${icon("plus")}</button>
        </div>
        <button type="button" class="btn btn-primary add-btn" data-add>${icon("cart")} Agregar al pedido</button>
      </div>`;
  }

  function badge(p) {
    const text = p.unavailable ? "No disponible" : p.comingSoon ? "Muy pronto" : p.badge;
    return text ? `<span class="product-badge${p.comingSoon || p.unavailable ? " soon" : ""}">${esc(text)}</span>` : "";
  }

  function productCard(p) {
    return `
      <article class="product${p.comingSoon || p.unavailable ? " is-soon" : ""}" data-id="${p.id}" data-category="${p.category}">
        <div class="product-media">
          ${mediaHTML(p, { sizes: "(min-width: 960px) 33vw, (min-width: 640px) 50vw, 120px", widths: [240, 480, 800, 1100], width: 800, height: 680, lazy: true })}
          ${badge(p)}
        </div>
        <div class="product-body">
          <div class="product-top">
            <h3>${esc(p.name)}</h3>
            ${priceLabel(p)}
          </div>
          <p class="product-desc">${esc(p.description)}</p>
          ${p.note ? `<p class="product-note">${esc(p.note)}</p>` : ""}
          <div class="product-config">${productConfig(p, "card")}</div>
        </div>
        ${p.comingSoon || p.unavailable ? "" : `<button type="button" class="product-quick" data-quick aria-label="Agregar ${esc(p.name)} al pedido">${icon("cart")}</button>`}
      </article>`;
  }

  /** Clics dentro de una card o de la ficha. Devuelve true si se agregó al pedido. */
  function handleConfigClick(e, root) {
    const dot = e.target.closest("[data-dot]");
    if (dot) {
      const c = carouselOf(root);
      if (c) { holdCarousel(c); carouselGo(c, Number(dot.dataset.dot), { smooth: true, apply: true }); }
      return false;
    }
    const opt = e.target.closest(".opt");
    if (opt) {
      $$(".opt", root).forEach((o) => o.setAttribute("aria-checked", String(o === opt)));
      updateMedia(root);
      return false;
    }
    const q = e.target.closest("[data-qty]");
    if (q) {
      const out = $("output", root);
      out.value = out.textContent = String(Math.min(50, Math.max(1, Number(out.textContent) + Number(q.dataset.qty))));
      return false;
    }
    const add = e.target.closest("[data-add]");
    if (!add) return false;
    const p = D.products.find((x) => x.id === root.dataset.id);
    const selected = $(".opt[aria-checked='true']", root);
    const optionId = selected ? selected.dataset.opt : defaultOpt(p);
    const topping = $("[data-topping]", root)?.value || "";
    const qty = Number($("output", root).textContent);
    Cart.add(p.id, optionId, topping, qty);

    add.classList.add("added");
    add.innerHTML = `${icon("check")} Agregado`;
    setTimeout(() => { add.classList.remove("added"); add.innerHTML = `${icon("cart")} Agregar al pedido`; }, 1600);
    const out = $("output", root);
    out.value = out.textContent = "1";
    toast(`${icon("check")} ${esc(p.name)} agregado a tu pedido`);
    return true;
  }

  function initCatalog() {
    const grid = $("#product-grid");
    const cats = D.categories.filter((c) => c.id !== "todos" && D.products.some((p) => p.category === c.id));

    // Productos agrupados por categoría
    grid.innerHTML = cats.map((c) => {
      const items = D.products.filter((p) => p.category === c.id);
      return `
        <section class="cat-group" id="cat-${c.id}" aria-labelledby="cat-title-${c.id}">
          <div class="cat-head">
            <h3 class="cat-title" id="cat-title-${c.id}">${esc(c.label)}</h3>
            <span class="cat-count">${items.length} ${items.length === 1 ? "producto" : "productos"}</span>
          </div>
          <div class="product-list">${items.map(productCard).join("")}</div>
        </section>`;
    }).join("");

    $$(".product", grid).forEach((card) => setupCarousel(card, true));

    // Pestañas: llevan a cada categoría y se marcan solas al deslizar
    const nav = $("#filters");
    nav.innerHTML = cats.map((c, i) =>
      `<a class="chip" href="#cat-${c.id}" data-cat="${c.id}"${i === 0 ? ' aria-current="true"' : ""}>${esc(c.label)}</a>`
    ).join("");
    const chips = $$(".chip", nav);
    const setActive = (id) => {
      chips.forEach((c) => (c.dataset.cat === id ? c.setAttribute("aria-current", "true") : c.removeAttribute("aria-current")));
      const chip = chips.find((c) => c.dataset.cat === id);
      if (chip && nav.scrollWidth > nav.clientWidth) {
        nav.scrollTo({ left: chip.offsetLeft - (nav.clientWidth - chip.offsetWidth) / 2, behavior: reduceMotion ? "auto" : "smooth" });
      }
    };
    nav.addEventListener("click", (e) => {
      const a = e.target.closest("[data-cat]");
      if (!a) return;
      e.preventDefault();
      setActive(a.dataset.cat);
      // Dejamos el título de la categoría justo debajo del encabezado y las pestañas fijas
      // (scrollIntoView sumaba dos márgenes y se veía el último producto de la categoría anterior)
      const headerH = $(".site-header, header")?.offsetHeight || 0;
      const navBar = nav.closest(".cat-nav") || nav;
      const top = $(`#cat-${a.dataset.cat}`).getBoundingClientRect().top + window.scrollY - headerH - navBar.offsetHeight - 12;
      window.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) setActive(en.target.id.slice(4)); });
    }, { rootMargin: "-35% 0px -60% 0px" });
    $$(".cat-group", grid).forEach((g) => io.observe(g));
    // Interacción dentro de las cards
    grid.addEventListener("click", (e) => {
      const card = e.target.closest(".product");
      if (!card) return;
      if (compactMQ.matches) {
        // Fila compacta: abre la ficha del producto
        e.preventDefault();
        Sheet.open(card.dataset.id, carouselOf(card));
        return;
      }
      handleConfigClick(e, card);
    });
    grid.addEventListener("change", (e) => {
      if (e.target.matches("[data-topping]")) stopCarousel(e.target.closest(".product"));
    });
  }

  /* ---------- Ficha de producto (celular) ---------- */
  const Sheet = {
    el: null, backdrop: null, lastFocus: null, closeTimer: null,

    init() {
      this.el = $("#product-sheet");
      this.backdrop = $(".sheet-backdrop");
      document.addEventListener("click", (e) => {
        if (e.target.closest("[data-close-sheet]")) this.close();
      });
      this.el.addEventListener("click", (e) => {
        const root = e.target.closest(".sheet-product");
        if (root && handleConfigClick(e, root)) this.closeTimer = setTimeout(() => this.close(), 700);
      });
      this.el.addEventListener("change", (e) => {
        if (e.target.matches("[data-topping]")) stopCarousel(e.target.closest(".sheet-product"));
      });
      document.addEventListener("keydown", (e) => {
        if (!this.isOpen()) return;
        if (e.key === "Escape") this.close();
        if (e.key === "Tab") Drawer.trap.call({ el: this.el }, e);
      });
      compactMQ.addEventListener("change", () => { if (this.isOpen()) this.close(); });
      this.initDrag();
    },
    isOpen() { return this.el.classList.contains("open"); },

    /** Deslizar hacia abajo cierra la ficha (si está arriba del todo). */
    initDrag() {
      const el = this.el;
      let startY = 0, startX = 0, startT = 0, dy = 0, mode = null; // mode: null | "drag" | "ignore"
      el.addEventListener("touchstart", (e) => {
        if (e.touches.length !== 1 || e.target.closest("select, input, textarea")) { mode = "ignore"; return; }
        startY = e.touches[0].clientY;
        startX = e.touches[0].clientX;
        startT = Date.now();
        dy = 0;
        mode = null;
      }, { passive: true });
      el.addEventListener("touchmove", (e) => {
        if (mode === "ignore") return;
        const y = e.touches[0].clientY - startY;
        const x = e.touches[0].clientX - startX;
        if (mode === null) {
          if (Math.abs(x) < 6 && Math.abs(y) < 6) return;
          // Solo arrastramos si el gesto es hacia abajo, vertical y con la ficha arriba del todo
          mode = y > 0 && Math.abs(y) > Math.abs(x) && el.scrollTop <= 0 ? "drag" : "ignore";
          if (mode === "ignore") return;
          el.style.transition = "none";
          this.backdrop.style.transition = "none";
        }
        e.preventDefault();
        dy = Math.max(0, y);
        el.style.transform = `translateY(${dy}px)`;
        this.backdrop.style.opacity = String(Math.max(0, 1 - dy / el.offsetHeight));
      }, { passive: false });
      const end = () => {
        if (mode !== "drag") { mode = null; return; }
        mode = null;
        const fast = dy / Math.max(1, Date.now() - startT) > 0.5;
        el.style.transition = "";
        el.style.transform = "";
        this.backdrop.style.transition = "";
        this.backdrop.style.opacity = "";
        if (dy > 110 || (fast && dy > 30)) this.close();
      };
      el.addEventListener("touchend", end);
      el.addEventListener("touchcancel", end);
    },

    open(id, from) {
      const p = D.products.find((x) => x.id === id);
      if (!p) return;
      clearTimeout(this.closeTimer);
      $("#sheet-body").innerHTML = `
        <div class="sheet-product" data-id="${p.id}">
          <div class="sheet-media">
            ${mediaHTML(p, { sizes: "100vw", widths: [480, 800], width: 800, height: 600, lazy: false })}
            ${badge(p)}
          </div>
          <div class="sheet-content">
            <div class="product-top">
              <h3 id="sheet-title">${esc(p.name)}</h3>
              ${priceLabel(p)}
            </div>
            <p class="product-desc">${esc(p.description)}</p>
            ${p.note ? `<p class="product-note">${esc(p.note)}</p>` : ""}
            ${productConfig(p, "sheet")}
          </div>
        </div>`;
      // La ficha abre en la misma foto (y elección) que se veía en el menú
      const c = setupCarousel($(".sheet-product", this.el), true);
      if (c && from) {
        c.index = from.index;
        carouselApply(c);
        carouselDots(c);
        requestAnimationFrame(() => carouselGo(c, from.index, { smooth: false, apply: true }));
      }
      this.lastFocus = document.activeElement;
      this.el.scrollTop = 0;
      this.backdrop.hidden = false;
      requestAnimationFrame(() => this.backdrop.classList.add("open"));
      this.el.classList.add("open");
      this.el.setAttribute("aria-hidden", "false");
      document.body.classList.add("no-scroll");
      setTimeout(() => this.el.focus({ preventScroll: true }), 60);
    },
    close() {
      clearTimeout(this.closeTimer);
      if (!this.isOpen()) return;
      this.el.classList.remove("open");
      this.el.setAttribute("aria-hidden", "true");
      this.backdrop.classList.remove("open");
      setTimeout(() => (this.backdrop.hidden = true), 400);
      document.body.classList.remove("no-scroll");
      if (this.lastFocus) this.lastFocus.focus({ preventScroll: true });
    },
  };

  function initToppings() {
    $("#topping-list").innerHTML = D.toppings.map((t) => `
      <li class="topping reveal">
        <div class="topping-img">
          <img src="${imgSrc(t.img, 320)}" alt="${esc(t.alt)}" width="320" height="320" loading="lazy" decoding="async">
        </div>
        <h3>${esc(t.name)}</h3>
        <p>${esc(t.note)}</p>
      </li>`).join("");
  }

  /* ---------- Carrito ---------- */
  const Cart = {
    items: [],

    load() {
      try { this.items = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch (_) { this.items = []; }
      // Descarta entradas de productos que ya no existen en el catálogo
      this.items = this.items.filter((i) => this.resolve(i));
    },
    save() {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items)); } catch (_) { /* modo privado */ }
    },
    resolve(item) {
      const product = D.products.find((p) => p.id === item.productId);
      const option = product && product.options.find((o) => o.id === item.optionId);
      if (!product || !option || product.comingSoon || product.unavailable) return null;
      const topping = D.toppings.find((t) => t.id === item.topping) || null;
      return { product, option, topping };
    },
    add(productId, optionId, topping, qty) {
      const key = [productId, optionId, topping].join("|");
      const found = this.items.find((i) => i.key === key);
      if (found) found.qty = Math.min(99, found.qty + qty);
      else this.items.push({ key, productId, optionId, topping, qty });
      this.save();
      render(true);
    },
    setQty(key, qty) {
      const it = this.items.find((i) => i.key === key);
      if (!it) return;
      if (qty <= 0) this.items = this.items.filter((i) => i.key !== key);
      else it.qty = Math.min(99, qty);
      this.save();
      render();
    },
    clear() { this.items = []; this.save(); render(); },
    count() { return this.items.reduce((n, i) => n + i.qty, 0); },
    totals() {
      let total = 0, pending = false;
      this.items.forEach((i) => {
        const r = this.resolve(i);
        if (r.option.price == null) pending = true;
        else total += r.option.price * i.qty;
        if (r.topping && r.topping.price != null) total += r.topping.price * i.qty;
      });
      return { total, pending };
    },
  };

  function lineLabel(r) {
    const parts = [];
    if (r.product.options.length > 1) parts.push(r.option.label);
    if (r.topping) parts.push(`Topping: ${r.topping.name}`);
    return parts.join(" · ");
  }

  function render(bump) {
    const count = Cart.count();
    const { total, pending } = Cart.totals();

    $$("[data-cart-count]").forEach((el) => {
      el.textContent = count;
      if (el.classList.contains("cart-count")) {
        el.hidden = count === 0;
        if (bump && !reduceMotion) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
      }
    });
    $$("[data-cart-word]").forEach((el) => (el.textContent = count === 1 ? "producto" : "productos"));
    $$("[data-cart-total]").forEach((el) => (el.textContent = total || !pending ? money(total) : "A confirmar"));
    $("#cart-pending").hidden = !pending;

    const headerCta = $("[data-header-cta]");
    if (count) {
      headerCta.textContent = `Mi pedido (${count})`;
      headerCta.setAttribute("data-open-cart", "");
    } else {
      headerCta.textContent = "Ver menú";
      headerCta.removeAttribute("data-open-cart");
    }

    const bar = $(".cart-bar");
    bar.hidden = count === 0;
    document.body.classList.toggle("has-cart-bar", count > 0);

    // Lista
    $("#cart-empty").hidden = count > 0;
    $("#cart-items").innerHTML = Cart.items.map((i) => {
      const r = Cart.resolve(i);
      const price = r.option.price != null
        ? `<span class="cart-item-price">${money(r.option.price * i.qty)}</span>`
        : `<span class="cart-item-price tbc">Precio a confirmar</span>`;
      return `
        <li class="cart-item" data-key="${esc(i.key)}">
          <img src="${imgSrc(variantImage(r.product, i.optionId, i.topping).src, 160)}" alt="" width="72" height="72" loading="lazy">
          <div>
            <h3>${esc(r.product.name)}</h3>
            <p class="cart-item-meta">${esc(lineLabel(r)) || "&nbsp;"}</p>
            <div class="qty" aria-label="Cantidad de ${esc(r.product.name)}">
              <button type="button" data-cart-qty="-1" aria-label="Quitar uno">${icon("minus")}</button>
              <output>${i.qty}</output>
              <button type="button" data-cart-qty="1" aria-label="Agregar uno">${icon("plus")}</button>
            </div>
          </div>
          <div class="cart-item-side">
            ${price}
            <button type="button" class="remove-btn" data-remove aria-label="Eliminar ${esc(r.product.name)}">${icon("trash")}</button>
          </div>
        </li>`;
    }).join("");

    $("#cart-next").disabled = count === 0;
    if (count === 0 && Drawer.step === "checkout") Drawer.go("items");
  }

  /* ---------- Drawer del pedido ---------- */
  const Drawer = {
    el: null, backdrop: null, step: "items", lastFocus: null,

    init() {
      this.el = $("#cart");
      this.backdrop = $(".drawer-backdrop");

      // Los enlaces de WhatsApp siempre abren el chat directo (consultas);
      // los pedidos se envían desde el carrito.
      document.addEventListener("click", (e) => {
        if (e.target.closest("[data-open-cart]")) { e.preventDefault(); this.open(); }
        else if (e.target.closest("[data-close-cart]")) this.close();
      });
      document.addEventListener("keydown", (e) => {
        if (!this.el.classList.contains("open")) return;
        if (e.key === "Escape") this.close();
        if (e.key === "Tab") this.trap(e);
      });

      $("#cart-items").addEventListener("click", (e) => {
        const li = e.target.closest(".cart-item");
        if (!li) return;
        const it = Cart.items.find((i) => i.key === li.dataset.key);
        const q = e.target.closest("[data-cart-qty]");
        if (q) Cart.setQty(it.key, it.qty + Number(q.dataset.cartQty));
        if (e.target.closest("[data-remove]")) Cart.setQty(it.key, 0);
      });

      $("#cart-next").addEventListener("click", () => this.go("checkout"));
      $("#cart-back").addEventListener("click", () => this.go("items"));
      $("#cart-new").addEventListener("click", () => { this.go("items"); this.close(); });

      const date = $("#co-date");
      date.min = todayISO();
      $("#checkout-form").addEventListener("submit", (e) => { e.preventDefault(); sendOrder(); });
      $("#checkout-form").addEventListener("input", updatePreview);
      $("#checkout-form").addEventListener("change", updatePreview);
      $$("[data-copy-order]", this.el).forEach((b) => b.addEventListener("click", copyOrder));
    },

    open() {
      this.lastFocus = document.activeElement;
      this.backdrop.hidden = false;
      requestAnimationFrame(() => this.backdrop.classList.add("open"));
      this.el.classList.add("open");
      this.el.setAttribute("aria-hidden", "false");
      document.body.classList.add("no-scroll");
      setTimeout(() => this.el.focus(), 60);
    },
    close() {
      this.el.classList.remove("open");
      this.el.setAttribute("aria-hidden", "true");
      this.backdrop.classList.remove("open");
      setTimeout(() => (this.backdrop.hidden = true), 400);
      document.body.classList.remove("no-scroll");
      if (this.step === "done") this.go("items");
      if (this.lastFocus) this.lastFocus.focus({ preventScroll: true });
    },
    go(step) {
      this.step = step;
      $$("[data-step]", this.el).forEach((s) => (s.hidden = s.dataset.step !== step));
      $("#drawer-foot").hidden = step === "done";
      $("#cart-next").hidden = step !== "items";
      $("#cart-send").hidden = step !== "checkout";
      $("#cart-back").hidden = step !== "checkout";
      $("[data-step-label]").textContent = step === "items" ? "Paso 1 de 2" : step === "checkout" ? "Paso 2 de 2" : "¡Listo!";
      $("#cart-title").textContent = step === "items" ? "Tu pedido" : step === "checkout" ? "Datos de entrega" : "Pedido enviado";
      if (step === "checkout") {
        updatePreview();
        setTimeout(() => $("#co-name").focus({ preventScroll: true }), 120);
      }
    },
    trap(e) {
      const f = $$("a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex='-1'])", this.el)
        .filter((n) => n.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    },
  };

  function validate(fields) {
    let firstBad = null;
    fields.forEach((el) => {
      const bad = !el.value.trim();
      el.classList.toggle("invalid", bad);
      if (bad && !firstBad) firstBad = el;
      el.addEventListener("input", () => el.classList.remove("invalid"), { once: true });
    });
    if (firstBad) { firstBad.focus(); return false; }
    return true;
  }

  function buildOrderMessage(form) {
    const fd = new FormData(form);
    const { total, pending } = Cart.totals();
    const lines = Cart.items.map((i) => {
      const r = Cart.resolve(i);
      const extra = lineLabel(r);
      const price = r.option.price != null ? money(r.option.price * i.qty) : "precio a confirmar";
      return `• ${i.qty} × ${r.product.name}${extra ? ` (${extra})` : ""} — ${price}`;
    });

    const out = [
      "Hola Lantana Café Bistró. Quisiera realizar el siguiente pedido:",
      "",
      "*Detalle del pedido*",
      ...lines,
      "",
      `*Total estimado: ${money(total)}*${pending ? " + productos por confirmar" : ""}`,
      "",
      "*Datos de entrega*",
      `Nombre: ${fd.get("nombre").trim() || "—"}`,
      `Zona de entrega: ${fd.get("zona")}`,
    ];
    if (fd.get("direccion").trim()) out.push(`Dirección / referencia: ${fd.get("direccion").trim()}`);
    out.push(`Fecha de entrega: ${fd.get("fecha") ? prettyDate(fd.get("fecha")) : "a coordinar"}`);
    out.push(`Horario: ${fd.get("horario")}`);
    if (fd.get("notas").trim()) out.push(`Notas: ${fd.get("notas").trim()}`);
    out.push("", "¿Me confirman disponibilidad y costo de delivery? ¡Gracias!");
    return out.join("\n");
  }

  function sendOrder() {
    const form = $("#checkout-form");
    if (!Cart.count()) return;
    if (!validate([$("#co-name")])) return;
    lastOrderText = buildOrderMessage(form);
    const url = openWhatsApp(lastOrderText);
    $("#cart-wa-again").href = url;
    Drawer.go("done");
    // El pedido ya salió: se vacía el carrito y se limpian fecha, horario y notas
    // (nombre y dirección se mantienen para el próximo pedido).
    Cart.clear();
    ["fecha", "horario", "notas"].forEach((n) => {
      const el = form.elements[n];
      el.value = el.tagName === "SELECT" ? el.options[0].value : "";
    });
  }

  let lastOrderText = "";

  function updatePreview() {
    if (Drawer.step !== "checkout" || !Cart.count()) return;
    $("#order-preview").textContent = buildOrderMessage($("#checkout-form"));
  }

  async function copyOrder() {
    const text = Drawer.step === "done" ? lastOrderText : buildOrderMessage($("#checkout-form"));
    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    toast(`${icon("check")} Pedido copiado. Pégalo en el chat de WhatsApp`);
  }

  /* ---------- Pedidos especiales (formulario) ---------- */
  function initContact() {
    const form = $("#contact-form");
    // Solo productos del menú (se actualiza solo al editar data.js)
    $("#cf-product").innerHTML += D.products.map((p) => `<option>${esc(p.name)}</option>`).join("") + `<option>Varios productos</option>`;
    $("#cf-date").min = todayISO();

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!validate([$("#cf-name"), $("#cf-phone"), $("#cf-msg")])) return;
      const fd = new FormData(form);
      const msg = [
        "Hola Lantana Café Bistró. Tengo una consulta sobre un pedido:\n",
        `Nombre: ${fd.get("nombre").trim()}`,
        `WhatsApp: ${fd.get("whatsapp").trim()}`,
        fd.get("producto") ? `Producto de interés: ${fd.get("producto")}` : "",
        fd.get("fecha") ? `Fecha requerida: ${prettyDate(fd.get("fecha"))}` : "",
        `\nMensaje: ${fd.get("mensaje").trim()}`,
      ].filter(Boolean).join("\n");

      const url = openWhatsApp(msg);
      $("#form-wa-again").href = url;
      $("#form-success").hidden = false;
    });

    $("#form-reset").addEventListener("click", () => {
      form.reset();
      $("#form-success").hidden = true;
      $("#cf-name").focus();
    });
  }

  /* ---------- Testimonios ---------- */
  function initCarousel() {
    $("#demo-note").hidden = !D.testimonialsAreDemo;
    const track = $("#carousel-track");
    const dots = $("#carousel-dots");
    track.innerHTML = D.testimonials.map((t, i) => `
      <figure class="quote" role="group" aria-roledescription="testimonio" aria-label="${i + 1} de ${D.testimonials.length}">
        <blockquote><p>${esc(t.quote)}</p></blockquote>
        <figcaption>${esc(t.author)}${t.detail ? " · " + esc(t.detail) : ""}</figcaption>
      </figure>`).join("");
    dots.innerHTML = D.testimonials.map((_, i) =>
      `<button type="button" aria-label="Ver testimonio ${i + 1}" ${i === 0 ? 'aria-current="true"' : ""}></button>`).join("");

    const slides = $$(".quote", track);
    let index = 0;
    const go = (i) => {
      index = (i + slides.length) % slides.length;
      track.scrollTo({ left: slides[index].offsetLeft - track.offsetLeft, behavior: reduceMotion ? "auto" : "smooth" });
    };
    const sync = () => {
      index = Math.round(track.scrollLeft / track.clientWidth);
      $$("button", dots).forEach((d, i) => (i === index ? d.setAttribute("aria-current", "true") : d.removeAttribute("aria-current")));
    };
    track.addEventListener("scroll", () => requestAnimationFrame(sync), { passive: true });
    dots.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (b) go($$("button", dots).indexOf(b));
    });
    $("[data-carousel='prev']").addEventListener("click", () => go(index - 1));
    $("[data-carousel='next']").addEventListener("click", () => go(index + 1));

    if (!reduceMotion) {
      let timer = setInterval(() => go(index + 1), 6500);
      const root = $("#carousel");
      const stop = () => clearInterval(timer);
      const start = () => { stop(); timer = setInterval(() => go(index + 1), 6500); };
      root.addEventListener("mouseenter", stop);
      root.addEventListener("mouseleave", start);
      root.addEventListener("focusin", stop);
      root.addEventListener("touchstart", stop, { passive: true });
    }
  }

  /* ---------- Música de fondo ---------- */
  function initMusic() {
    const cfg = D.music;
    if (!cfg || !cfg.tracks.length) return;
    const audio = $("#bg-music");
    const btn = $("#music-toggle");
    const PREF_KEY = "lantana-music";

    // Pista según la hora del visitante
    const h = new Date().getHours();
    const track = cfg.tracks.find((t) => (t.from < t.to ? h >= t.from && h < t.to : h >= t.from || h < t.to)) || cfg.tracks[0];
    audio.src = track.src;
    $("#music-moment").textContent = track.label;

    let pref = null;
    try { pref = localStorage.getItem(PREF_KEY); } catch (_) { /* sin almacenamiento */ }
    const savePref = (v) => { try { localStorage.setItem(PREF_KEY, v); } catch (_) { /* */ } };

    let wanted = pref !== "off";
    let fadeTimer, labelTimer;
    // iPhone/iPad: Safari no deja controlar el volumen; ahí todo es instantáneo
    const isIOS = /iP(hone|od|ad)/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    /* Fundido de volumen. En iPhone/iPad, Safari no deja cambiar el volumen
       desde la página: si el volumen no responde, se termina al instante.
       También hay un límite de tiempo para que nunca quede colgado. */
    const fade = (target, done) => {
      clearInterval(fadeTimer);
      const startedAt = Date.now();
      const finish = () => {
        clearInterval(fadeTimer);
        try { audio.volume = target; } catch (_) { /* volumen de solo lectura */ }
        if (done) done();
      };
      fadeTimer = setInterval(() => {
        const diff = target - audio.volume;
        if (Math.abs(diff) <= 0.02 || Date.now() - startedAt > 1500) return finish();
        const before = audio.volume;
        try { audio.volume = Math.min(1, Math.max(0, before + Math.sign(diff) * 0.02)); } catch (_) { /* */ }
        if (audio.volume === before) finish(); // el navegador no permite cambiar el volumen
      }, 70);
    };

    const setUI = (on) => {
      btn.classList.toggle("playing", on);
      btn.setAttribute("aria-pressed", String(on));
      btn.setAttribute("aria-label", on ? "Pausar música de fondo" : "Activar música de fondo");
      if (!btn.classList.contains("invite")) $("#music-state").textContent = on ? "Sonando ahora" : "Escuchar";
      if (on) {
        $("#music-state").textContent = "Sonando ahora";
        btn.classList.remove("invite");
        $("#music-moment").textContent = track.label;
      }
    };
    // Mientras no suene, el botón invita a tocarlo (salvo que el visitante la haya apagado)
    if (pref !== "off") {
      btn.classList.add("invite");
      $("#music-state").textContent = "Música de fondo";
      $("#music-moment").textContent = "Toca para escuchar";
    }

    // La apariencia del botón sigue al audio real (no a suposiciones)
    let fadingOut = false;
    audio.addEventListener("play", () => { if (!fadingOut) setUI(true); });
    audio.addEventListener("pause", () => setUI(false));

    const play = () => {
      fadingOut = false;
      clearInterval(fadeTimer);
      audio.muted = false;
      // Si estaba bajando (pausa en curso), sube desde donde iba, sin saltos
      if (!isIOS && audio.paused) { try { audio.volume = 0; } catch (_) { /* */ } }
      return audio.play().then(() => {
        setUI(true);
        if (!isIOS) fade(cfg.volume);
        btn.classList.add("show-label");
        clearTimeout(labelTimer);
        labelTimer = setTimeout(() => btn.classList.remove("show-label"), 4500);
      }).catch(() => setUI(false));
    };
    const pause = () => {
      // El botón cambia al instante; el volumen baja de forma gradual,
      // igual que al empezar. En iPhone (volumen no controlable) se pausa directo.
      setUI(false);
      if (isIOS) {
        clearInterval(fadeTimer);
        fadingOut = false;
        audio.pause();
        return;
      }
      fadingOut = true;
      fade(0, () => {
        if (!fadingOut) return; // se reanudó durante la bajada
        audio.pause();
        fadingOut = false;
      });
    };

    const toggle = () => {
      const sounding = !audio.paused && !audio.muted && !fadingOut;
      if (sounding) { wanted = false; savePref("off"); pause(); }
      else { wanted = true; savePref("on"); play(); }
    };
    // En pantallas táctiles se responde al toque mismo: Safari en iPhone
    // no siempre convierte el toque en "click". preventDefault evita el doble disparo.
    btn.addEventListener("touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggle();
    }, { passive: false });
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggle();
    });

    // Los navegadores bloquean el audio hasta que el visitante interactúa:
    // la música empieza con su primer toque, clic o tecla.
    if (wanted) {
      const events = ["pointerup", "touchend", "keydown", "click"];
      const unlock = (e) => {
        events.forEach((ev) => document.removeEventListener(ev, unlock, true));
        if (e.target.closest && e.target.closest("#music-toggle")) return; // el botón ya decide
        if (wanted && audio.paused) play();
      };
      events.forEach((ev) => document.addEventListener(ev, unlock, true));
      play(); // funciona directo si el navegador ya lo permite
    }

    // Pausa al cambiar de pestaña o abrir WhatsApp; retoma al volver
    let resume = false;
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && !audio.paused) { resume = true; audio.pause(); }
      else if (!document.hidden && resume && wanted) { resume = false; play(); }
    });
  }

  /* ---------- Animaciones al hacer scroll ---------- */
  function initReveal() {
    const els = $$(".reveal");
    if (reduceMotion || !("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target;
        // Escalonado sutil entre hermanos que aparecen juntos
        const siblings = Array.from(el.parentElement.children).filter((c) => c.classList.contains("reveal"));
        el.style.transitionDelay = Math.min(siblings.indexOf(el), 5) * 90 + "ms";
        el.classList.add("in");
        // Al terminar, se libera la transición para que los hovers respondan al instante
        el.addEventListener("transitionend", () => {
          el.classList.remove("reveal", "in");
          el.style.transitionDelay = "";
        }, { once: true });
        io.unobserve(el);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    els.forEach((el) => io.observe(el));
  }

  /* ---------- Inicio ---------- */
  initCatalog();
  initToppings();
  wireLinks();
  initHeader();
  Cart.load();
  Drawer.init();
  Sheet.init();
  render();
  initContact();
  initCarousel();
  initReveal();
  initMusic();
  $("#year").textContent = new Date().getFullYear();
})();
