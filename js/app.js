/* ============================================================= */
/* EL PORTÓN CAJICÁ — LÓGICA DE LA APP (JS Vanilla)             */
/* ============================================================= */

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
  const elText  = document.getElementById('hero-text');
  const elWrap  = document.getElementById('hero-image-wrap');
  const elImg   = document.getElementById('hero-image');
  const elInd   = document.getElementById('scroll-indicator');
  if (!products.length || !elText) return;

  /* --- Inyección aleatoria del producto estrella --- */
  const pick = products[Math.floor(Math.random() * products.length)];
  const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  set('hero-tagline', pick.tagline);
  set('hero-title',   pick.title);
  set('hero-desc',    pick.desc);
  set('hero-price',   pick.price);
  if (elImg) {
    if (pick.img) {
      elImg.innerHTML = `<img class="hero-photo" src="${pick.img}" alt="${pick.title}">`;
    } else {
      elImg.textContent = pick.emoji;
    }
    elImg.setAttribute('aria-label', pick.title);
  }

  /* --- Parallax en scroll + fade del indicador --- */
  let ticking = false;
  const update = () => {
    const y = window.scrollY;
    // Mismo fade de opacidad para TODO el bloque (texto + imagen + resplandor)
    const fade = String(Math.max(0, 1 - y / 500));
    if (elWrap) {
      elWrap.style.transform = `translateY(${y * 0.18}px)`;
      elWrap.style.opacity   = fade;
    }
    if (elText) {
      elText.style.transform = `translateY(${y * 0.30}px)`;
      elText.style.opacity   = fade;
    }
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

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let W = 0, H = 0, raf = null;
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
    const count = Math.round(Math.min(120, Math.max(60, W / 14)));
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
    for (let i = 0; i < 16; i++) {
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

  function rebuild() { resize(); buildParticles(); buildSmoke(); }
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
  const data = (typeof CARTA_DESTACADA !== 'undefined') ? CARTA_DESTACADA : [];
  const cont = document.getElementById('carta-rows');
  if (!data.length || !cont) return;

  // --- Render dinámico de las filas ---
  data.forEach((p, i) => {
    const isTeaser = (i === data.length - 1);  // el último = teaser difuminado
    const right    = (i % 2 === 1);            // alterna el lado de la foto
    const row = document.createElement('div');
    row.className = 'carta-row'
      + (right ? ' carta-row--right' : '')
      + (isTeaser ? ' carta-row--teaser in-view' : '');  // el teaser no se anima
    row.innerHTML = `
      <div class="carta-photo">
        <div class="carta-photo-card">
          <span class="carta-badge">${p.badge}</span>
          ${p.img
            ? `<img class="carta-photo-img" src="${p.img}" alt="${p.title}">`
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
    cont.appendChild(row);
  });

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

  // --- "Ver toda la carta" → scroll al catálogo completo ---
  const btn = document.getElementById('ver-carta-btn');
  if (btn) btn.addEventListener('click', () => {
    document.getElementById('menu-catalogo')?.scrollIntoView({ behavior: 'smooth' });
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

  // --- Tabs (sin "Todos"; arranca en la primera categoría) ---
  tabsBox.innerHTML = CATEGORIES.map((c, i) =>
    `<button class="filtro-tab${i === 0 ? ' is-active' : ''}" data-cat="${c.key}" role="tab">${c.emoji} ${c.label}</button>`
  ).join('');

  // --- Tarjetas ---
  grid.innerHTML = MENU.map((item) => {
    const media = item.img
      ? `<img class="cat-card-img" src="${item.img}" alt="${item.name}">`
      : `<span class="cat-card-emoji">${item.emoji}</span>`;
    const badge = item.badge ? `<span class="cat-card-badge">${item.badge}</span>` : '';
    return `
      <article class="cat-card cat-card--in" data-cat="${item.cat}">
        <div class="cat-card-media">${badge}${media}</div>
        <div class="cat-card-body">
          <h3 class="cat-card-title">${item.name}</h3>
          <p class="cat-card-desc">${item.desc}</p>
          <div class="cat-card-foot">
            <span class="cat-card-price">${priceHTML(item)}</span>
            <button class="cat-card-btn" data-id="${item.id}">Personalizar</button>
          </div>
        </div>
      </article>`;
  }).join('');

  const cards = [...grid.querySelectorAll('.cat-card')];

  // --- Filtrado + vista colapsada ("Mostrar más") ---
  const LIMIT = 8;               // platos visibles antes de "Mostrar más"
  let currentCat = CATEGORIES[0].key;   // arranca en la primera categoría
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

  if (moreBtn) moreBtn.addEventListener('click', () => {
    expanded = !expanded;
    applyView();
    if (!expanded) document.querySelector('.catalogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  applyView();                    // estado inicial (colapsado)

  // --- Botón "Personalizar" (abre el modal del Bloque 4) ---
  grid.addEventListener('click', (e) => {
    const b = e.target.closest('.cat-card-btn');
    if (b) window.openProductModal(b.dataset.id);
  });
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
  const openCart  = () => { drawer.classList.add('open'); overlay.classList.add('open'); document.body.style.overflow = 'hidden'; };
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
    if (!ok) showToast('Completa tus datos de envío 📝');
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
    const L = ['[WEB-PORTON-CAJICA]', '🔔 *¡NUEVO PEDIDO RECIBIDO!*', div, ''];

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

  // Construye el enlace y abre WhatsApp; limpia el carrito tras el envío
  window.sendOrderWhatsApp = function () {
    if (!cartState.length) return;
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

/* Año dinámico del footer */
(function () {
  const y = document.getElementById('footer-year');
  if (y) y.textContent = new Date().getFullYear();
})();
