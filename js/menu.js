import { obtenerRecetas, obtenerRecetaCompleta } from "./hfresh.js";
import { obtenerIngredientes, tipoCategoria } from "./menu-engine.js";
import { filtrarDuplicadas } from "./menu-engine.js";
import { equilibrarProteinas } from "./menu-engine.js";
import { shuffle } from "./menu-engine.js";
import { tipoProteina } from "./menu-engine.js";
import { obtenerImagenReceta } from "./hfresh.js";

let poolRecetas = [];

async function generarMenuSemanal() {
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
  const { data } = await supabaseClient
    .from("menus")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1);

  if (data?.length) {
    mostrarMenu(data[0].menu);

    const ingredientes = obtenerIngredientes(data[0].menu);
    mostrarListaCompra(ingredientes);
  } else {
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
  const iconosCategoria = {
    pasta: "🍝",
    arroz: "🍚",
    sopa: "🍲",
    tacos: "🌮",
    ensalada: "🥗",
    curry: "🍛",
  };

  const cont = document.getElementById("menu-container");
  cont.innerHTML = "";

  const dias = ["SÁB", "DOM", "LUN", "MAR", "MIÉ", "JUE"];

  const grid = document.createElement("div");
  grid.className = "grid grid-cols-2 md:grid-cols-6 gap-6";

  dias.forEach((d, i) => {
    const col = document.createElement("div");

    col.className = `
      bg-zinc-900/40
      border border-zinc-800
      rounded-xl
      p-3
      flex flex-col
      gap-3
    `;

    col.innerHTML = `
      <div class="text-xs uppercase tracking-widest text-zinc-400
      border-b border-zinc-800 pb-2 mb-1 text-center">
        ${d}
      </div>

      <div class="text-[11px] text-zinc-500 uppercase tracking-wider flex items-center gap-2">
        ☀ COMIDA
      </div>
      <div class="dia flex flex-col gap-3" id="dia-${i}-comida"></div>

      <div class="text-[11px] text-zinc-500 uppercase tracking-wider flex items-center gap-2 mt-2">
        🌙 CENA
      </div>
      <div class="dia flex flex-col gap-3" id="dia-${i}-cena"></div>
    `;

    grid.appendChild(col); // ← esto faltaba
  });

  cont.appendChild(grid);

  document.querySelectorAll(".dia").forEach((el) => {
    new Sortable(el, {
      group: "semana",
      animation: 150,
      swap: true,
      swapClass: "bg-teal-500/20",

      handle: ".drag-handle",
      filter: "button",

      ghostClass: "opacity-40",
      chosenClass: "scale-[1.02]",

      onMove(evt) {
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
    const tipo = tipoProteina(r);
    const tipo2 = tipoCategoria(r);
    const icono = iconos[tipo] || "";
    const iconoCategoria = iconosCategoria[tipo2] || "";

    const card = document.createElement("div");

    card.classList.add("card");

    card.dataset.id = r.id;

    card.dataset.protein = tipoProteina(r);
    card.dataset.name = r.name;

    card.className =
      "card bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden transition-all hover:shadow-lg hover:border-emerald-500/40 hover:-translate-y-1 hover:scale-[1.02]";
    card.onclick = () => {
      window.open(r.url, "_blank");
    };

    card.innerHTML = `
      <div class="relative drag-handle h-36 overflow-hidden cursor-grab active:cursor-grabbing select-none">

        <img src="${foto || "https://picsum.photos/seed/food/600/400"}"
             class="w-full h-full object-cover">
        <div class="absolute top-2 left-2 flex flex-col gap-1">

          <div class="bg-zinc-900 border border-zinc-700 backdrop-blur rounded-full w-8 h-8 text-sm
          flex items-center justify-center ">
            ${icono}
          </div>

          <div class="bg-zinc-900 border border-zinc-700 backdrop-blur rounded-full w-8 h-8 text-sm
          flex items-center justify-center">
            ${iconoCategoria || ""}
          </div>

        </div>
        <div class="absolute top-2 right-2 flex gap-2">

          <button
            class="bloquear bg-zinc-900 border border-zinc-7000 backdrop-blur rounded-full w-8 h-8 text-sm
            flex items-center justify-center  hover:bg-black/70 transition">
            🔒
          </button>

          <button
            class="regen bg-zinc-900 border border-zinc-700 backdrop-blur rounded-full w-8 h-8 text-sm
            flex items-center justify-center  hover:bg-black/70 transition">
            ♻
          </button>
        </div>
      </div>
      <div class="p-3">

        <div class="text-sm font-semibold text-zinc-200 leading-tight">
          ${nombre}
        </div>

        <div class="text-xs text-zinc-500 mt-1">
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
