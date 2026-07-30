/* ============================================================= */
/* EL PORTÓN CAJICÁ — LÓGICA DE LA APP (JS Vanilla)             */
/* ============================================================= */

/* ============================================================= */
/* REGISTRO EN SUPABASE (pedidos + eventos para el panel)        */
/* Fire-and-forget y 100% defensivo: si Supabase falla, no está  */
/* configurado, o la tabla no existe, el cliente NUNCA se entera  */
/* y el flujo de WhatsApp sigue igual. Solo INSERTA (RLS impide   */
/* leer con la anon key; leer es solo para el admin autenticado). */
/* ============================================================= */
window.PortonTrack = (function () {
  const ready = typeof SUPABASE_URL === 'string' && typeof SUPABASE_ANON_KEY === 'string'
                && SUPABASE_URL && SUPABASE_ANON_KEY;
  function post(path, body) {
    if (!ready) return;
    try {
      fetch(SUPABASE_URL + '/rest/v1/' + path, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',   // no intenta leer de vuelta (anon no puede)
        },
        body: JSON.stringify(body),
        keepalive: true,                // sobrevive a la navegación a WhatsApp
      }).catch(() => {});               // silencioso: nunca afecta al cliente
    } catch (e) { /* no-op */ }
  }
  return {
    event: (type, meta) => post('events', { type: type, meta: meta || null }),
    order: (order) => post('orders', order),
  };
})();

/* ============================================================= */
/* COMPONENTE 1: NAVBAR                                          */
/* ============================================================= */
(function initNavbar() {
  const navbar    = document.getElementById('navbar');
  const toggle    = document.getElementById('menu-toggle');
  const closeBtn  = document.getElementById('menu-close');
  const drawer    = document.getElementById('mobile-drawer');
  const overlay   = document.getElementById('mobile-overlay');

  if (!navbar) return;

  /* --- Estado "scrolled": refuerza fondo/blur al bajar --- */
  const onScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // estado inicial correcto al cargar

  /* --- Menú móvil (drawer) --- */
  const openMenu = () => {
    drawer.classList.add('open');
    overlay.classList.add('open');
    toggle.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden'; // bloquea scroll de fondo
  };

  const closeMenu = () => {
    drawer.classList.remove('open');
    overlay.classList.remove('open');
    toggle.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };

  const toggleMenu = () => {
    drawer.classList.contains('open') ? closeMenu() : openMenu();
  };

  if (toggle)   toggle.addEventListener('click', toggleMenu);
  if (closeBtn) closeBtn.addEventListener('click', closeMenu);
  if (overlay)  overlay.addEventListener('click', closeMenu);

  // Cierra al elegir un enlace del drawer
  drawer?.querySelectorAll('a').forEach((link) =>
    link.addEventListener('click', closeMenu)
  );

  // Cierra con tecla Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });
})();


/* ============================================================= */
/* COMPONENTE 2: HERO BANNER                                     */
/* ============================================================= */
(function initHero() {
  const products = (typeof HERO_PRODUCTS !== 'undefined') ? HERO_PRODUCTS : [];
  const elMedia   = document.getElementById('hero-media');
  const elContent = document.getElementById('hero-content');
  const elInd     = document.getElementById('scroll-indicator');
  if (!products.length || !elMedia || !elContent) return;

  /* --- Inyección aleatoria del producto estrella --- */
  // Solo rotan los productos que ya tienen su foto panorámica: el respaldo con
  // emoji desentona al lado de una foto real. En cuanto un producto reciba su
  // `img` entra solo a la rotación, sin tocar código.
  const conFoto = products.filter((p) => p.img || p.video);
  const pool = conFoto.length ? conFoto : products;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  set('hero-tagline', pick.tagline);
  set('hero-title',   pick.title);
  set('hero-desc',    pick.desc);
  set('hero-price',   pick.price);

  // Fondo a pantalla completa: video (si existe) > foto > respaldo con emoji.
  // La ficha "Video en loop" solo aparece cuando el producto realmente trae video.
  elMedia.classList.remove('hero-media--fallback');
  if (pick.video) {
    elMedia.innerHTML = `<video class="hero-photo" autoplay muted loop playsinline ${pick.img ? `poster="${pick.img}"` : ''} src="${pick.video}"></video>
      <span class="hero-video-pill">Video en loop</span>`;
  } else if (pick.img) {
    // srcset: la foto es 21:9 pero el hero la recorta a pantalla completa, así que
    // el navegador la amplía bastante (sobre todo en móvil, que es vertical). Por eso
    // `sizes` declara bastante más de 100vw: es el ancho que la foto ocupa YA ampliada,
    // no el del viewport, y sin eso el navegador pediría la chica y se vería borrosa.
    const srcset = pick.img4k ? ` srcset="${pick.img} 1920w, ${pick.img4k} 3840w" sizes="(max-width: 900px) 460vw, 160vw"` : '';
    // Encuadre del recorte en móvil, ajustado plato por plato (ver --hero-pos-x en el CSS).
    // Solo actúa cuando se usa la foto panorámica (móvil en horizontal); con la
    // versión vertical no hay sobrante que recortar a lo ancho, así que da igual.
    const pos = pick.posMobile ? ` style="--hero-pos-x:${pick.posMobile}"` : '';
    // Móvil en vertical: se sirve una foto compuesta aparte (`-tall`) donde el plato
    // entra COMPLETO. Con la panorámica no hay forma: en una pantalla 9:19.5 solo se
    // ve alto_foto × ratio_pantalla ≈ 753px de ancho, y platos como la pizza (1229px)
    // se salen sí o sí, se recorte por donde se recorte.
    const tall = pick.imgTall
      ? `<source media="(max-width: 900px) and (orientation: portrait)" srcset="${pick.imgTall}">`
      : '';
    elMedia.innerHTML = `<picture>${tall}<img class="hero-photo" src="${pick.img}"${srcset}${pos} alt="${pick.title}"></picture>`;
  } else {
    elMedia.classList.add('hero-media--fallback');
    elMedia.innerHTML = `<span class="hero-media-emoji" aria-hidden="true">${pick.emoji}</span>`;
  }
  elMedia.setAttribute('aria-label', pick.title);

  /* --- Fade del texto y el indicador de scroll (el fondo se queda fijo) --- */
  let ticking = false;
  const update = () => {
    const y = window.scrollY;
    const fade = String(Math.max(0, 1 - y / 500));
    elContent.style.opacity = fade;
    if (elInd) {
      elInd.style.opacity       = y > 200 ? '0' : '1';
      elInd.style.pointerEvents = y > 200 ? 'none' : 'auto';
    }
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  }, { passive: true });
  update();
})();


/* ============================================================= */
/* COMPONENTE 2: PARTÍCULAS + HUMO (canvas, interactivo al mouse) */
/* ============================================================= */
(function initParticles() {
  const canvas = document.getElementById('page-particles');
  const cutoff = document.getElementById('nosotros'); // a partir de aquí: sin partículas
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Heurística simple para gama baja: pocos núcleos o poca RAM (deviceMemory
  // no existe en todos los navegadores — si no está, no penaliza). En esos
  // equipos, menos densidad de partículas/humo y menor resolución de canvas.
  const isLowEnd = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4)
                 || (navigator.deviceMemory && navigator.deviceMemory <= 4);
  const dpr = Math.min(window.devicePixelRatio || 1, isLowEnd ? 1.5 : 2);
  let W = 0, H = 0, raf = null, lastW = 0;
  let particles = [], smoke = [];
  const mouse = { x: -9999, y: -9999, active: false };
  const rand = (min, max) => Math.random() * (max - min) + min;

  function resize() {
    W = Math.max(1, window.innerWidth);
    H = Math.max(1, window.innerHeight);
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function buildParticles() {
    const base = Math.round(Math.min(120, Math.max(60, W / 14)));
    const count = isLowEnd ? Math.round(base * 0.5) : base;
    particles = [];
    for (let i = 0; i < count; i++) {
      const red = Math.random() < 0.18;       // ~18% puntos rojos (variedad)
      particles.push({
        x: rand(0, W), y: rand(0, H),
        r: rand(0.8, 2.6),
        vx: rand(-0.15, 0.15), vy: rand(-0.45, -0.08),
        red,
        gray: Math.floor(rand(130, 220)),
        alpha: red ? rand(0.4, 0.85) : rand(0.25, 0.7),
      });
    }
  }
  function buildSmoke() {
    smoke = [];
    const smokeCount = isLowEnd ? 8 : 16;
    for (let i = 0; i < smokeCount; i++) {
      smoke.push({
        x: rand(0, W), y: rand(0, H),
        r: rand(60, 140),
        vx: rand(-0.18, 0.18), vy: rand(-0.5, -0.14),
        gray: Math.floor(rand(95, 175)),
        alpha: rand(0.05, 0.12),
      });
    }
  }

  function step() {
    ctx.clearRect(0, 0, W, H);

    // --- HUMO (capas suaves de gris, detrás de las partículas) ---
    for (const s of smoke) {
      s.x += s.vx; s.y += s.vy;
      if (mouse.active) {
        const dx = s.x - mouse.x, dy = s.y - mouse.y, d = Math.hypot(dx, dy);
        const SR = 260;
        if (d < SR && d > 0) { const f = (SR - d) / SR * 2.2; s.x += dx / d * f; s.y += dy / d * f; }
      }
      if (s.y + s.r < 0)       { s.y = H + s.r; s.x = rand(0, W); }
      if (s.x < -s.r)          { s.x = W + s.r; }
      else if (s.x > W + s.r)  { s.x = -s.r; }
      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
      g.addColorStop(0, `rgba(${s.gray},${s.gray},${s.gray},${s.alpha})`);
      g.addColorStop(1, `rgba(${s.gray},${s.gray},${s.gray},0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    }

    // --- PARTÍCULAS (puntos de gris que se repelen del cursor) ---
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy;
      if (mouse.active) {
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.hypot(dx, dy);
        const R = 150;
        if (d < R && d > 0) { const f = (R - d) / R * 6; p.x += dx / d * f; p.y += dy / d * f; }
      }
      if (p.y + p.r < 0)       { p.y = H + p.r; p.x = rand(0, W); }
      if (p.x < -p.r)          { p.x = W + p.r; }
      else if (p.x > W + p.r)  { p.x = -p.r; }
      ctx.beginPath();
      ctx.fillStyle = p.red ? `rgba(229,62,62,${p.alpha})` : `rgba(${p.gray},${p.gray},${p.gray},${p.alpha})`;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }

    raf = requestAnimationFrame(step);
  }

  function start() { if (!raf) raf = requestAnimationFrame(step); }
  function stop()  { if (raf) { cancelAnimationFrame(raf); raf = null; } }

  // El canvas es fijo → las coordenadas del mouse son las del viewport
  window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true; }, { passive: true });
  window.addEventListener('mouseout', (e) => { if (!e.relatedTarget) { mouse.active = false; mouse.x = mouse.y = -9999; } });

  // En móvil, el scroll colapsa/expande la barra de direcciones y eso dispara
  // eventos 'resize' en cadena (solo cambia el ALTO). Si regenerásemos las
  // partículas en cada uno, se ve como una explosión disparada hacia arriba
  // (su velocidad vertical siempre es negativa). Por eso solo regeneramos
  // cuando cambia el ANCHO de verdad (resize real / giro de pantalla);
  // el alto se ajusta igual, pero las partículas existentes se conservan.
  function rebuild() {
    const widthChanged = Math.abs(window.innerWidth - lastW) > 40;
    resize();
    if (widthChanged || !particles.length) {
      lastW = W;
      buildParticles();
      buildSmoke();
    }
  }
  window.addEventListener('resize', rebuild);
  rebuild();

  // Corre mientras haya zona de fondo visible (antes de Nosotros); si no, pausa.
  const visible = () => (!cutoff || cutoff.getBoundingClientRect().top > 0);
  const syncRun = () => { (visible() && !document.hidden) ? start() : stop(); };
  window.addEventListener('scroll', syncRun, { passive: true });
  window.addEventListener('resize', syncRun);
  document.addEventListener('visibilitychange', syncRun);
  syncRun(); // estado inicial
})();


/* ============================================================= */
/* COMPONENTE 3 (showcase): CARTA DESTACADA                      */
/* ============================================================= */
(function initCartaDestacada() {
  const data  = (typeof CARTA_DESTACADA !== 'undefined') ? CARTA_DESTACADA : [];
  const extra = (typeof CARTA_DESTACADA_MAS !== 'undefined') ? CARTA_DESTACADA_MAS : [];
  const cont  = document.getElementById('carta-rows');
  if (!data.length || !cont) return;

  function buildRow(p, i, isTeaser) {
    const right = (i % 2 === 1);                // alterna el lado de la foto
    const row = document.createElement('div');
    row.className = 'carta-row'
      + (right ? ' carta-row--right' : '')
      + (isTeaser ? ' carta-row--teaser in-view' : '');  // el teaser no se anima
    row.innerHTML = `
      <div class="carta-photo">
        <div class="carta-photo-card${p.img ? ' is-loading' : ''}">
          <span class="carta-badge">${p.badge}</span>
          ${p.img
            ? `<img class="carta-photo-img" data-menu-id="${p.menuId || ''}" src="${p.img}" alt="${p.title}" loading="lazy" decoding="async" onload="this.parentElement.classList.remove('is-loading')" onerror="this.parentElement.classList.remove('is-loading')">`
            : `<span class="carta-photo-emoji">${p.emoji}</span>`}
        </div>
      </div>
      <div class="carta-text">
        <h3 class="carta-text-title">${p.title}</h3>
        <p class="carta-text-desc">${p.desc}</p>
        <div class="carta-text-actions">
          <span class="carta-price">${p.price}</span>
          ${isTeaser ? '' : '<a href="#menu-catalogo" class="carta-order-btn">Ordenar ahora <span aria-hidden="true">→</span></a>'}
        </div>
      </div>`;
    return row;
  }

  // --- Render inicial (2 platos completos + 1 teaser difuminado) ---
  data.forEach((p, i) => cont.appendChild(buildRow(p, i, i === data.length - 1)));

  // --- Animación de entrada (foto + texto a la vez) basada en scroll ---
  // Reveal por scroll (robusto en todos los entornos): aparece cuando el
  // elemento entra en el 85% inferior del viewport.
  const animated = [
    ...cont.querySelectorAll('.carta-row:not(.carta-row--teaser)'),
    ...document.querySelectorAll('.reveal'),
  ];
  const revealOnScroll = () => {
    const vh = window.innerHeight;
    animated.forEach((el) => {
      if (el.classList.contains('in-view')) return;
      const r = el.getBoundingClientRect();
      if (r.top < vh * 0.85 && r.bottom > 0) el.classList.add('in-view');
    });
  };
  window.addEventListener('scroll', revealOnScroll, { passive: true });
  window.addEventListener('resize', revealOnScroll);
  revealOnScroll(); // estado inicial

  // --- "Ver toda la carta" → expande MÁS PLATOS aquí mismo (no navega) ---
  const btn = document.getElementById('ver-carta-btn');
  if (btn) btn.addEventListener('click', () => {
    // El teaser difuminado se convierte en una fila completa (con su botón)
    const teaserRow = cont.querySelector('.carta-row--teaser');
    if (teaserRow) {
      const lastIndex = data.length - 1;
      const fullRow = buildRow(data[lastIndex], lastIndex, false);
      fullRow.classList.add('in-view');
      teaserRow.replaceWith(fullRow);
    }
    // Se agregan los platos extra, ya visibles (fue un click deliberado)
    extra.forEach((p, j) => {
      const row = buildRow(p, data.length + j, false);
      row.classList.add('in-view');
      cont.appendChild(row);
    });
    btn.hidden = true;
  });
})();


/* ============================================================= */
/* COMPONENTE 3: CATÁLOGO CON FILTROS                           */
/* ============================================================= */
(function initCatalogo() {
  const tabsBox = document.getElementById('catalogo-filtros');
  const grid    = document.getElementById('catalogo-grid');
  if (!tabsBox || !grid || typeof MENU === 'undefined') return;

  const fmt = (n) => '$' + n.toLocaleString('es-CO');
  const priceHTML = (item) => {
    const min = Math.min(...item.options.map((o) => o.price));
    return (item.options.length > 1 ? '<small>Desde</small>' : '') + fmt(min);
  };

  /* Texto del botón: "Personalizar" solo si el plato tiene algo que elegir.
     Una cerveza o un agua no se personalizan, así que ahí dice "Agregar"
     (el PRD contempla los dos textos). El modal se abre igual en ambos casos:
     sirve para la cantidad y las notas. */
  const esPersonalizable = (item) =>
    item.options.length > 1 || !!item.choices || !!item.proteins || !!item.pizza ||
    !!item.slices || !!item.combo || ADICIONES.some((a) => a.cats.includes(item.cat));

  // --- Tabs (sin "Todos"; arranca en la primera categoría) ---
  // Solo se pintan las categorías que tienen algo que mostrar: si el menú en vivo
  // de Supabase todavía no trae una categoría (o se agotó entera), su pestaña no
  // aparece, en vez de abrir una sección vacía. Se repinta con el catálogo.
  function buildTabs() {
    const cats = CATEGORIES.filter((c) => MENU.some((i) => i.cat === c.key && i.available !== false));
    const lista = cats.length ? cats : CATEGORIES;
    if (!lista.some((c) => c.key === currentCat)) currentCat = lista[0].key;
    tabsBox.innerHTML = lista.map((c) =>
      `<button class="filtro-tab${c.key === currentCat ? ' is-active' : ''}" data-cat="${c.key}" role="tab">${c.emoji} ${c.label}</button>`
    ).join('');
  }

  // --- Tarjetas (buildGrid se puede re-ejecutar si el menú se actualiza en vivo
  //     desde Supabase; oculta los productos marcados como no disponibles) ---
  let cards = [];
  function buildGrid() {
    grid.innerHTML = MENU.filter((item) => item.available !== false).map((item) => {
      const media = item.img
        ? `<img class="cat-card-img" data-menu-id="${item.id}" src="${item.img}" alt="${item.name}" loading="lazy" decoding="async" onload="this.parentElement.classList.remove('is-loading')" onerror="this.parentElement.classList.remove('is-loading')">`
        : `<span class="cat-card-emoji">${item.emoji}</span>`;
      const badge = item.badge ? `<span class="cat-card-badge">${item.badge}</span>` : '';
      return `
        <article class="cat-card cat-card--in" data-cat="${item.cat}">
          <div class="cat-card-media${item.img ? ' is-loading' : ''}">${badge}${media}</div>
          <div class="cat-card-body">
            <h3 class="cat-card-title">${item.name}</h3>
            <p class="cat-card-desc">${item.desc}</p>
            <div class="cat-card-foot">
              <span class="cat-card-price">${priceHTML(item)}</span>
              <button class="cat-card-btn" data-id="${item.id}">${esPersonalizable(item) ? 'Personalizar' : 'Agregar'}</button>
            </div>
          </div>
        </article>`;
    }).join('');
    cards = [...grid.querySelectorAll('.cat-card')];
  }
  buildGrid();

  // --- Filtrado + vista colapsada ("Mostrar más") ---
  const LIMIT = 8;               // platos visibles antes de "Mostrar más"
  let currentCat = CATEGORIES[0].key;   // arranca en la primera categoría
  buildTabs();                          // (después de currentCat: lo usa para marcar la activa)
  let expanded = false;
  const fadeEl    = document.getElementById('catalogo-fade');
  const moreWrap  = document.getElementById('catalogo-more');
  const moreBtn   = document.getElementById('catalogo-more-btn');
  const moreLabel = moreBtn ? moreBtn.querySelector('.more-label') : null;
  const descEl    = document.getElementById('catalogo-desc');

  // Descripción de la categoría (solo donde haya CAT_DESC)
  function renderCatDesc(cat) {
    if (!descEl) return;
    const items = (typeof CAT_DESC !== 'undefined') ? CAT_DESC[cat] : null;
    if (!items || !items.length) { descEl.hidden = true; descEl.innerHTML = ''; return; }
    descEl.hidden = false;
    descEl.innerHTML = items.map((d) =>
      `<div class="catdesc-item">
        <span class="catdesc-emoji">${d.emoji}</span>
        <div class="catdesc-text"><h4 class="catdesc-title">${d.title}</h4><p class="catdesc-p">${d.text}</p></div>
      </div>`).join('');
  }

  function applyView() {
    let matchCount = 0;
    cards.forEach((card) => {
      const match = currentCat === 'all' || card.dataset.cat === currentCat;
      if (!match) { card.style.display = 'none'; return; }
      matchCount += 1;
      if (expanded || matchCount <= LIMIT) {
        card.style.display = '';
        card.classList.remove('cat-card--in');
        void card.offsetWidth;          // reflow para reiniciar la animación
        // Entrada escalonada (cascada): cada tarjeta entra 40ms después de la
        // anterior, con tope para que las listas largas no se sientan lentas.
        card.style.animationDelay = Math.min((matchCount - 1) * 40, 320) + 'ms';
        card.classList.add('cat-card--in');
      } else {
        card.style.display = 'none';
      }
    });
    const hasMore = matchCount > LIMIT;
    if (fadeEl)    fadeEl.hidden = !(hasMore && !expanded);
    if (moreWrap)  moreWrap.hidden = !hasMore;
    if (moreLabel) moreLabel.textContent = expanded ? 'Mostrar menos' : 'Mostrar más';
    if (moreBtn)   moreBtn.classList.toggle('is-expanded', expanded);
    renderCatDesc(currentCat);
  }

  tabsBox.addEventListener('click', (e) => {
    const tab = e.target.closest('.filtro-tab');
    if (!tab) return;
    tabsBox.querySelector('.is-active')?.classList.remove('is-active');
    tab.classList.add('is-active');
    tab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    currentCat = tab.dataset.cat;
    expanded = false;             // al cambiar de categoría, colapsa
    applyView();
  });

  // --- Pista "hay más categorías": oculta el degradado al llegar al final ---
  const filtrosFade = document.getElementById('catalogo-filtros-fade');
  if (filtrosFade) {
    const syncFiltrosFade = () => {
      const atEnd = tabsBox.scrollLeft + tabsBox.clientWidth >= tabsBox.scrollWidth - 4;
      filtrosFade.classList.toggle('is-hidden', atEnd);
    };
    tabsBox.addEventListener('scroll', syncFiltrosFade, { passive: true });
    window.addEventListener('resize', syncFiltrosFade);
    syncFiltrosFade();
  }

  if (moreBtn) moreBtn.addEventListener('click', () => {
    expanded = !expanded;
    applyView();
    if (!expanded) document.querySelector('.catalogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  applyView();                    // estado inicial (colapsado)

  // --- Botón "Personalizar" (abre el modal del Bloque 4) ---
  // Delegado en `grid`, así que sobrevive a los re-render de buildGrid().
  grid.addEventListener('click', (e) => {
    const b = e.target.closest('.cat-card-btn');
    if (b) window.openProductModal(b.dataset.id);
  });

  // Permite re-pintar el catálogo cuando el menú se actualiza en vivo
  // (initMenuSync reemplaza MENU y llama a esto), conservando la categoría
  // activa y el estado colapsado/expandido.
  window.rerenderCatalog = () => { buildGrid(); buildTabs(); applyView(); };
})();

/* ============================================================= */
/* MENÚ EN VIVO: el menú de Supabase se FUSIONA con el del código  */
/* Estrategia "stale-while-revalidate": la página ya se pintó al   */
/* instante con el MENU del código (rápido y offline-safe); esto   */
/* corre en segundo plano y, si Supabase responde, mezcla y        */
/* re-pinta. Si falla o está vacía, se queda con el del código.    */
/*                                                                 */
/* Se FUSIONA, no se reemplaza: antes Supabase pisaba el menú      */
/* entero, así que cualquier plato nuevo que se agregara aquí en   */
/* data.js quedaba invisible en la web hasta que el dueño entrara  */
/* al panel a darle "Importar menú actual" (le pasó a las fotos    */
/* del catálogo y a la categoría de bebidas). Ahora:               */
/*   · el CÓDIGO manda en qué platos existen y cómo son por        */
/*     defecto  →  lo nuevo aparece solo, sin importar nada;       */
/*   · SUPABASE manda en lo que el dueño edita desde el panel      */
/*     (precios, descripciones, agotados, fotos)  →  sus cambios   */
/*     siguen ganando, y los platos que cree él también salen.     */
/* OJO: por esto mismo, borrar desde el panel un plato que siga    */
/* en data.js no lo quita de la web (vuelve a salir en la          */
/* siguiente carga). Para esconderlo, "Agotar"; para eliminarlo    */
/* de verdad, hay que quitarlo también del código.                 */
/* ============================================================= */
(async function initMenuSync() {
  if (typeof SUPABASE_URL !== 'string' || !SUPABASE_URL || typeof MENU === 'undefined') return;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);   // no esperar más de 4s
    const res = await fetch(SUPABASE_URL + '/rest/v1/menu_items?select=data,available&order=sort_order.asc', {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return;                              // sin tabla / error → menú del código
    const rows = await res.json();
    if (!Array.isArray(rows) || !rows.length) return; // vacío → menú del código
    const items = rows
      .filter((r) => r && r.data)
      .map((r) => Object.assign({}, r.data, { available: r.available }));
    if (!items.length) return;

    // Se ignoran las claves sin valor que traiga Supabase: si un plato se
    // importó al panel antes de que aquí se le pusiera, por ejemplo, la foto,
    // no debe borrar la que ya tiene el código.
    const conValor = (obj) => {
      const out = {};
      Object.keys(obj).forEach((k) => { if (obj[k] !== undefined && obj[k] !== null) out[k] = obj[k]; });
      return out;
    };

    const remotos = new Map(items.filter((it) => it && it.id).map((it) => [it.id, it]));
    const fusion = [];
    MENU.forEach((base) => {                       // 1) todo lo que existe en el código…
      const r = remotos.get(base.id);
      fusion.push(r ? Object.assign({}, base, conValor(r)) : base);   // …con lo editado en el panel encima
      remotos.delete(base.id);
    });
    remotos.forEach((r) => fusion.push(r));        // 2) y los platos creados desde el panel

    // Se reemplaza el contenido de MENU EN SU LUGAR (misma referencia), para que
    // el modal/carrito (que leen MENU por id) usen los datos frescos.
    MENU.length = 0;
    fusion.forEach((it) => MENU.push(it));
    window.rerenderCatalog?.();
  } catch (e) { /* red caída / abort → se queda con el menú del código */ }
})();

/* Toast simple + stub del modal (se reemplaza en el Bloque 4) */
function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.remove('show'), 2600);
}
/* ============================================================= */
/* CARRITO (estado) — el panel se renderiza en el Bloque 5      */
/* ============================================================= */
let cartState = [];
try { cartState = JSON.parse(localStorage.getItem('porton_cart') || '[]'); } catch (e) { cartState = []; }
function saveCart() {
  localStorage.setItem('porton_cart', JSON.stringify(cartState));
  if (typeof window.renderCart === 'function') window.renderCart();
}
function addToCart(ci) {
  const found = cartState.find((x) => x.hash === ci.hash);
  if (found) found.qty += 1; else cartState.push(ci);
  saveCart();
  window.PortonTrack?.event('add_to_cart', { id: ci.id, name: ci.name });
}

/* Micro-interacción: una miniatura del plato "vuela" desde el botón de
   agregar hasta el carrito flotante (patrón clásico de apps de delivery). */
function flyToCart(fromEl, img, emoji) {
  const fab = document.getElementById('cart-fab');
  if (!fab || !fromEl) return;
  const from = fromEl.getBoundingClientRect();
  const to   = fab.getBoundingClientRect();
  if (!from.width || !to.width) return;   // algo no está visible: no animar

  const el = document.createElement('div');
  el.className = 'fly-to-cart';
  el.innerHTML = img ? `<img src="${img}" alt="">` : `<span>${emoji || '🍔'}</span>`;
  const x0 = from.left + from.width / 2 - 28;
  const y0 = from.top  + from.height / 2 - 28;
  el.style.left = x0 + 'px';
  el.style.top  = y0 + 'px';
  document.body.appendChild(el);

  const dx = (to.left + to.width / 2 - 28) - x0;
  const dy = (to.top  + to.height / 2 - 28) - y0;
  void el.offsetWidth;                     // aplica el estado inicial YA
  el.style.transform = `translate(${dx}px, ${dy}px) scale(0.25)`;
  el.style.opacity   = '0.25';
  el.addEventListener('transitionend', () => el.remove(), { once: true });
  setTimeout(() => el.remove(), 1200);     // red de seguridad si no dispara
}

/* ============================================================= */
/* COMPONENTE 4: MODAL DE PERSONALIZACIÓN                       */
/* ============================================================= */
(function initModal() {
  const overlay  = document.getElementById('modal-overlay');
  const bodyEl   = document.getElementById('modal-body');
  const titleEl  = document.getElementById('modal-title');
  const descEl   = document.getElementById('modal-desc');
  const totalEl  = document.getElementById('modal-total');
  const addBtn   = document.getElementById('modal-add');
  const closeBtn = document.getElementById('modal-close');
  const upsell   = document.getElementById('upsell');
  if (!overlay || !bodyEl) return;

  const fmt = (n) => '$' + n.toLocaleString('es-CO');
  let item = null;
  let pizza = { count: 0, flavors: [] };
  let currentTotal = 0;

  const adicionesFor = (cat) => ADICIONES.filter((a) => a.cats.includes(cat));

  /* ---------- builders de HTML ---------- */
  const optRadio = (group, i, label, price, checked) =>
    `<label class="opt-card">
      <input type="radio" name="${group}" value="${i}" data-price="${price == null ? 0 : price}" ${checked ? 'checked' : ''}>
      <span class="opt-card-label">${label}</span>
      ${price != null ? `<span class="opt-card-price">${fmt(price)}</span>` : ''}
    </label>`;
  const protCard = (type, name) =>
    `<label class="opt-card">
      <input type="${type}" name="prot" value="${name}" class="prot-check">
      <span class="opt-card-label">${name}</span>
    </label>`;
  const adicionCard = (a) =>
    `<label class="opt-card">
      <input type="checkbox" class="adicion-check" data-price="${a.price}" value="${a.name}">
      <span class="opt-card-label">${a.name}</span>
      <span class="opt-card-price">+${fmt(a.price)}</span>
    </label>`;
  const section = (title, inner, cls = '') =>
    `<div class="modal-section ${cls}"><h3 class="modal-section-title">${title}</h3><div class="opt-grid">${inner}</div></div>`;

  /* ---------- círculo de pizza ---------- */
  const polar = (cx, cy, r, deg) => { const a = (deg - 90) * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
  const slice = (cx, cy, r, a0, a1) => {
    const [sx, sy] = polar(cx, cy, r, a0), [ex, ey] = polar(cx, cy, r, a1);
    const large = (a1 - a0) > 180 ? 1 : 0;
    return `M${cx},${cy} L${sx.toFixed(1)},${sy.toFixed(1)} A${r},${r} 0 ${large} 1 ${ex.toFixed(1)},${ey.toFixed(1)} Z`;
  };
  const pizzaRanges = (n) => n === 1 ? [[0, 360]] : n === 2 ? [[0, 180], [180, 360]] : [[270, 450], [90, 180], [180, 270]];
  function pizzaCounts(max) {
    let b = '';
    for (let n = 1; n <= max; n++) b += `<button type="button" class="pizza-count-btn" data-n="${n}">${n} sabor${n > 1 ? 'es' : ''}</button>`;
    return `<p class="modal-section-sub">¿Cuántos sabores quieres?</p><div class="pizza-counts">${b}</div>`;
  }
  function pizzaCircle(n) {
    pizza = { count: n, flavors: new Array(n).fill(null) };
    const cx = 100, cy = 100, r = 92;
    const regs = pizzaRanges(n).map(([a0, a1], i) => {
      const [lx, ly] = n === 1 ? [cx, cy] : polar(cx, cy, r * 0.5, (a0 + a1) / 2);
      const shape = n === 1
        ? `<circle cx="${cx}" cy="${cy}" r="${r}" class="pizza-region" data-i="${i}"/>`
        : `<path d="${slice(cx, cy, r, a0, a1)}" class="pizza-region" data-i="${i}"/>`;
      return { shape, lx, ly, i };
    });
    const svg = `<svg viewBox="0 0 200 200" class="pizza-svg">
      ${regs.map((g) => g.shape).join('')}
      <circle cx="${cx}" cy="${cy}" r="${r}" class="pizza-outline"/>
      ${regs.map((g) => `<text x="${g.lx.toFixed(0)}" y="${g.ly.toFixed(0)}" class="pizza-label" data-i="${g.i}">Elegir</text>`).join('')}
    </svg>`;
    return `<div class="pizza-circle-wrap">
      <button type="button" class="pizza-change">↺ Cambiar cantidad</button>
      ${svg}
      <p class="pizza-hint">Toca cada porción para elegir su sabor</p>
    </div>`;
  }
  function openFlavorPicker(i) {
    const ui = document.getElementById('pizza-ui');
    const modalEl = document.getElementById('modal');
    if (!ui || modalEl.querySelector('.flavor-picker')) return;
    const picker = document.createElement('div');
    picker.className = 'flavor-picker';
    picker.innerHTML = `<div class="flavor-picker-box">
      <p class="flavor-picker-title">Sabor para la porción ${i + 1}</p>
      <div class="flavor-list">${PIZZA_FLAVORS.map((f) => `<button type="button" class="flavor-opt" data-f="${f}">${f}</button>`).join('')}</div>
      <button type="button" class="flavor-cancel">Cancelar</button>
    </div>`;
    modalEl.appendChild(picker);
    picker.addEventListener('click', (e) => {
      const opt = e.target.closest('.flavor-opt');
      if (opt) {
        pizza.flavors[i] = opt.dataset.f;
        const t = ui.querySelector(`.pizza-label[data-i="${i}"]`);
        if (t) t.textContent = opt.dataset.f.length > 12 ? opt.dataset.f.slice(0, 11) + '…' : opt.dataset.f;
        ui.querySelector(`.pizza-region[data-i="${i}"]`)?.classList.add('filled');
        picker.remove();
        return;
      }
      if (e.target.closest('.flavor-cancel') || e.target === picker) picker.remove();
    });
  }

  /* ---------- construir el cuerpo del modal según el plato ---------- */
  function buildBody() {
    let h = '';
    if (item.options.length > 1)
      h += section('Elige una opción', item.options.map((o, i) => optRadio('opt', i, o.label, o.price, i === 0)).join(''));
    if (item.proteins) {
      const type = item.chooseProteins > 1 ? 'checkbox' : 'radio';
      const hint = item.chooseProteins > 1 ? `Elige ${item.chooseProteins} proteínas` : 'Elige la proteína';
      h += section(hint, item.proteins.map((p) => protCard(type, p)).join(''), 'proteins-group');
    }
    if (item.pizza)
      h += `<div class="modal-section"><h3 class="modal-section-title">🍕 Arma tu pizza</h3><div id="pizza-ui">${pizzaCounts(item.maxFlavors)}</div></div>`;
    if (item.slices)
      h += section('🍴 ¿En cuántos trozos?', item.slices.map((s, i) => optRadio('slices', i, s, null, i === 0)).join(''));
    if (item.choices)
      item.choices.forEach((ch, ci) => { h += section(ch.title, ch.options.map((o, i) => optRadio('choice-' + ci, i, o, null, i === 0)).join('')); });
    if (item.combo)
      h += `<div class="modal-section">
        <label class="combo-card">
          <input type="checkbox" id="combo-check">
          <span class="combo-main"><span class="combo-title">¡Hazlo Combo! 🍟🥤</span><span class="combo-sub">Papas a la francesa + bebida</span></span>
          <span class="combo-price">+${fmt(COMBO_PRICE)}</span>
        </label>
        <div id="combo-drinks" class="combo-drinks" hidden>
          <p class="modal-section-sub">Elige tu bebida (400ml)</p>
          <div class="opt-grid">${COMBO_DRINKS.map((d, i) => optRadio('drink', i, d, null, false)).join('')}</div>
        </div>
      </div>`;
    const ad = adicionesFor(item.cat);
    if (ad.length) h += `
      <div class="modal-section">
        <button type="button" class="adiciones-toggle" aria-expanded="false">
          <span class="modal-section-title" style="margin-bottom:0">➕ Adiciones premium</span>
          <svg class="adiciones-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div class="adiciones-body" hidden><div class="opt-grid">${ad.map(adicionCard).join('')}</div></div>
      </div>`;
    h += `<div class="modal-section"><h3 class="modal-section-title">📝 Notas especiales</h3><textarea id="modal-notes" class="modal-notes" rows="2" placeholder="Instrucciones especiales..."></textarea></div>`;
    return h;
  }

  // Marca la selección con una clase (robusto en cualquier navegador,
  // sin depender de la reactividad de :has(:checked))
  function syncSelections() {
    bodyEl.querySelectorAll('.opt-card, .combo-card').forEach((card) => {
      const inp = card.querySelector('input');
      card.classList.toggle('is-selected', !!inp && inp.checked);
    });
  }

  function recalc() {
    const o = bodyEl.querySelector('input[name="opt"]:checked');
    let total = o ? +o.dataset.price : item.options[0].price;
    if (document.getElementById('combo-check')?.checked) total += COMBO_PRICE;
    bodyEl.querySelectorAll('.adicion-check:checked').forEach((c) => { total += +c.dataset.price; });
    currentTotal = total;
    totalEl.textContent = fmt(total);
    syncSelections();
  }

  /* ---------- abrir / cerrar ---------- */
  function open(id) {
    item = MENU.find((p) => p.id === id);
    if (!item) return;
    pizza = { count: 0, flavors: [] };
    titleEl.textContent = item.name;
    descEl.textContent = item.desc;
    bodyEl.innerHTML = buildBody();
    bodyEl.scrollTop = 0;
    recalc();
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function close() {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    upsell.classList.remove('open');
    document.body.style.overflow = '';
  }
  window.openProductModal = open;

  /* ---------- eventos delegados del cuerpo (se enganchan una vez) ---------- */
  bodyEl.addEventListener('change', (e) => {
    if (e.target.id === 'combo-check') {
      const d = document.getElementById('combo-drinks');
      if (d) d.hidden = !e.target.checked;
    }
    if (e.target.classList.contains('prot-check') && e.target.type === 'checkbox') {
      if (bodyEl.querySelectorAll('.prot-check:checked').length > item.chooseProteins) e.target.checked = false;
    }
    recalc();
  });
  bodyEl.addEventListener('click', (e) => {
    const adT = e.target.closest('.adiciones-toggle');
    if (adT) {
      const open = adT.getAttribute('aria-expanded') === 'true';
      adT.setAttribute('aria-expanded', String(!open));
      adT.classList.toggle('open', !open);
      if (adT.nextElementSibling) adT.nextElementSibling.hidden = open;
      return;
    }
    const cnt = e.target.closest('.pizza-count-btn');
    if (cnt) { document.getElementById('pizza-ui').innerHTML = pizzaCircle(+cnt.dataset.n); return; }
    const chg = e.target.closest('.pizza-change');
    if (chg) { pizza = { count: 0, flavors: [] }; document.getElementById('pizza-ui').innerHTML = pizzaCounts(item.maxFlavors); return; }
    const reg = e.target.closest('.pizza-region, .pizza-label');
    if (reg) openFlavorPicker(+reg.dataset.i);
  });

  /* ---------- agregar al pedido ---------- */
  function finalize() {
    const o = bodyEl.querySelector('input[name="opt"]:checked');
    const option = o ? item.options[+o.value].label : item.options[0].label;
    const combo = !!document.getElementById('combo-check')?.checked;
    const drinkInput = bodyEl.querySelector('input[name="drink"]:checked');
    const drink = combo && drinkInput ? COMBO_DRINKS[+drinkInput.value] : null;
    const proteins = item.proteins ? [...bodyEl.querySelectorAll('.prot-check:checked')].map((c) => c.value) : [];
    // Sabores con su porción: 1 sabor = entero · 2 = mitades · 3 = mitad + 2 cuartos
    let flavors = [];
    if (item.pizza) {
      const c = pizza.count;
      pizza.flavors.forEach((fl, i) => {
        if (!fl) return;
        const portion = c === 1 ? '' : (c === 2 ? 'Mitad ' : (i === 0 ? 'Mitad ' : 'Cuarto '));
        flavors.push(portion + fl);
      });
    }
    const sliceInput = item.slices ? bodyEl.querySelector('input[name="slices"]:checked') : null;
    const slice = sliceInput ? item.slices[+sliceInput.value] : '';
    const choices = (item.choices || []).map((ch, k) => {
      const inp = bodyEl.querySelector(`input[name="choice-${k}"]:checked`);
      return inp ? ch.options[+inp.value] : ch.options[0];
    });
    const adiciones = [...bodyEl.querySelectorAll('.adicion-check:checked')].map((c) => ({ name: c.value, price: +c.dataset.price }));
    const notes = (document.getElementById('modal-notes')?.value || '').trim();
    const ci = {
      id: item.id, name: item.name, cat: item.cat, emoji: item.emoji, img: item.img || null,
      option, combo, drink, proteins, flavors, slice, choices, adiciones, notes, unitPrice: currentTotal, qty: 1,
    };
    ci.hash = [ci.id, ci.option, ci.combo, ci.drink, proteins.join('+'), flavors.join('+'), slice, choices.join('+'), adiciones.map((a) => a.name).join('+'), notes].join('|');
    addToCart(ci);
    flyToCart(addBtn, ci.img, ci.emoji);   // miniatura vuela hacia el carrito
    close();
    showToast('✓ Agregado al pedido');
  }

  addBtn.addEventListener('click', () => {
    if (item.proteins && bodyEl.querySelectorAll('.prot-check:checked').length !== item.chooseProteins) {
      showToast(`Elige ${item.chooseProteins} proteína${item.chooseProteins > 1 ? 's' : ''}`);
      return;
    }
    const combo = !!document.getElementById('combo-check')?.checked;
    if (combo && !bodyEl.querySelector('input[name="drink"]:checked')) {
      showToast('Elige la bebida de tu combo 🥤');
      const d = document.getElementById('combo-drinks');
      if (d) { d.classList.add('drinks-error'); d.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => d.classList.remove('drinks-error'), 600); }
      return;
    }
    if (!combo && (item.cat === 'hamburguesas' || item.cat === 'perros')) { upsell.classList.add('open'); return; }
    finalize();
  });

  /* ---------- upsell ---------- */
  document.getElementById('upsell-yes').addEventListener('click', () => {
    upsell.classList.remove('open');
    const cb = document.getElementById('combo-check');
    if (cb) {
      cb.checked = true;
      const d = document.getElementById('combo-drinks');
      if (d) d.hidden = false;
      recalc();
      d?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      showToast('Combo activado — elige tu bebida 🥤');
    }
  });
  document.getElementById('upsell-no').addEventListener('click', () => { upsell.classList.remove('open'); finalize(); });

  /* ---------- cerrar ---------- */
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) {
      if (upsell.classList.contains('open')) upsell.classList.remove('open'); else close();
    }
  });
})();


/* ============================================================= */
/* COMPONENTE 5: CARRITO FLOTANTE + PANEL DE DESPACHO           */
/* ============================================================= */
(function initCart() {
  const fab      = document.getElementById('cart-fab');
  const fabCount = document.getElementById('cart-fab-count');
  const fabTotal = document.getElementById('cart-fab-total');
  const overlay  = document.getElementById('cart-overlay');
  const drawer   = document.getElementById('cart-drawer');
  const closeBtn = document.getElementById('cart-close');
  const itemsEl  = document.getElementById('cart-items');
  const emptyEl  = document.getElementById('cart-empty');
  const emptyBtn = document.getElementById('cart-empty-btn');
  const formEl   = document.getElementById('cart-form');
  const totalEl  = document.getElementById('cart-total');
  const footEl   = document.querySelector('.cart-foot');
  const sendBtn  = document.getElementById('cart-send');
  const cashField= document.getElementById('cash-field');
  if (!fab || !drawer) return;

  const fmt = (n) => '$' + n.toLocaleString('es-CO');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let lastCount = 0;

  function itemDetails(it) {
    const parts = [];
    if (it.option && it.option !== 'Porción') parts.push(it.option);
    if (it.proteins && it.proteins.length) parts.push(it.proteins.join(' + '));
    if (it.flavors && it.flavors.length) parts.push('Sabores: ' + it.flavors.join(', '));
    if (it.slice) parts.push('Trozos: ' + it.slice);
    if (it.choices && it.choices.length) it.choices.forEach((c) => parts.push(c));
    if (it.combo) parts.push('Combo' + (it.drink ? ' · ' + it.drink : ''));
    if (it.adiciones && it.adiciones.length) parts.push(it.adiciones.map((a) => '+ ' + a.name).join(', '));
    if (it.notes) parts.push('Nota: ' + it.notes);
    return parts.join(' · ');
  }

  function itemHTML(it) {
    const media = it.img ? `<img src="${it.img}" alt="">` : esc(it.emoji);
    const details = itemDetails(it);
    return `
      <div class="cart-item">
        <div class="cart-item-media">${media}</div>
        <div class="cart-item-main">
          <div class="cart-item-top">
            <h4 class="cart-item-name">${esc(it.name)}</h4>
            <button class="cart-item-del" data-hash="${esc(it.hash)}" aria-label="Eliminar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg></button>
          </div>
          ${details ? `<p class="cart-item-details">${esc(details)}</p>` : ''}
          <div class="cart-item-bottom">
            <div class="qty">
              <button class="qty-btn" data-act="dec" data-hash="${esc(it.hash)}" aria-label="Quitar uno">−</button>
              <span class="qty-val">${it.qty}</span>
              <button class="qty-btn" data-act="inc" data-hash="${esc(it.hash)}" aria-label="Agregar uno">+</button>
            </div>
            <span class="cart-item-price">${fmt(it.unitPrice * it.qty)}</span>
          </div>
        </div>
      </div>`;
  }

  // Hook usado por saveCart() (definido junto a cartState)
  window.renderCart = function () {
    const count = cartState.reduce((s, i) => s + i.qty, 0);
    const subtotal = cartState.reduce((s, i) => s + i.unitPrice * i.qty, 0);
    fabCount.textContent = count;
    fabCount.style.display = count > 0 ? '' : 'none';
    fabTotal.textContent = fmt(subtotal);
    if (cartState.length) {
      emptyEl.hidden = true;
      formEl.style.display = '';
      footEl.style.display = '';
      itemsEl.innerHTML = cartState.map(itemHTML).join('');
    } else {
      emptyEl.hidden = false;
      formEl.style.display = 'none';
      footEl.style.display = 'none';
      itemsEl.innerHTML = '';
    }
    totalEl.textContent = fmt(subtotal);
    if (count > lastCount) { fab.classList.remove('bump'); void fab.offsetWidth; fab.classList.add('bump'); }
    lastCount = count;
  };

  /* abrir / cerrar */
  const openCart  = () => {
    drawer.classList.add('open'); overlay.classList.add('open'); document.body.style.overflow = 'hidden';
    if (cartState.length) window.PortonTrack?.event('checkout_opened', { items: cartState.length });
  };
  const closeCart = () => { drawer.classList.remove('open'); overlay.classList.remove('open'); document.body.style.overflow = ''; };
  fab.addEventListener('click', openCart);
  closeBtn.addEventListener('click', closeCart);
  overlay.addEventListener('click', closeCart);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && drawer.classList.contains('open')) closeCart(); });
  emptyBtn?.addEventListener('click', () => { closeCart(); document.getElementById('menu-catalogo')?.scrollIntoView({ behavior: 'smooth' }); });

  /* cantidades / eliminar */
  itemsEl.addEventListener('click', (e) => {
    const del = e.target.closest('.cart-item-del');
    if (del) { cartState = cartState.filter((i) => i.hash !== del.dataset.hash); saveCart(); return; }
    const q = e.target.closest('.qty-btn');
    if (q) {
      const it = cartState.find((i) => i.hash === q.dataset.hash);
      if (!it) return;
      if (q.dataset.act === 'inc') it.qty += 1;
      else { it.qty -= 1; if (it.qty <= 0) cartState = cartState.filter((i) => i.hash !== it.hash); }
      saveCart();
    }
  });

  /* Formatea "¿Con cuánto vas a pagar?" con puntos de miles mientras se
     escribe (50000 → 50.000). Solo reordena dígitos, nunca cambia el valor
     real (se quita todo lo que no sea número antes de re-formatear). */
  const cambioInput = formEl.elements.cambio;
  if (cambioInput) {
    cambioInput.addEventListener('input', () => {
      const digits = cambioInput.value.replace(/\D/g, '');
      cambioInput.value = digits ? Number(digits).toLocaleString('es-CO') : '';
    });
  }

  /* formulario: método de pago + persistencia */
  function togglePago() {
    const pago = formEl.querySelector('input[name="pago"]:checked');
    cashField.hidden = !(pago && pago.value === 'Efectivo');
    formEl.querySelectorAll('.pago-opt').forEach((o) => o.classList.toggle('is-selected', o.querySelector('input').checked));
  }
  function saveForm() {
    localStorage.setItem('porton_form', JSON.stringify({
      nombre: formEl.elements.nombre.value,
      telefono: formEl.elements.telefono.value,
      direccion: formEl.elements.direccion.value,
      pago: formEl.querySelector('input[name="pago"]:checked')?.value || '',
      cambio: formEl.elements.cambio.value,
    }));
  }
  function loadForm() {
    let d = {};
    try { d = JSON.parse(localStorage.getItem('porton_form') || '{}'); } catch (e) {}
    if (d.nombre)    formEl.elements.nombre.value = d.nombre;
    if (d.telefono)  formEl.elements.telefono.value = d.telefono;
    if (d.direccion) formEl.elements.direccion.value = d.direccion;
    if (d.cambio)    formEl.elements.cambio.value = d.cambio;
    if (d.pago) { const r = formEl.querySelector(`input[name="pago"][value="${d.pago}"]`); if (r) r.checked = true; }
    togglePago();
  }
  formEl.addEventListener('input', saveForm);
  formEl.addEventListener('change', () => { togglePago(); saveForm(); });

  /* validar + enviar (el motor de WhatsApp es el Bloque 6) */
  function validate() {
    if (!cartState.length) { showToast('Tu pedido está vacío 🛍️'); return false; }
    let ok = true;
    ['nombre', 'telefono', 'direccion'].forEach((k) => {
      const el = formEl.elements[k];
      el.classList.toggle('field-error', !el.value.trim());
      if (!el.value.trim()) ok = false;
    });
    const pago = formEl.querySelector('input[name="pago"]:checked');
    formEl.querySelector('.pago-opts').classList.toggle('field-error', !pago);
    if (!pago) ok = false;
    if (!ok) { showToast('Completa tus datos de envío 📝'); return false; }
    // Consentimiento de datos (Ley 1581) obligatorio para poder enviar
    const consent = formEl.elements.consent;
    const consentWrap = formEl.querySelector('.cart-consent');
    if (consent && !consent.checked) {
      consentWrap?.classList.add('field-error');
      consentWrap?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      showToast('Debes autorizar el tratamiento de datos 🔒');
      return false;
    }
    consentWrap?.classList.remove('field-error');
    // Fuera de horario el pedido va programado: exige elegir día y hora.
    if (typeof window.PortonValidarHorario === 'function' && !window.PortonValidarHorario()) return false;
    return ok;
  }
  sendBtn.addEventListener('click', () => {
    if (!validate()) return;
    if (typeof window.sendOrderWhatsApp === 'function') window.sendOrderWhatsApp();
    else showToast('🟢 Motor de WhatsApp: lo conectamos en el Bloque 6');
  });

  /* init */
  loadForm();
  window.renderCart();
})();


/* ============================================================= */
/* COMPONENTE 6: MOTOR DE WHATSAPP  [WEB-PORTON-CAJICA]         */
/* ============================================================= */
(function initWhatsApp() {
  const fmt = (n) => '$' + n.toLocaleString('es-CO');

  // Lee los datos del formulario de despacho
  function getForm() {
    const f = document.getElementById('cart-form');
    if (!f) return { nombre: '', telefono: '', direccion: '', pago: '', cambio: '' };
    return {
      nombre:    f.elements.nombre.value.trim(),
      telefono:  f.elements.telefono.value.trim(),
      direccion: f.elements.direccion.value.trim(),
      pago:      f.querySelector('input[name="pago"]:checked')?.value || '',
      cambio:    f.elements.cambio.value.trim(),
    };
  }

  // Arma el mensaje del pedido (primera línea = prefijo de rastreo)
  function buildMessage() {
    const div = '━━━━━━━━━━━━━━━━━━';
    /* Si llegó fuera de horario, el cliente eligió para cuándo lo quiere.
       El encabezado lo canta de una para que en cocina no se confunda con
       un pedido para ya. */
    const prog = typeof window.PortonPedidoProgramado === 'function' ? window.PortonPedidoProgramado() : null;
    const L = prog
      ? ['[WEB-PORTON-CAJICA]', '📅 *PEDIDO PROGRAMADO*', `*Para:* ${prog.label}`, div, '']
      : ['[WEB-PORTON-CAJICA]', '🔔 *¡NUEVO PEDIDO RECIBIDO!*', div, ''];

    cartState.forEach((it) => {
      L.push(`• (${it.qty})x ${it.name} — ${fmt(it.unitPrice * it.qty)}`);

      const v = [];
      if (it.option && it.option !== 'Porción') v.push(it.option);
      if (it.proteins && it.proteins.length) v.push(it.proteins.join(' + '));
      let line = v.length ? 'Variación: ' + v.join(' · ') : '';
      if (it.cat === 'hamburguesas' || it.cat === 'perros') {
        line += (line ? ' | ' : '') + 'Combo: ' + (it.combo ? 'Sí' + (it.drink ? ` (${it.drink})` : '') : 'No');
      }
      if (line) L.push('  ↳ ' + line);
      if (it.flavors && it.flavors.length) L.push('  ↳ Sabores: ' + it.flavors.join(', '));
      if (it.slice) L.push('  ↳ Trozos: ' + it.slice);
      if (it.choices && it.choices.length) it.choices.forEach((c) => L.push('  ↳ ' + c));
      if (it.adiciones && it.adiciones.length) L.push('  ↳ Adiciones: ' + it.adiciones.map((a) => a.name).join(', '));
      if (it.notes) L.push('  ↳ Nota: ' + it.notes);
      L.push('');
    });

    const subtotal = cartState.reduce((s, i) => s + i.unitPrice * i.qty, 0);
    L.push(div);
    L.push(`*Subtotal:* ${fmt(subtotal)}`);
    L.push('*Valor Domicilio:* Calculado por el asesor');
    L.push(`*💸 TOTAL A PAGAR:* ${fmt(subtotal)}`);
    L.push('');

    const d = getForm();
    L.push('📦 *DATOS DE DESPACHO*');
    L.push(`*Nombre:* ${d.nombre}`);
    L.push(`*Teléfono:* ${d.telefono}`);
    L.push(`*Dirección:* ${d.direccion}`);
    let pago = `*Método de pago:* ${d.pago}`;
    if (d.pago === 'Efectivo' && d.cambio) pago += ` (paga con ${d.cambio})`;
    L.push(pago);

    return L.join('\n');
  }

  window.buildOrderMessage = buildMessage; // expuesto para verificación

  /* ---------- Freno anti-spam de envíos ----------
     Control del lado del cliente (no es infalible: alguien podría borrar el
     localStorage a mano), pero frena clics repetidos, doble-envío accidental
     y bots simples que no se molestan en editar el navegador. Máximo 4
     pedidos enviados cada 15 minutos por navegador. */
  const ORDER_RATE_LIMIT = { max: 4, windowMs: 15 * 60 * 1000 };
  function checkOrderRateLimit() {
    const key = 'porton_order_times';
    const now = Date.now();
    let times = [];
    try { times = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { times = []; }
    times = times.filter((t) => now - t < ORDER_RATE_LIMIT.windowMs);
    if (times.length >= ORDER_RATE_LIMIT.max) return false;
    times.push(now);
    try { localStorage.setItem(key, JSON.stringify(times)); } catch (e) { /* no-op */ }
    return true;
  }
  window.__testOrderRateLimit = checkOrderRateLimit; // expuesto para verificación

  // Construye el enlace y abre WhatsApp; limpia el carrito tras el envío
  window.sendOrderWhatsApp = function () {
    if (!cartState.length) return;
    if (!checkOrderRateLimit()) {
      showToast('⏳ Ya enviaste varios pedidos seguidos. Espera unos minutos e intenta de nuevo.');
      return;
    }

    // Registrar el pedido en Supabase ANTES de limpiar el carrito
    // (fire-and-forget: si falla, el envío por WhatsApp sigue igual).
    try {
      const d = getForm();
      const subtotal = cartState.reduce((s, i) => s + i.unitPrice * i.qty, 0);
      window.PortonTrack?.order({
        customer_name:    d.nombre,
        customer_phone:   d.telefono,
        customer_address: d.direccion,
        payment_method:   d.pago || null,
        cash_change:      d.cambio || null,
        subtotal:         subtotal,
        items: cartState.map((it) => ({
          id: it.id, name: it.name, cat: it.cat, qty: it.qty, unitPrice: it.unitPrice,
          option: it.option, combo: it.combo, drink: it.drink, proteins: it.proteins,
          flavors: it.flavors, slice: it.slice, choices: it.choices,
          adiciones: it.adiciones, notes: it.notes,
        })),
      });
      window.PortonTrack?.event('order_sent', { items: cartState.length, subtotal: subtotal });
    } catch (e) { /* el registro nunca bloquea el envío */ }

    const url = 'https://api.whatsapp.com/send?phone=' + BRAND.whatsapp +
                '&text=' + encodeURIComponent(buildMessage());
    window.open(url, '_blank');

    // Éxito → limpiar carrito (los datos del cliente se conservan)
    cartState.length = 0;
    saveCart();
    document.getElementById('cart-drawer')?.classList.remove('open');
    document.getElementById('cart-overlay')?.classList.remove('open');
    document.body.style.overflow = '';
    showToast('✅ ¡Pedido enviado! Te llevamos a WhatsApp 🟢');
  };
})();

/* ============================================================= */
/* LIGHTBOX: ver la foto del producto en grande, con animación de   */
/* "apertura" desde la miniatura clickeada (estilo FLIP).           */
/* Delegado en document → funciona con fotos que se agregan después */
/* (tarjetas del catálogo, filas nuevas de "Ver toda la carta").    */
/* ============================================================= */
(function initLightbox() {
  const lightbox    = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const infoEl      = document.getElementById('lightbox-info');
  const closeBtn    = document.getElementById('lightbox-close');
  if (!lightbox || !lightboxImg) return;

  const PHOTO_SELECTOR = '.carta-photo-img, .cat-card-img';
  let lastFocused = null;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* Ficha del producto: SOLO nombre + qué lleva. La idea es ver la foto en   */
  /* grande y al tiempo poder leer qué trae el plato, así que aquí no van     */
  /* precios ni botones (eso ya está en la tarjeta y en el modal de armado).  */
  /*                                                                          */
  /* SIEMPRE se arma buscando el id en el MENU (la foto lleva su              */
  /* `data-menu-id`), nunca por nombre ni por posición: así la descripción    */
  /* que se ve es la de ESE plato y no la de otro parecido. Se resuelve en    */
  /* cada click porque initMenuSync puede haber actualizado el MENU en vivo.  */
  /*                                                                          */
  /* Las frases de detalle se DERIVAN de la data real del producto            */
  /* (opciones, proteínas, sabores, combo) — no hay texto inventado.          */
  function buildInfo(id) {
    if (!id || typeof MENU === 'undefined') return '';
    const item = MENU.find((p) => p.id === id);
    if (!item) return '';

    const cat  = (typeof CATEGORIES !== 'undefined') ? CATEGORIES.find((c) => c.key === item.cat) : null;
    const opts = Array.isArray(item.options) ? item.options : [];
    const lista = (arr) => (arr.length < 2 ? (arr[0] || '')
      : arr.slice(0, -1).join(', ') + ' o ' + arr[arr.length - 1]);

    const detalles = [];
    if (opts.length > 1) {
      const labels = opts.map((o) => o.label);
      detalles.push(item.cat === 'hamburguesas'
        ? `Elige la proteína: ${lista(labels)}.`
        : `Disponible en ${lista(labels)}.`);
    }
    if (Array.isArray(item.proteins) && item.chooseProteins) {
      detalles.push(item.chooseProteins > 1
        ? `Escoge ${item.chooseProteins} proteínas entre ${lista(item.proteins)}.`
        : `Escoge la proteína: ${lista(item.proteins)}.`);
    }
    // Solo si la descripción no lo dice ya (las de pizza suelen incluirlo)
    if (item.pizza && item.maxFlavors && !/sabor/i.test(item.desc || ''))
      detalles.push(`Puedes combinar hasta ${item.maxFlavors} sabores en la misma pizza.`);
    (item.choices || []).forEach((ch) => {
      const o = ch.options || [];
      if (o.length) detalles.push(`Elige: ${lista(o)}.`);
    });
    if (item.combo) detalles.push('Se puede pedir en combo con papas a la francesa y bebida.');

    return `
      ${cat ? `<p class="lb-cat">${cat.emoji} ${esc(cat.label)}</p>` : ''}
      <h3 class="lb-title">${esc(item.name)}</h3>
      <p class="lb-label">Qué lleva</p>
      <p class="lb-desc">${esc(item.desc)}</p>
      ${detalles.length ? `<p class="lb-detalles">${detalles.map(esc).join(' ')}</p>` : ''}`;
  }

  function animateOpen(fromRect) {
    // Arranca superpuesto exactamente sobre la miniatura clickeada...
    const finalRect = lightboxImg.getBoundingClientRect(); // ya centrado por el flex del overlay
    const scaleX = fromRect.width  / finalRect.width;
    const scaleY = fromRect.height / finalRect.height;
    const dx = (fromRect.left + fromRect.width  / 2) - (finalRect.left + finalRect.width  / 2);
    const dy = (fromRect.top  + fromRect.height / 2) - (finalRect.top  + finalRect.height / 2);

    lightboxImg.style.transition = 'none';
    lightboxImg.style.transform  = `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`;
    lightboxImg.style.opacity    = '0.4';
    void lightboxImg.offsetWidth;   // fuerza el reflow: aplica el estado inicial YA
    // ...y ahora sí anima hacia el centro/tamaño final ("se abre").
    lightboxImg.style.transition = 'transform .4s cubic-bezier(0.22, 1, 0.36, 1), opacity .3s ease';
    lightboxImg.style.transform  = 'translate(0, 0) scale(1, 1)';
    lightboxImg.style.opacity    = '1';
  }

  function open(imgEl) {
    const src = imgEl.currentSrc || imgEl.src;
    if (!src) return;
    const fromRect = imgEl.getBoundingClientRect();

    // La ficha se llena ANTES de medir: ocupa ancho y cambia el tamaño final
    // de la foto, del que depende la animación de apertura.
    if (infoEl) {
      const html = buildInfo(imgEl.dataset.menuId);
      infoEl.innerHTML = html;
      infoEl.hidden    = !html;
      infoEl.scrollTop = 0;
    }

    lastFocused = document.activeElement;
    lightboxImg.alt = imgEl.alt || '';
    lightboxImg.src = src;
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    closeBtn.focus();

    const run = () => animateOpen(fromRect);
    if (lightboxImg.complete) run();
    else lightboxImg.onload = run;
  }

  function close() {
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    lightboxImg.style.transition = '';
    lightboxImg.style.transform  = '';
    lightboxImg.style.opacity    = '';
    lastFocused?.focus?.();
  }

  document.addEventListener('click', (e) => {
    const img = e.target.closest(PHOTO_SELECTOR);
    if (img) open(img);
  });
  closeBtn.addEventListener('click', close);
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) close(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox.classList.contains('open')) close();
  });
})();


/* ============================================================= */
/* CURSOR PERSONALIZADO: anillo rojo que sigue al cursor nativo   */
/* Solo en punteros finos (desktop); nunca en táctil.             */
/* ============================================================= */
(function initCursor() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  const ring = document.createElement('div');
  ring.id = 'cursor-ring';
  document.body.appendChild(ring);

  const INTERACTIVE = 'a, button, input, select, textarea, label, .cat-card, .carta-photo-img';
  let visible = false;

  document.addEventListener('mousemove', (e) => {
    ring.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
    if (!visible) { ring.classList.add('is-visible'); visible = true; }
  }, { passive: true });

  document.addEventListener('mouseover', (e) => {
    ring.classList.toggle('is-hover', !!e.target.closest(INTERACTIVE));
  }, { passive: true });

  document.addEventListener('mouseleave', () => {
    ring.classList.remove('is-visible');
    visible = false;
  });
})();


/* ============================================================= */
/* TESTIMONIOS (prueba social) — se renderiza desde TESTIMONIOS   */
/* en data.js; si el array está vacío, la sección no se muestra.  */
/* ============================================================= */
(function initTestimonios() {
  const section = document.getElementById('testimonios');
  const grid    = document.getElementById('testimonios-grid');
  const data    = (typeof TESTIMONIOS !== 'undefined') ? TESTIMONIOS : [];
  if (!section || !grid) return;
  if (!data.length) { section.hidden = true; return; }

  grid.innerHTML = data.map((t) => `
    <article class="testimonio-card">
      <div class="testimonio-stars" aria-label="${t.stars} de 5 estrellas">${'★'.repeat(t.stars)}${'☆'.repeat(5 - t.stars)}</div>
      <p class="testimonio-text">${t.text}</p>
      <div class="testimonio-who">
        <span class="testimonio-avatar" aria-hidden="true">${t.name.trim().charAt(0).toUpperCase()}</span>
        <div>
          <div class="testimonio-name">${t.name}</div>
          <div class="testimonio-src">${t.source || ''}</div>
        </div>
      </div>
    </article>`).join('');
})();


/* Año dinámico del footer */
(function () {
  const y = document.getElementById('footer-year');
  if (y) y.textContent = new Date().getFullYear();
})();


/* ============================================================= */
/* MOTOR DE HORARIO — "¿estamos abiertos AHORA?"                 */
/* ============================================================= */
/* Por qué existe: el visitante que llega a las 11 p.m., arma su  */
/* pedido y lo manda a un WhatsApp que nadie va a contestar es un */
/* cliente perdido DOS veces (no compra hoy y queda con mala      */
/* experiencia). Este módulo sabe la hora real de Cajicá —no la   */
/* del celular del visitante— y alimenta el estado en vivo y la   */
/* programación de pedidos.                                       */
/*                                                                */
/* El caso difícil es "Lunes cerrado, abrimos solo en lunes       */
/* festivos": obliga a conocer el calendario festivo colombiano.  */
/* Se calcula, no se lista a mano, así que sirve para siempre.    */
/* ============================================================= */
window.PortonHorario = (function () {
  const B  = (typeof BUSINESS === 'object' && BUSINESS) ? BUSINESS : null;
  const TZ = (B && B.timeZone) || 'America/Bogota';
  const DAY = 86400000;

  /* ---------- Fecha y hora tal como se viven EN CAJICÁ ----------
     Se leen las partes ya convertidas a la zona del negocio, así el
     estado es idéntico para un visitante en Bogotá, en Madrid o con
     el reloj del celular mal puesto. */
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  function local(date) {
    const p = {};
    dtf.formatToParts(date || new Date()).forEach((x) => { if (x.type !== 'literal') p[x.type] = x.value; });
    let hh = +p.hour;
    if (hh === 24) hh = 0;                 /* algunos motores dan "24" a medianoche */
    const y = +p.year, m = +p.month, d = +p.day, mm = +p.minute;
    return {
      y: y, m: m, d: d, hh: hh, mm: mm,
      mins: hh * 60 + mm,
      dow: new Date(Date.UTC(y, m - 1, d)).getUTCDay(),
    };
  }

  /* ---------- Festivos de Colombia ----------
     Tres familias:
       · Fijos que NO se mueven (Año Nuevo, Trabajo, Independencia…).
       · Fijos que se corren al lunes siguiente (Ley Emiliani 51 de 1983).
       · Móviles atados a la Pascua: Jueves y Viernes Santo (no se mueven)
         y Ascensión / Corpus Christi / Sagrado Corazón (sí se corren).
     La Pascua sale del cómputo gregoriano anónimo (Meeus/Jones/Butcher).
     Todo se hace en UTC para que la aritmética de días sea exacta. */
  function easterUTC(y) {
    const a = y % 19,
          b = Math.floor(y / 100), c = y % 100,
          d = Math.floor(b / 4),   e = b % 4,
          f = Math.floor((b + 8) / 25),
          g = Math.floor((b - f + 1) / 3),
          h = (19 * a + b - d - g + 15) % 30,
          i = Math.floor(c / 4),   k = c % 4,
          l = (32 + 2 * e + 2 * i - h - k) % 7,
          m = Math.floor((a + 11 * h + 22 * l) / 451),
          mes = Math.floor((h + l - 7 * m + 114) / 31),
          dia = ((h + l - 7 * m + 114) % 31) + 1;
    return Date.UTC(y, mes - 1, dia);
  }
  /* Ley Emiliani: el festivo se traslada al lunes siguiente (si ya cae
     lunes, se queda donde está). */
  function aLunes(ms) {
    const w = new Date(ms).getUTCDay();
    return ms + ((8 - w) % 7) * DAY;
  }
  const clave = (ms) => { const x = new Date(ms); return (x.getUTCMonth() + 1) + '-' + x.getUTCDate(); };

  const cacheFestivos = {};
  function festivos(y) {
    if (cacheFestivos[y]) return cacheFestivos[y];
    const s = new Set(['1-1', '5-1', '7-20', '8-7', '12-8', '12-25']);
    /* Fijos que se corren al lunes: Reyes, San José, San Pedro y San Pablo,
       Asunción, Día de la Raza, Todos los Santos, Independencia de Cartagena. */
    [[1, 6], [3, 19], [6, 29], [8, 15], [10, 12], [11, 1], [11, 11]]
      .forEach((md) => s.add(clave(aLunes(Date.UTC(y, md[0] - 1, md[1])))));
    const E = easterUTC(y);
    s.add(clave(E - 3 * DAY));   /* Jueves Santo  */
    s.add(clave(E - 2 * DAY));   /* Viernes Santo */
    /* Ascensión (Pascua+39), Corpus (+60) y Sagrado Corazón (+68) siempre
       corren al lunes siguiente → +43, +64 y +71. */
    [43, 64, 71].forEach((n) => s.add(clave(E + n * DAY)));
    cacheFestivos[y] = s;
    return s;
  }
  function esFestivo(y, m, d) { return festivos(y).has(m + '-' + d); }

  /* ---------- Horario que aplica a un día del calendario ---------- */
  function horarioDe(y, m, d, dow) {
    if (!B || !B.hours) return null;
    const h = B.hours[dow];
    if (h) return h;
    /* Lunes: cerrado, salvo que sea festivo. */
    if (dow === 1 && B.holidayMondayHours && esFestivo(y, m, d)) return B.holidayMondayHours;
    return null;
  }

  const aMin  = (s) => { const p = String(s).split(':'); return (+p[0]) * 60 + (+p[1] || 0); };
  const deMin = (n) => String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');

  /* "13:30" → "1:30 p.m." */
  function hora12(hhmm) {
    const p = String(hhmm).split(':');
    const h = +p[0], m = +p[1] || 0;
    const sufijo = h >= 12 ? 'p.m.' : 'a.m.';
    const h12 = (h % 12) === 0 ? 12 : (h % 12);
    return h12 + ':' + String(m).padStart(2, '0') + ' ' + sufijo;
  }

  const fmtDia = new Intl.DateTimeFormat('es-CO', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
  const capitalizar = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  /* ---------- Días de servicio hacia adelante ----------
     Devuelve descriptores {y,m,d,dow,abre,cierra,ultimaLlamada,esHoy}
     de los próximos días en que sí se atiende. */
  function proximosDias(desde, cuantos) {
    const base = Date.UTC(desde.y, desde.m - 1, desde.d);
    const out = [];
    for (let n = 0; n < 14 && out.length < cuantos; n++) {
      const ms = base + n * DAY;
      const x  = new Date(ms);
      const y = x.getUTCFullYear(), m = x.getUTCMonth() + 1, d = x.getUTCDate(), dow = x.getUTCDay();
      const h = horarioDe(y, m, d, dow);
      if (!h) continue;
      const cierra = aMin(h.close);
      out.push({
        ms: ms, y: y, m: m, d: d, dow: dow,
        abre: aMin(h.open),
        cierra: cierra,
        ultimaLlamada: cierra - ((B && B.lastDeliveryOffsetMin) || 0),
        esHoy: n === 0,
      });
    }
    return out;
  }

  function etiquetaDia(dia, hoy) {
    if (dia.esHoy) return 'hoy';
    const manana = Date.UTC(hoy.y, hoy.m - 1, hoy.d) + DAY;
    if (dia.ms === manana) return 'mañana';
    return capitalizar(fmtDia.format(new Date(dia.ms)).replace(/,/g, ''));
  }

  /* ---------- Estado actual ----------
     fase:
       'abierto'        → atendiendo y tomando domicilios
       'ultima-llamada' → abierto, pero quedan pocos minutos de domicilios
       'sin-domicilio'  → el local sigue abierto, los domicilios ya cerraron
       'cerrado'        → fuera de horario */
  function estado(ahora) {
    const L = local(ahora);
    const hoy = horarioDe(L.y, L.m, L.d, L.dow);
    let fase = 'cerrado', abierto = false, domicilios = false, minutosRestantes = 0, cierraA = '', ultimaLlamadaA = '';

    if (hoy) {
      const abre = aMin(hoy.open), cierra = aMin(hoy.close);
      const ultima = cierra - ((B && B.lastDeliveryOffsetMin) || 0);
      cierraA = hora12(hoy.close);
      ultimaLlamadaA = hora12(deMin(ultima));
      abierto = L.mins >= abre && L.mins < cierra;
      domicilios = L.mins >= abre && L.mins < ultima;
      if (domicilios) {
        minutosRestantes = ultima - L.mins;
        fase = minutosRestantes <= 45 ? 'ultima-llamada' : 'abierto';
      } else if (abierto) {
        fase = 'sin-domicilio';
        minutosRestantes = cierra - L.mins;
      }
    }

    /* Próxima apertura útil para domicilios. */
    let proxima = null;
    const dias = proximosDias(L, 3);
    for (let i = 0; i < dias.length; i++) {
      const dia = dias[i];
      if (dia.esHoy && L.mins >= dia.ultimaLlamada) continue;   /* hoy ya no da tiempo */
      const desde = dia.esHoy ? Math.max(dia.abre, L.mins) : dia.abre;
      proxima = { dia: dia, desdeMin: desde, etiqueta: etiquetaDia(dia, L), hora: hora12(deMin(dia.abre)) };
      break;
    }

    return {
      fase: fase,
      abierto: abierto,
      domicilios: domicilios,
      minutosRestantes: minutosRestantes,
      cierraA: cierraA,
      ultimaLlamadaA: ultimaLlamadaA,
      proxima: proxima,
      local: L,
    };
  }

  /* ---------- Franjas para programar un pedido ----------
     Bloques de 30 minutos desde la próxima apertura hasta la última
     llamada de domicilios, cubriendo los próximos días de servicio. */
  function franjas(maxDias, maxFranjas) {
    const L = local();
    const dias = proximosDias(L, maxDias || 3);
    const out = [];
    for (let i = 0; i < dias.length && out.length < (maxFranjas || 24); i++) {
      const dia = dias[i];
      let t = dia.abre;
      if (dia.esHoy) {
        /* Nunca ofrecer una franja en el pasado: se arranca desde el próximo
           bloque de 30 min con al menos 30 min de margen para cocina. */
        const minimo = L.mins + 30;
        if (minimo > t) t = Math.ceil(minimo / 30) * 30;
      }
      const etiqueta = etiquetaDia(dia, L);
      for (; t <= dia.ultimaLlamada && out.length < (maxFranjas || 24); t += 30) {
        out.push({
          value: dia.y + '-' + String(dia.m).padStart(2, '0') + '-' + String(dia.d).padStart(2, '0') + 'T' + deMin(t),
          label: capitalizar(etiqueta) + ' · ' + hora12(deMin(t)),
          largo: capitalizar(fmtDia.format(new Date(dia.ms)).replace(/,/g, '')) + ', ' + hora12(deMin(t)),
        });
      }
    }
    return out;
  }

  return {
    estado: estado,
    franjas: franjas,
    esFestivo: esFestivo,
    hora12: hora12,
    _local: local,          /* expuesto para verificación */
    _festivos: festivos,    /* expuesto para verificación */
  };
})();


/* ============================================================= */
/* MOTOR DE INGRESOS                                              */
/* ============================================================= */
/* Tres fugas de plata que la web tenía abiertas:                 */
/*                                                                */
/*  1. FUERA DE HORARIO. El que llega cerrado se va y no vuelve.   */
/*     Ahora ve el estado real y puede PROGRAMAR el pedido: la     */
/*     venta se aplaza en vez de perderse.                         */
/*  2. TICKET BAJO. Un pedido de comida rápida sin bebida es       */
/*     dinero que se queda en la mesa. Sugerencia de un toque,     */
/*     solo cuando de verdad falta.                                */
/*  3. CARRITOS ABANDONADOS. El carrito ya sobrevivía en el        */
/*     navegador pero nadie invitaba a volver, y nadie medía       */
/*     cuánta plata se estaba yendo.                               */
/* ============================================================= */
(function initMotorIngresos() {
  const H = window.PortonHorario;
  const fmt = (n) => '$' + Number(n || 0).toLocaleString('es-CO');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const $ = (id) => document.getElementById(id);

  const drawer     = $('cart-drawer');
  const overlay    = $('cart-overlay');
  const sendBtn    = $('cart-send');
  const estadoBox  = $('cart-estado');
  const programar  = $('cart-programar');
  const slotSel    = $('programar-slot');
  const crossell   = $('cart-crossell');
  const nudge      = $('nudge-bar');

  /* OJO: `cartState` se declara con `let` en el ámbito global, así que NO
     es propiedad de `window`. Se lee siempre por el identificador (y en
     cada llamada, porque el carrito se reasigna al borrar ítems). */
  const carrito = () => (typeof cartState !== 'undefined' && cartState) ? cartState : [];
  const subtotalCarrito = () => carrito().reduce((s, i) => s + i.unitPrice * i.qty, 0);

  /* ============================================================ */
  /* 1. ESTADO EN VIVO + PROGRAMACIÓN DE PEDIDOS                  */
  /* ============================================================ */
  let est = H ? H.estado() : null;

  const TEXTOS = {
    'abierto':        (e) => ['on',   'Abierto ahora',        'cierra ' + e.cierraA],
    'ultima-llamada': (e) => ['warn', 'Últimos domicilios',   'quedan ' + e.minutosRestantes + ' min'],
    'sin-domicilio':  (e) => ['warn', 'Domicilios cerrados',  'el local cierra ' + e.cierraA],
    'cerrado':        (e) => ['off',  'Cerrado ahora',        e.proxima ? 'abrimos ' + e.proxima.etiqueta + ' ' + e.proxima.hora : ''],
  };

  function pintarPills() {
    if (!est) return;
    const [tono, titulo, detalle] = (TEXTOS[est.fase] || TEXTOS.cerrado)(est);
    document.querySelectorAll('[data-estado-pill]').forEach((el) => {
      el.className = 'estado-pill estado-' + tono;
      el.innerHTML = '<i class="estado-dot" aria-hidden="true"></i><b>' + esc(titulo) + '</b>' +
                     (detalle ? '<span>· ' + esc(detalle) + '</span>' : '');
      el.hidden = false;
    });
  }

  /* ¿Este pedido va programado? Solo si el bloque de programación está
     visible (o sea: no hay domicilios ahora mismo) y hay franja elegida. */
  function pedidoProgramado() {
    if (!programar || programar.hidden || !slotSel || !slotSel.value) return null;
    const op = slotSel.options[slotSel.selectedIndex];
    return { value: slotSel.value, label: op ? (op.dataset.largo || op.textContent) : slotSel.value };
  }
  window.PortonPedidoProgramado = pedidoProgramado;

  /* El carrito llama a esto antes de enviar (ver validate() del Bloque 5). */
  window.PortonValidarHorario = function () {
    if (programar && !programar.hidden && slotSel && !slotSel.value) {
      programar.classList.add('field-error');
      programar.scrollIntoView({ behavior: 'smooth', block: 'center' });
      showToast('Elige para cuándo quieres tu pedido 📅');
      return false;
    }
    programar?.classList.remove('field-error');
    return true;
  };

  function llenarFranjas() {
    if (!slotSel || !H) return;
    const previo = slotSel.value;
    const f = H.franjas(3, 40);
    slotSel.innerHTML = '<option value="">Elige día y hora…</option>' +
      f.map((x) => '<option value="' + esc(x.value) + '" data-largo="' + esc(x.largo) + '">' + esc(x.label) + '</option>').join('');
    if (previo && f.some((x) => x.value === previo)) slotSel.value = previo;
  }

  function pintarCarrito() {
    if (!est || !estadoBox || !sendBtn) return;
    const programable = est.fase === 'cerrado' || est.fase === 'sin-domicilio';

    if (est.fase === 'abierto') {
      estadoBox.hidden = true;
    } else {
      estadoBox.hidden = false;
      estadoBox.className = 'cart-estado ' + (est.fase === 'cerrado' ? 'is-off' : 'is-warn');
      if (est.fase === 'ultima-llamada') {
        estadoBox.innerHTML = '<b>⏳ Última llamada</b><span>Quedan ' + est.minutosRestantes +
          ' min para pedir domicilio hoy. Envíalo ya y lo alcanzamos.</span>';
      } else if (est.fase === 'sin-domicilio') {
        estadoBox.innerHTML = '<b>🛵 Los domicilios de hoy ya cerraron</b><span>El último salió a las ' +
          esc(est.ultimaLlamadaA) + '. Deja tu pedido programado y lo tenemos listo.</span>';
      } else {
        estadoBox.innerHTML = '<b>🌙 Ahora estamos cerrados</b><span>' +
          /* `hora` ya termina en "p.m." — no se le agrega otro punto detrás. */
          (est.proxima ? 'Abrimos ' + esc(est.proxima.etiqueta) + ' a la ' + esc(est.proxima.hora) +
                         ' Deja tu pedido programado y arrancamos con él.'
                       : 'Escríbenos y te confirmamos el próximo turno.') + '</span>';
      }
    }

    if (programar) {
      const cambio = programar.hidden === programable;   /* pasó de oculto a visible */
      programar.hidden = !programable;
      if (programable && cambio) llenarFranjas();
    }

    sendBtn.innerHTML = programable
      ? '<span aria-hidden="true">📅</span> Programar mi pedido'
      : '<span aria-hidden="true">🟢</span> Enviar pedido por WhatsApp';
  }

  function refrescarEstado() {
    if (!H) return;
    const antes = est ? est.fase : null;
    est = H.estado();
    pintarPills();
    pintarCarrito();
    /* Si cambió de fase mientras el carrito está abierto, se recargan las
       franjas para no ofrecer una hora que ya pasó. */
    if (antes !== est.fase && programar && !programar.hidden) llenarFranjas();
  }

  if (H) {
    pintarPills();
    pintarCarrito();
    setInterval(refrescarEstado, 60000);                     /* el reloj corre solo */
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refrescarEstado(); });
  }

  /* ============================================================ */
  /* 2. CROSS-SELL DEL CARRITO                                    */
  /* ============================================================ */
  /* Construye un ítem de carrito idéntico al que produciría el modal
     de personalización (mismo `hash`), para que si el cliente ya tenía
     ese producto se sume la cantidad en vez de duplicar la línea. */
  function itemDeProducto(cfg) {
    if (typeof MENU === 'undefined') return null;
    const p = MENU.find((x) => x.id === cfg.id);
    if (!p || !p.options || !p.options.length) return null;
    const opt = p.options.find((o) => o.label === cfg.option) || p.options[0];
    const choices = (p.choices || []).map((ch, k) => (cfg.choices && cfg.choices[k]) || ch.options[0]);
    const ci = {
      id: p.id, name: p.name, cat: p.cat, emoji: p.emoji, img: p.img || null,
      option: opt.label, combo: false, drink: null, proteins: [], flavors: [], slice: '',
      choices: choices, adiciones: [], notes: '', unitPrice: opt.price, qty: 1,
    };
    ci.hash = [ci.id, ci.option, ci.combo, ci.drink, '', '', '', choices.join('+'), '', ''].join('|');
    return ci;
  }

  function sugerencias() {
    const cart = carrito();
    if (!cart.length || typeof CROSS_SELL === 'undefined') return null;

    const platos  = cart.filter((it) => it.cat !== 'bebidas').reduce((s, i) => s + i.qty, 0);
    /* Un combo ya trae bebida incluida: cuenta como bebida servida. */
    const bebidas = cart.reduce((s, it) => s + (it.cat === 'bebidas' ? it.qty : 0) + (it.combo ? it.qty : 0), 0);

    if (platos === 0) {
      /* Solo bebidas en el carrito → proponer los platos insignia. */
      const items = (CROSS_SELL.platos || [])
        .map((id) => (typeof MENU !== 'undefined' ? MENU.find((p) => p.id === id) : null))
        .filter(Boolean)
        .filter((p) => !cart.some((it) => it.id === p.id))
        .slice(0, 3)
        .map((p) => ({
          tipo: 'plato', id: p.id, emoji: p.emoji, img: p.img,
          nombre: p.name, precio: Math.min.apply(null, p.options.map((o) => o.price)), desde: p.options.length > 1,
        }));
      return items.length ? { titulo: '🍔 ¿Y para acompañar?', items: items } : null;
    }

    if (platos > bebidas) {
      const items = (CROSS_SELL.bebidas || [])
        .map(itemDeProducto)
        .filter(Boolean)
        .filter((ci) => !cart.some((it) => it.hash === ci.hash))
        .slice(0, 3)
        .map((ci) => ({
          tipo: 'bebida', ci: ci, emoji: ci.emoji, img: ci.img,
          nombre: ci.name + (ci.option && ci.option !== 'Porción' ? ' ' + ci.option : ''),
          precio: ci.unitPrice, desde: false,
        }));
      return items.length ? { titulo: '🥤 Te falta con qué pasarla', items: items } : null;
    }
    return null;
  }

  function pintarCrossell() {
    if (!crossell) return;
    const s = sugerencias();
    if (!s) { crossell.hidden = true; crossell.innerHTML = ''; return; }
    crossell.hidden = false;
    crossell.innerHTML =
      '<p class="crossell-title">' + esc(s.titulo) + '</p>' +
      '<div class="crossell-row">' + s.items.map((x, i) =>
        '<button type="button" class="crossell-chip" data-i="' + i + '">' +
          '<span class="crossell-media">' + (x.img ? '<img src="' + esc(x.img) + '" alt="" loading="lazy">' : esc(x.emoji || '🍽️')) + '</span>' +
          '<span class="crossell-name">' + esc(x.nombre) + '</span>' +
          '<span class="crossell-price">' + (x.desde ? 'desde ' : '') + fmt(x.precio) + '</span>' +
          '<span class="crossell-add" aria-hidden="true">+</span>' +
        '</button>').join('') +
      '</div>';
    crossell._items = s.items;
  }

  crossell?.addEventListener('click', (e) => {
    const chip = e.target.closest('.crossell-chip');
    if (!chip || !crossell._items) return;
    const x = crossell._items[+chip.dataset.i];
    if (!x) return;
    if (x.tipo === 'plato') {
      /* Los platos se personalizan (proteína, combo, adiciones): abre el modal. */
      drawer?.classList.remove('open');
      overlay?.classList.remove('open');
      document.body.style.overflow = '';
      window.openProductModal?.(x.id);
      window.PortonTrack?.event('crossell_click', { id: x.id, tipo: 'plato' });
      return;
    }
    /* Las bebidas no tienen nada que elegir: entran de un toque. */
    addToCart(JSON.parse(JSON.stringify(x.ci)));
    flyToCart(chip, x.ci.img, x.ci.emoji);
    showToast('✓ ' + x.nombre + ' agregada');
    window.PortonTrack?.event('crossell_added', { id: x.ci.id, precio: x.ci.unitPrice });
  });

  /* ============================================================ */
  /* 3. RECUPERACIÓN DEL PEDIDO + RESEÑAS                         */
  /* ============================================================ */
  const K = {
    ts:       'porton_cart_ts',
    pedido:   'porton_last_order',
    resena:   'porton_review_asked',
    abandono: 'porton_abandon_sent',
  };
  const leer = (k, s) => { try { return (s ? sessionStorage : localStorage).getItem(k); } catch (e) { return null; } };
  const guardar = (k, v, s) => { try { (s ? sessionStorage : localStorage).setItem(k, v); } catch (e) { /* no-op */ } };

  /* Cuándo se tocó el carrito por última vez, leído UNA sola vez y ya:
     el primer renderCart() de la carga refresca esa marca, así que si se
     consultara después siempre daría "hace un segundo" y el aviso de
     recuperación no aparecería jamás. */
  const tsCarritoAlCargar = +(leer(K.ts) || 0);

  function mostrarNudge(html, onClick, tono) {
    if (!nudge) return;
    nudge.className = 'nudge-bar' + (tono ? ' ' + tono : '');
    nudge.innerHTML = html + '<button type="button" class="nudge-x" aria-label="Cerrar">✕</button>';
    nudge.hidden = false;
    requestAnimationFrame(() => nudge.classList.add('show'));
    nudge._go = onClick;
  }
  function ocultarNudge() {
    if (!nudge) return;
    nudge.classList.remove('show');
    setTimeout(() => { nudge.hidden = true; }, 300);
  }
  nudge?.addEventListener('click', (e) => {
    if (e.target.closest('.nudge-x')) { ocultarNudge(); return; }
    const go = nudge._go;
    ocultarNudge();
    if (typeof go === 'function') go();
  });

  /* (a) Pedido armado que nunca se envió. El carrito ya sobrevivía en el
         navegador; lo que faltaba era invitar a terminarlo. */
  function nudgeCarrito() {
    const cart = carrito();
    if (!cart.length) return false;
    if (!tsCarritoAlCargar || Date.now() - tsCarritoAlCargar < 15 * 60 * 1000) return false;   /* muy reciente: no molestar */
    mostrarNudge(
      '<span class="nudge-emoji" aria-hidden="true">🛒</span>' +
      '<span class="nudge-text"><b>Dejaste un pedido sin enviar</b>' +
      '<span>' + cart.reduce((s, i) => s + i.qty, 0) + ' producto(s) · ' + fmt(subtotalCarrito()) + '</span></span>' +
      '<span class="nudge-cta">Continuar</span>',
      () => {
        document.getElementById('cart-fab')?.click();
        window.PortonTrack?.event('cart_recovered', { subtotal: subtotalCarrito() });
      }
    );
    return true;
  }

  /* (b) Reseña en Google. Más reseñas = mejor posición local = más pedidos,
         y se compone mes a mes. Se pide en la visita SIGUIENTE al pedido
         (ya comió), una sola vez, y nunca si hay un carrito pendiente. */
  function nudgeResena() {
    if (typeof BUSINESS === 'undefined' || !BUSINESS.maps) return false;
    if (leer(K.resena)) return false;
    const ts = +(leer(K.pedido) || 0);
    if (!ts || Date.now() - ts < 3 * 60 * 60 * 1000) return false;
    mostrarNudge(
      '<span class="nudge-emoji" aria-hidden="true">⭐</span>' +
      '<span class="nudge-text"><b>¿Cómo te fue con tu pedido?</b>' +
      '<span>Tu reseña en Google nos ayuda muchísimo.</span></span>' +
      '<span class="nudge-cta">Calificar</span>',
      () => {
        guardar(K.resena, '1');
        window.PortonTrack?.event('review_click', null);
        window.open(BUSINESS.maps, '_blank', 'noopener');
      },
      'is-gold'
    );
    /* Se marca como pedida aunque la cierren: no se insiste. */
    nudge?.querySelector('.nudge-x')?.addEventListener('click', () => guardar(K.resena, '1'), { once: true });
    return true;
  }

  /* (c) Medir la plata que se va. Sin esto, el dueño no sabe que existe. */
  function registrarAbandono() {
    const cart = carrito();
    if (!cart.length || leer(K.abandono, true)) return;
    guardar(K.abandono, '1', true);
    window.PortonTrack?.event('cart_abandoned', {
      subtotal: subtotalCarrito(),
      items: cart.length,
      fase: est ? est.fase : null,
    });
  }
  window.addEventListener('pagehide', registrarAbandono);
  document.addEventListener('visibilitychange', () => { if (document.hidden) registrarAbandono(); });

  /* ============================================================ */
  /* CABLEADO                                                     */
  /* ============================================================ */
  /* renderCart() es el único punto por el que pasa TODO cambio del
     carrito, así que se envuelve una sola vez en lugar de regar
     listeners por el código. */
  const renderOriginal = window.renderCart;
  window.renderCart = function () {
    if (typeof renderOriginal === 'function') renderOriginal();
    guardar(K.ts, String(Date.now()));
    pintarCrossell();
    pintarCarrito();
  };

  /* Al enviar: se recuerda la fecha (para pedir reseña después) y se
     registra aparte si el pedido quedó programado. Se lee el subtotal
     ANTES porque el envío vacía el carrito. */
  const enviarOriginal = window.sendOrderWhatsApp;
  if (typeof enviarOriginal === 'function') {
    window.sendOrderWhatsApp = function () {
      const prog = pedidoProgramado();
      const subtotal = subtotalCarrito();
      enviarOriginal();
      if (carrito().length) return;   /* no salió (carrito vacío / anti-spam) */
      guardar(K.pedido, String(Date.now()));
      guardar(K.abandono, '1', true);
      if (prog) window.PortonTrack?.event('order_scheduled', { para: prog.value, subtotal: subtotal });
      if (slotSel) slotSel.value = '';
    };
  }

  window.renderCart();

  /* El aviso flotante NO sale de una: en móvil quedaría justo encima del
     botón "Ordenar Ahora" del hero, tapando la llamada a la acción
     principal. Espera a que el visitante pase del hero —ahí abajo ya no
     estorba nada— o a que hayan pasado 15 s, que es tiempo de sobra para
     haber leído la portada. */
  (function esperarMomentoOportuno(mostrar) {
    let listo = false;
    const alScroll = () => { if (window.scrollY > window.innerHeight * 0.5) disparar(); };
    let reloj = null;
    function disparar() {
      if (listo) return;
      listo = true;
      window.removeEventListener('scroll', alScroll);
      clearTimeout(reloj);
      mostrar();
    }
    reloj = setTimeout(disparar, 15000);
    window.addEventListener('scroll', alScroll, { passive: true });
    setTimeout(alScroll, 2500);   /* por si la página se recargó ya desplazada */
  })(() => { if (!nudgeCarrito()) nudgeResena(); });
})();


/* ============================================================= */
/* SEO LOCAL — LA CARTA COMPLETA, EN EL IDIOMA DE GOOGLE          */
/* ============================================================= */
/* El bloque <script type="application/ld+json"> del <head> declara   */
/* el negocio (dirección, horario, calificación). Este módulo         */
/* declara la CARTA: +45 platos con foto, descripción y precio, y      */
/* se arma desde el mismo MENU que ve el cliente —incluidos los        */
/* cambios que el dueño haga desde el panel admin—, así que nunca      */
/* se desincroniza. Se engancha al nodo #menu que el <head> ya         */
/* referencia con hasMenu.                                             */
/*                                                                     */
/* Para qué sirve: un restaurante que le entrega a Google su carta      */
/* estructurada compite por resultados enriquecidos y por las           */
/* búsquedas de intención ("hamburguesa artesanal Cajicá") en vez de    */
/* depender de que alguien ya sepa el nombre del negocio.               */
/* ============================================================= */
(function initDatosEstructurados() {
  if (typeof BUSINESS === 'undefined' || typeof MENU === 'undefined') return;

  const base = String(BUSINESS.siteUrl || '').replace(/\/$/, '');
  const abs  = (ruta) => (ruta ? base + '/' + String(ruta).replace(/^\//, '') : undefined);

  function construir() {
    const cats = (typeof CATEGORIES !== 'undefined' ? CATEGORIES : []);
    const secciones = cats.map((c) => {
      const items = MENU.filter((p) => p.cat === c.key).map((p) => {
        const ofertas = (p.options || []).map((o) => ({
          '@type': 'Offer',
          /* "Koller", "Artesanal", "1.5 Lt"… solo aporta si distingue variantes. */
          name: o.label && o.label !== 'Porción' ? o.label : undefined,
          price: String(o.price),
          priceCurrency: 'COP',
          availability: 'https://schema.org/InStock',
        }));
        return {
          '@type': 'MenuItem',
          name: p.name,
          description: p.desc || undefined,
          image: p.img ? abs(p.img) : undefined,
          offers: ofertas.length === 1 ? ofertas[0] : ofertas,
        };
      });
      if (!items.length) return null;
      return { '@type': 'MenuSection', name: c.label, hasMenuItem: items };
    }).filter(Boolean);

    if (!secciones.length) return null;
    return {
      '@context': 'https://schema.org',
      '@type': 'Menu',
      '@id': base + '/#menu',
      name: 'Carta de ' + (BRAND && BRAND.name ? BRAND.name : 'El Portón Cajicá'),
      inLanguage: 'es-CO',
      url: base + '/#menu-catalogo',
      hasMenuSection: secciones,
    };
  }

  function publicar() {
    const data = construir();
    if (!data) return;
    let el = document.getElementById('ld-menu');
    if (!el) {
      el = document.createElement('script');
      el.type = 'application/ld+json';
      el.id = 'ld-menu';
      document.head.appendChild(el);
    }
    /* JSON.stringify quita solas las claves `undefined`. */
    el.textContent = JSON.stringify(data);
  }

  publicar();

  /* El menú también llega desde Supabase unos segundos después (initMenuSync).
     Se republica cuando eso pasa, para que Google vea la carta viva y no la
     que venía quemada en el código. */
  const rerenderOriginal = window.rerenderCatalog;
  window.rerenderCatalog = function () {
    if (typeof rerenderOriginal === 'function') rerenderOriginal();
    publicar();
  };
})();
