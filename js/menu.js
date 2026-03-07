import { obtenerRecetas, obtenerRecetaCompleta } from "./hfresh.js";
import { obtenerIngredientes } from "./menu-engine.js";
import { filtrarDuplicadas } from "./menu-engine.js";
import { equilibrarProteinas } from "./menu-engine.js";
import { shuffle } from "./menu-engine.js";
import { tipoProteina } from "./menu-engine.js";
import { obtenerImagenReceta } from "./hfresh.js";

let poolRecetas = [];

async function generarMenuSemanal() {
  console.log("GENERANDO MENU");

  let recetas = await obtenerRecetas(150);

  recetas = recetas.filter((r) => (r.prep_time || 0) <= 30);

  recetas = filtrarDuplicadas(recetas);

  recetas = shuffle(recetas);

  poolRecetas = recetas;

  recetas = equilibrarProteinas(recetas);

  await Promise.all(
    recetas.map(async (r) => {
      r.foto = await obtenerImagenReceta(r.url);
    }),
  );

  const ingredientes = obtenerIngredientes(recetas);

  mostrarMenu(recetas);
  mostrarListaCompra(ingredientes);

  await supabaseClient.from("menus").insert({
    menu: recetas,
  });
  return recetas;
}
window.generarMenuSemanal = generarMenuSemanal;
document.addEventListener("DOMContentLoaded", async () => {
  document
    .getElementById("generarMenu")
    .addEventListener("click", generarMenuSemanal);
  console.log("INICIO APP");
  const { data } = await supabaseClient
    .from("menus")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1);

  console.log("SUPABASE DATA:", data);

  if (data?.length) {
    console.log("MENU QUE SE PINTA:", data[0]?.menu);

    mostrarMenu(data[0].menu);

    const ingredientes = obtenerIngredientes(data[0].menu);
    mostrarListaCompra(ingredientes);
  } else {
    console.log("NO HAY MENU → GENERANDO");
    await generarMenuSemanal();
  }
});

function mostrarMenu(recetas) {
  const iconos = {
    pollo: "🍗",
    cerdo: "🥩",
    ternera: "🥩",
    pescado: "🐟",
    huevos: "🥚",
    vegetariano: "🥕",
  };

  const cont = document.getElementById("menu-container");
  cont.innerHTML = "";

  const dias = ["Sábado", "Domingo", "Lunes", "Martes", "Miércoles", "Jueves"];

  // Crear estructura de días
  // Cabecera con días
  const header = document.createElement("div");
  header.className = "grid grid-cols-7 gap-4 mb-2";

  header.innerHTML = `
    <div></div>
    ${dias.map((d) => `<div class="text-zinc-400 text-center">${d}</div>`).join("")}
  `;

  cont.appendChild(header);

  // Fila comida
  const filaComida = document.createElement("div");
  filaComida.className = "grid grid-cols-7 gap-4 mb-4";

  filaComida.innerHTML = `
    <div class="text-xs text-zinc-500 flex items-center justify-center">
      🍽
    </div>
    ${dias.map((_, i) => `<div class="dia" id="dia-${i}-comida"></div>`).join("")}
  `;

  cont.appendChild(filaComida);

  // Fila cena
  const filaCena = document.createElement("div");
  filaCena.className = "grid grid-cols-7 gap-4";

  filaCena.innerHTML = `
    <div class="text-xs text-zinc-500 flex items-center justify-center">
      🌙
    </div>
    ${dias.map((_, i) => `<div class="dia" id="dia-${i}-cena"></div>`).join("")}
  `;

  cont.appendChild(filaCena);

  document.querySelectorAll(".dia").forEach((el) => {
    new Sortable(el, {
      group: "semana",
      animation: 150,
      swap: true,
      handle: ".drag-handle",
      filter: "button",
      swap: true,
      swapClass: "bg-teal-500/20",

      onMove: function (evt) {
        const card = evt.dragged;

        if (card.dataset.locked === "true") {
          return false;
        }
      },
    });
  });

  // Insertar recetas
  recetas.forEach((r, i) => {
    const diaIndex = Math.floor(i / 2);
    const momento = i % 2 === 0 ? "Comida" : "Cena";

    const nombre = r?.name || "receta";
    const tiempo = r?.prep_time || "?";
    const foto = r.foto || "";
    console.log("foto receta:", r.name, foto);

    const tipo = tipoProteina(r);
    const icono = iconos[tipo] || "";

    const card = document.createElement("div");

    card.classList.add("card");

    card.dataset.id = r.id;

    card.dataset.protein = tipoProteina(r);
    card.dataset.name = r.name;

    card.className =
      "bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-emerald-500/40 transition-all";

    card.onclick = () => {
      window.open(r.url, "_blank");
    };

    card.innerHTML = `
      <div class="drag-handle h-32 overflow-hidden relative">

        <img src="${foto || "https://picsum.photos/seed/food/600/400"}"
             class="w-full h-full object-cover">

        <div class="absolute top-2 right-2 flex gap-1">
          <!-- aquí irán botones luego -->
        </div>

      </div>

      <div class="p-3 space-y-1">

        <div class="text-sm font-semibold text-zinc-200 leading-snug">
          ${icono} ${nombre}
        </div>

        <div class="text-xs text-zinc-500">
          ${momento} · ${tiempo} min
        </div>

      </div>
    `;
    const bloquearBtn = card.querySelector(".bloquear");
    const regenBtn = card.querySelector(".regen");

    if (bloquearBtn) {
      bloquearBtn.onclick = (e) => {
        e.stopPropagation();

        const locked = card.dataset.locked === "true";

        if (locked) {
          card.dataset.locked = "false";
          card.style.outline = "none";
          card.style.opacity = "1";
          bloquearBtn.textContent = "🔓";
        } else {
          card.dataset.locked = "true";
          card.style.outline = "2px solid #14b8a6";
          card.style.opacity = "0.8";
          bloquearBtn.textContent = "🔒";
        }
      };
    }

    if (regenBtn) {
      regenBtn.onclick = async (e) => {
        e.stopPropagation();

        if (card.dataset.locked === "true") return;

        const usadas = Array.from(document.querySelectorAll(".card")).map(
          (c) => c.dataset.id,
        );

        const protein = card.dataset.protein;

        const disponibles = poolRecetas.filter(
          (r) => tipoProteina(r) === protein && !usadas.includes(String(r.id)),
        );

        const nueva =
          disponibles[Math.floor(Math.random() * disponibles.length)];

        const foto = await obtenerImagenReceta(nueva.url);

        const img = card.querySelector("img");
        if (img) img.src = foto;

        card.querySelector(".titulo").textContent = nueva.name;
        card.dataset.id = nueva.id;

        card.onclick = () => window.open(nueva.url, "_blank");
      };
    }

    const contenedor = document.getElementById(
      `dia-${diaIndex}-${momento.toLowerCase()}`,
    );

    contenedor.appendChild(card);
  });
}

function mostrarListaCompra(lista) {
  const cont = document.getElementById("lista-compra");
  cont.innerHTML = "";
  const ul = document.createElement("ul");
  (lista || []).forEach((i) => {
    const li = document.createElement("li");
    li.textContent = `${i.nombre} — ${i.cantidad}`;
    ul.appendChild(li);
  });
  cont.appendChild(ul);
}
