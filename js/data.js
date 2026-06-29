/* ============================================================= */
/* EL PORTÓN CAJICÁ — DATA (FUENTE ÚNICA DE VERDAD)              */
/* ============================================================= */
/* NOTA: El menú completo (categorías, productos, adiciones) se   */
/* cargará aquí en el Bloque 3 (Catálogo). Por ahora solo va la   */
/* configuración de marca usada por varios componentes.          */

const BRAND = {
  name:     "El Portón Cajicá",
  whatsapp: "573138214752",
  prefix:   "[WEB-PORTON-CAJICA]",
};

/* ---------- BLOQUE 2: HERO — 4 productos estrella (rotación aleatoria) ---------- */
/* Texto EXACTO del PRD. El emoji hace de "imagen" hasta tener las fotos reales. */
const HERO_PRODUCTS = [
  {
    emoji:   "🌭",
    img:     "assets/Platos/perro-todo-terreno.jpg",
    tagline: "🔥 ¡LA REINA DE LA CASA!",
    title:   "PERRO TODO TERRENO",
    desc:    "Pan artesanal mega suave, DOBLE salchicha americana premium, 10 huevos de codorniz, papas en fósforo y doble queso.",
    price:   "$24.000",
  },
  {
    emoji:   "🍔",
    tagline: "🍔 ¡SABOR CRIOLLO BRUTAL!",
    title:   "HAMBURGUESA MONTAÑERA",
    desc:    "Carne artesanal de res de 200gr madurada, doble queso fundido, tocineta ahumada crujiente, plátano maduro frito en su punto, huevo frito y un toque de crema agria artesanal.",
    price:   "Desde $29.000",
  },
  {
    emoji:   "🌽",
    tagline: "🌽 ¡EL ANTOJO PERFECTO!",
    title:   "MAZORCADA COLOMBIANA",
    desc:    "Maíz tierno desgranado a la plancha, cubos dorados de plátano maduro, chorizo 100% de cerdo premium, queso costeño rallado y salsa de ajo. ⚠️ (NO CONTIENE PAPA FOSFORO)",
    price:   "$26.000",
  },
  {
    emoji:   "🍟",
    tagline: "🍟 ¡PARA COMPARTIR O MORIR EN EL INTENTO!",
    title:   "SALCHIPAPA MIXTA",
    desc:    "Cama de papas francesas doradas, salchicha americana premium, jugosos trozos de pollo y res saltados a la plancha, plátano maduro y una capa masiva de queso gratinado.",
    price:   "Desde $35.000",
  },
  /* --- Añadidos: pizza + combos (precio combo = base + $9.000, incluye papas francesas y bebida) --- */
  {
    emoji:   "🍕",
    tagline: "🍕 ¡PARA TODA LA MESA!",
    title:   "PIZZA FAMILIAR",
    desc:    "50cm de masa artesanal recién horneada (8 a 16 porciones). Elige hasta 3 sabores: Pepperoni, Pollo BBQ, Hawaiana, Carnes, Margarita y más.",
    price:   "$69.000",
  },
  {
    emoji:   "🍔",
    tagline: "🍔 ¡COMBO COMPLETO!",
    title:   "HAMBURGUESA GOLOSA EN COMBO",
    desc:    "Carne, doble queso, pollo desmechado en BBQ, tocineta, chorizo y papa cabello de ángel + papas a la francesa y bebida. El combo más cargado.",
    price:   "Desde $39.000",
  },
  {
    emoji:   "🌭",
    tagline: "🌭 ¡PERRO EN COMBO!",
    title:   "PERRO CALLEJERO EN COMBO",
    desc:    "Pan artesanal, DOBLE salchicha americana, tocineta, doble queso, huevos de codorniz y papa en fósforo + papas a la francesa y bebida.",
    price:   "$33.000",
  },
];

/* ---------- BLOQUE 3 (showcase): CARTA DESTACADA ---------- */
/* 2 platos completos + 1 difuminado (el último). Data real del menú. */
const CARTA_DESTACADA = [
  {
    img:   "assets/Platos/hamburguesa-cheese-bacon.jpg",
    emoji: "🍔",
    badge: "🍔 Hamburguesas",
    title: "Hamburguesa Cheese Bacon",
    desc:  "Carne, queso, papa cabello de ángel, pepinillos, bañada en queso cheddar, topping de tocineta y cebollín.",
    price: "Desde $29.000",
  },
  {
    img:   "assets/Platos/perro-todo-terreno.jpg",
    emoji: "🌭",
    badge: "🌭 Perros Calientes",
    title: "Perro Todo Terreno",
    desc:  "Pan artesanal mega suave, DOBLE salchicha americana premium, 10 huevos de codorniz, papas en fósforo y doble queso.",
    price: "$24.000",
  },
  {
    img:   "assets/Platos/hamburguesa-3-carnes.jpg",
    emoji: "🍔",
    badge: "🍔 Hamburguesas",
    title: "Hamburguesa Tres Carnes",
    desc:  "Triple carne de res 100%, triple queso, lechuga, cebolla grille, tomate y salsas.",
    price: "$36.000",
  },
];


/* ============================================================= */
/* BLOQUE 3: MENÚ COMPLETO (FUENTE ÚNICA DE VERDAD)             */
/* Categorías 1-6 (SIN bebidas). Precios reales del PRD.        */
/* `options` = variantes (proteína/tamaño/porción) para el modal */
/* `combo` = elegible a Combo +$9.000 (solo hamburguesas/perros) */
/* ============================================================= */
const CATEGORIES = [
  { key: "hamburguesas", label: "Hamburguesas",      emoji: "🍔" },
  { key: "perros",       label: "Perros Calientes",  emoji: "🌭" },
  { key: "mazorcadas",   label: "Mazorcadas",        emoji: "🌽" },
  { key: "salchipapas",  label: "Salchipapas",       emoji: "🍟" },
  { key: "pizzas",       label: "Pizzas & Lasañas",  emoji: "🍕" },
  { key: "infantil",     label: "Menú Infantil",     emoji: "🧒" },
];

// Sabores de pizza (compartidos por todos los tamaños)
const PIZZA_FLAVORS = [
  "Pollo champiñón", "Hawaiana", "Carnes", "Pepperoni", "Maíz tocineta",
  "Pollo miel mostaza", "Pollo BBQ", "Campesina", "Napolitana", "Margarita",
  "Mexicana", "Tropi BBQ", "Vegetales", "Boloñesa",
];

const MENU = [
  /* ---------- 1. HAMBURGUESAS (combo +$9.000) ---------- */
  { id:"h-sencilla", cat:"hamburguesas", combo:true, emoji:"🍔",
    name:"Sencilla", desc:"Carne, queso y salsas.",
    options:[{label:"Koller",price:13000},{label:"Pollo",price:13500},{label:"Artesanal",price:17000}] },
  { id:"h-sencilla-doble", cat:"hamburguesas", combo:true, emoji:"🍔",
    name:"Sencilla Doble", desc:"Doble carne, queso y salsas.",
    options:[{label:"Koller",price:20000},{label:"Pollo",price:20500},{label:"Artesanal",price:24000}] },
  { id:"h-clasica", cat:"hamburguesas", combo:true, emoji:"🍔", img:"assets/Platos/hamburguesa-clasica.jpg",
    name:"Clásica", desc:"Carne, queso, lechuga, tomate, cebolla grille y salsas.",
    options:[{label:"Koller",price:15000},{label:"Pollo",price:15500},{label:"Artesanal",price:19000}] },
  { id:"h-clasica-doble", cat:"hamburguesas", combo:true, emoji:"🍔",
    name:"Clásica Doble", desc:"Doble carne, doble queso, lechuga, tomate, cebolla grille y salsas.",
    options:[{label:"Koller",price:22000},{label:"Pollo",price:22500},{label:"Artesanal",price:26000}] },
  { id:"h-mixta", cat:"hamburguesas", combo:true, emoji:"🍔",
    name:"Mixta", desc:"Carne, pollo apanado, doble queso, lechuga, tomate, cebolla grille y salsas.",
    options:[{label:"Koller",price:21000},{label:"Artesanal",price:26500}] },
  { id:"h-mexicana", cat:"hamburguesas", combo:true, emoji:"🍔", img:"assets/Platos/hamburguesa-mexicana.jpg",
    name:"Mexicana", desc:"Carne, queso, crema agria, pico de gallo y doritos.",
    choices:[{ title:"🌶️ Jalapeño", options:["Con jalapeño","Sin jalapeño"] }],
    options:[{label:"Koller",price:23000},{label:"Pollo",price:23500},{label:"Artesanal",price:27000}] },
  { id:"h-cheese-bacon", cat:"hamburguesas", combo:true, emoji:"🍔", img:"assets/Platos/hamburguesa-cheese-bacon.jpg",
    name:"Cheese Bacon", desc:"Carne, queso, papa cabello de ángel, pepinillos, bañada en queso cheddar, topping de tocineta y cebollín.",
    options:[{label:"Koller",price:29000},{label:"Pollo",price:29500},{label:"Artesanal",price:33000}] },
  { id:"h-campesina", cat:"hamburguesas", combo:true, emoji:"🍔",
    name:"Campesina", desc:"Carne, queso, lechuga, tomate, cebolla grille, salsas, huevo frito y chorizo.",
    options:[{label:"Koller",price:23000},{label:"Pollo",price:23500},{label:"Artesanal",price:27000}] },
  { id:"h-ranchera", cat:"hamburguesas", combo:true, emoji:"🍔",
    name:"Ranchera", desc:"Carne, queso, lechuga, tomate, cebolla grille, salsas, huevo frito y tocineta.",
    options:[{label:"Koller",price:23000},{label:"Pollo",price:23500},{label:"Artesanal",price:27000}] },
  { id:"h-hawaiana", cat:"hamburguesas", combo:true, emoji:"🍔", img:"assets/Platos/hamburguesa-hawaiana.jpg",
    name:"Hawaiana", desc:"Carne, doble queso, tocineta y piña confitada.",
    options:[{label:"Koller",price:23000},{label:"Pollo",price:23500},{label:"Artesanal",price:27000}] },
  { id:"h-callejera", cat:"hamburguesas", combo:true, emoji:"🍔", img:"assets/Platos/hamburguesa-callejera.jpg",
    name:"Callejera", desc:"Carne, queso, papa cabello de ángel, salsas y huevos de codorniz.",
    options:[{label:"Koller",price:19000},{label:"Pollo",price:19500},{label:"Artesanal",price:23000}] },
  { id:"h-montanera", cat:"hamburguesas", combo:true, emoji:"🍔", badge:"🍔 Sabor criollo",
    name:"Montañera", desc:"Carne, doble queso, tocineta, huevo frito, plátano maduro frito y crema agria.",
    options:[{label:"Koller",price:29000},{label:"Pollo",price:29500},{label:"Artesanal",price:33000}] },
  { id:"h-golosa", cat:"hamburguesas", combo:true, emoji:"🍔",
    name:"Golosa", desc:"Carne, doble queso, salsas, pollo desmechado en BBQ, tocineta, chorizo y papa cabello de ángel.",
    options:[{label:"Koller",price:30000},{label:"Pollo",price:30500},{label:"Artesanal",price:34000}] },
  { id:"h-tres-carnes", cat:"hamburguesas", combo:true, emoji:"🍔", img:"assets/Platos/hamburguesa-3-carnes.jpg",
    name:"Tres Carnes", desc:"Triple carne de res 100%, triple queso, lechuga, cebolla grille, tomate y salsas.",
    options:[{label:"Artesanal",price:36000}] },

  /* ---------- 2. PERROS CALIENTES (combo +$9.000) ---------- */
  { id:"p-clasico", cat:"perros", combo:true, emoji:"🌭",
    name:"Clásico", desc:"Pan artesanal, salchicha americana, cebolla grille, papa en fósforo, salsas, queso y dos huevos de codorniz.",
    options:[{label:"Porción",price:15000}] },
  { id:"p-choriperro", cat:"perros", combo:true, emoji:"🌭",
    name:"Choriperro", desc:"Pan artesanal, chorizo 100% cerdo, cebolla grille, papa en fósforo, salsas, queso y dos huevos de codorniz.",
    options:[{label:"Porción",price:17000}] },
  { id:"p-tocineta", cat:"perros", combo:true, emoji:"🌭",
    name:"Tocineta", desc:"Pan artesanal, salchicha americana, cebolla grille, salsas, papa en fósforo, queso, tocineta y dos huevos de codorniz.",
    options:[{label:"Porción",price:19000}] },
  { id:"p-mexicano", cat:"perros", combo:true, emoji:"🌭",
    name:"Mexicano", desc:"Pan artesanal, salchicha americana, salsas, papa en fósforo, maíz, jalapeño, pico de gallo, queso y dos huevos de codorniz.",
    options:[{label:"Porción",price:19000}] },
  { id:"p-hawaiano", cat:"perros", combo:true, emoji:"🌭",
    name:"Hawaiano", desc:"Pan artesanal, salchicha americana, salsas, papa en fósforo, piña confitada, jamón de cerdo, queso y dos huevos de codorniz.",
    options:[{label:"Porción",price:19000}] },
  { id:"p-callejero", cat:"perros", combo:true, emoji:"🌭",
    name:"Callejero", desc:"Pan artesanal, DOBLE salchicha americana, salsas, papa en fósforo, tocineta, doble queso y dos huevos de codorniz.",
    options:[{label:"Porción",price:24000}] },
  { id:"p-todo-terreno", cat:"perros", combo:true, emoji:"🌭", img:"assets/Platos/perro-todo-terreno.jpg", badge:"🔥 La reina de la casa",
    name:"Todo Terreno", desc:"Pan artesanal, DOBLE salchicha americana, 10 huevos de codorniz, salsas, papa en fósforo y doble queso.",
    options:[{label:"Porción",price:24000}] },
  { id:"p-gloton", cat:"perros", combo:true, emoji:"🌭",
    name:"Glotón", desc:"Pan artesanal, salchicha americana, cebolla grille, salsas, papa en fósforo, pollo desmechado, tocineta, queso y dos huevos de codorniz.",
    options:[{label:"Porción",price:24000}] },

  /* ---------- 3. MAZORCADAS ---------- */
  { id:"m-carne", cat:"mazorcadas", combo:false, emoji:"🌽", proteins:["Pollo","Res","Cerdo"], chooseProteins:1,
    name:"Mazorcada (Pollo, Res o Cerdo)", desc:"Maíz tierno, proteína, salsa BBQ, queso doble crema, papa fósforo, queso costeño y salsa de ajo.",
    options:[{label:"1/2 Porción",price:21000},{label:"Completa",price:30000}] },
  { id:"m-mixta", cat:"mazorcadas", combo:false, emoji:"🌽", proteins:["Pollo","Res","Cerdo"], chooseProteins:2,
    name:"Mixta", desc:"Mezcla de dos proteínas a elección.",
    options:[{label:"Completa",price:30000}] },
  { id:"m-vegetariana", cat:"mazorcadas", combo:false, emoji:"🌽",
    name:"Vegetariana", desc:"Maíz, pimentón, champiñón, cebolla, zanahoria, quesos, papa fósforo y salsa de ajo.",
    options:[{label:"Porción",price:24000}] },
  { id:"m-ranchera", cat:"mazorcadas", combo:false, emoji:"🌽",
    name:"Ranchera", desc:"Salchicha y chorizo de cerdo, maíz, queso, papa fósforo y salsa de ajo.",
    options:[{label:"Porción",price:24000}] },
  { id:"m-colombiana", cat:"mazorcadas", combo:false, emoji:"🌽", badge:"🌽 El antojo perfecto",
    name:"Colombiana", desc:"Maíz, plátano maduro frito, chorizo, queso gratinado, queso costeño y salsa de ajo. (No contiene papa fósforo).",
    options:[{label:"Porción",price:26000}] },
  { id:"m-tres-carnes", cat:"mazorcadas", combo:false, emoji:"🌽",
    name:"Tres Carnes", desc:"Mezcla de res, pollo y cerdo.",
    options:[{label:"Porción",price:36000}] },

  /* ---------- 4. SALCHIPAPAS ---------- */
  { id:"s-choripapa", cat:"salchipapas", combo:false, emoji:"🍟",
    name:"Choripapa", desc:"Papa francesa y chorizo 100% cerdo.",
    options:[{label:"Estándar",price:14000},{label:"Con Codorniz",price:19500}] },
  { id:"s-clasica", cat:"salchipapas", combo:false, emoji:"🍟",
    name:"Salchipapa Clásica", desc:"Papa francesa y salchicha americana.",
    options:[{label:"Estándar",price:11500},{label:"Con Codorniz",price:17000}] },
  { id:"s-doble", cat:"salchipapas", combo:false, emoji:"🍟",
    name:"Salchipapa Doble", desc:"Doble papa y doble salchicha americana.",
    options:[{label:"Estándar",price:20000},{label:"Con Codorniz",price:25500}] },
  { id:"s-salchipollo", cat:"salchipapas", combo:false, emoji:"🍟",
    name:"Salchipollo", desc:"Doble papa, salchicha americana, cubos de pollo y queso.",
    options:[{label:"Estándar",price:22000},{label:"Con Codorniz",price:27500}] },
  { id:"s-mixta", cat:"salchipapas", combo:false, emoji:"🍟", badge:"🍟 Para compartir",
    name:"Salchipapa Mixta", desc:"Papa francesa, salchicha, pollo, res, plátano maduro frito y queso.",
    options:[{label:"Estándar",price:35000},{label:"Con Codorniz",price:40500}] },
  { id:"s-salchicosta", cat:"salchipapas", combo:false, emoji:"🍟",
    name:"Salchicosta", desc:"Papa francesa, salchicha, pollo en trozos, queso, papa fósforo, lechuga, tocineta y queso costeño.",
    options:[{label:"Estándar",price:31000},{label:"Con Codorniz",price:36500}] },
  { id:"s-cheese-bacon", cat:"salchipapas", combo:false, emoji:"🍟",
    name:"Papas Cheese Bacon", desc:"Doble papa, salchicha, queso cheddar, tocineta y cebollín.",
    options:[{label:"Estándar",price:26000},{label:"Con Codorniz",price:31500}] },

  /* ---------- 5. PIZZAS & LASAÑAS ---------- */
  { id:"pz-personal", cat:"pizzas", combo:false, emoji:"🍕", pizza:true, maxFlavors:2,
    name:"Pizza Personal", desc:"22cm · 4 porciones. Elige hasta 2 sabores (mitad y mitad).",
    options:[{label:"Personal",price:20000}] },
  { id:"pz-mediana", cat:"pizzas", combo:false, emoji:"🍕", pizza:true, maxFlavors:3, slices:["x8","x10","x12"],
    name:"Pizza Mediana", desc:"40cm · 8-10 porciones. Elige hasta 3 sabores.",
    options:[{label:"Mediana",price:56000}] },
  { id:"pz-familiar", cat:"pizzas", combo:false, emoji:"🍕", pizza:true, maxFlavors:3, slices:["x8","x10","x12","x16"],
    name:"Pizza Familiar", desc:"50cm · 8-16 porciones. Elige hasta 3 sabores.",
    options:[{label:"Familiar",price:69000}] },
  { id:"l-pollo", cat:"pizzas", combo:false, emoji:"🍝",
    name:"Lasaña Pollo", desc:"Pollo, salsa bechamel, champiñón, pasta, queso y pan tostado.",
    options:[{label:"Porción",price:21000}] },
  { id:"l-carne", cat:"pizzas", combo:false, emoji:"🍝",
    name:"Lasaña Carne", desc:"Carne boloñesa, pasta, queso y pan tostado.",
    options:[{label:"Porción",price:21000}] },
  { id:"l-mixta", cat:"pizzas", combo:false, emoji:"🍝",
    name:"Lasaña Mixta", desc:"Carne boloñesa, pollo desmechado, pasta, queso y pan tostado.",
    options:[{label:"Porción",price:22000}] },

  /* ---------- 6. MENÚ INFANTIL ---------- */
  { id:"i-hamburguesa", cat:"infantil", combo:false, emoji:"🍔",
    name:"Mini Hamburguesa", desc:"Pan, carne 80gr, lechuga, tomate, salsas y dos huevos de codorniz. Incluye papas, Chocolatina Gol y jugo.",
    options:[{label:"Porción",price:21000}] },
  { id:"i-perro", cat:"infantil", combo:false, emoji:"🌭",
    name:"Mini Perro", desc:"Pan, salchicha, salsas, papa fósforo y dos huevos de codorniz. Incluye papas, Chocolatina Gol y jugo.",
    options:[{label:"Porción",price:21000}] },
];


/* ============================================================= */
/* BLOQUE 4: PERSONALIZACIÓN (combo, bebidas, adiciones)        */
/* ============================================================= */
const COMBO_PRICE = 9000;
// El combo (solo hamburguesas/perros) incluye papas a la francesa + 1 bebida 400ml:
const COMBO_DRINKS = ["Coca-Cola", "Coca-Cola Zero", "Quatro", "Sprite", "Ginger", "Cola Román", "Fuze Té", "Agua", "Agua con gas"];

// Adiciones premium con su precio y a qué categorías aplican (matriz del cliente).
// (Infantil y bebidas no llevan adiciones.)
const ADICIONES = [
  { name:"Huevos de codorniz (10 u)",  price:6500, cats:["hamburguesas","perros","salchipapas"] },
  { name:"Carne Koller",               price:7000, cats:["hamburguesas"] },
  { name:"Carne Artesanal 200gr",      price:8500, cats:["hamburguesas"] },
  { name:"Pollo Apanado",              price:7500, cats:["hamburguesas"] },
  { name:"Res / Cerdo / Pollo 150gr",  price:8500, cats:["mazorcadas"] },
  { name:"Tocineta",                   price:6000, cats:["hamburguesas","perros"] },
  { name:"Chorizo",                    price:7500, cats:["hamburguesas","mazorcadas"] },
  { name:"Salchicha Americana",        price:6000, cats:["perros","mazorcadas","salchipapas"] },
  { name:"Queso tajado (2 lonjas)",    price:2500, cats:["hamburguesas","perros","mazorcadas","salchipapas"] },
  { name:"Queso Costeño 60gr",         price:4000, cats:["mazorcadas"] },
  { name:"Queso Rallado Doble Crema",  price:3500, cats:["mazorcadas"] },
  { name:"Huevo frito",                price:1500, cats:["hamburguesas"] },
  { name:"Maíz",                       price:4000, cats:["mazorcadas"] },
  { name:"Champiñón Salteado",         price:6000, cats:["hamburguesas","perros","mazorcadas","salchipapas","pizzas"] },
  { name:"Papa cabello de ángel",      price:1500, cats:["hamburguesas","mazorcadas"] },
  { name:"Cheddar 100gr",              price:6000, cats:["hamburguesas"] },
];

/* Descripción que aparece bajo la barra de filtros según la categoría.
   Por ahora solo Hamburguesas (explica las 3 proteínas). */
const CAT_DESC = {
  hamburguesas: [
    { emoji:"🥩", title:"Carne Koller",        text:"Carne de res procesada de alta calidad, jugosa y con un sabor clásico, ideal para quienes disfrutan una hamburguesa tradicional." },
    { emoji:"🍗", title:"Pollo Apanado",       text:"Pollo cubierto con un apanado crujiente y dorado, frito al punto para lograr una textura crocante por fuera y jugosa por dentro." },
    { emoji:"🍔", title:"Carne 100% Artesanal", text:"Carne de res preparada en nuestro restaurante, elaborada con ingredientes seleccionados y sin procesos industriales para ofrecer un sabor casero, jugoso y auténtico." },
  ],
};
