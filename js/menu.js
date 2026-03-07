import { obtenerRecetas, obtenerRecetaCompleta } from "./hfresh.js";
import { obtenerIngredientes } from "./menu-engine.js";
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
}

document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("generarMenu")
    .addEventListener("click", generarMenuSemanal);
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
    <div class="text-zinc-400 flex items-center">Comida</div>
    ${dias.map((_, i) => `<div class="dia" id="dia-${i}-comida"></div>`).join("")}
  `;

  cont.appendChild(filaComida);

  // Fila cena
  const filaCena = document.createElement("div");
  filaCena.className = "grid grid-cols-7 gap-4";

  filaCena.innerHTML = `
    <div class="text-zinc-400 flex items-center">Cena</div>
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

    const tipo = tipoProteina(r);
    const icono = iconos[tipo] || "";

    const card = document.createElement("div");

    card.className =
      "bg-zinc-900 rounded-xl overflow-hidden shadow hover:scale-105 transition-all cursor-pointer";

    card.onclick = () => {
      window.open(r.url, "_blank");
    };

    card.innerHTML = `
      <div class="drag-handle relative h-32 cursor-grab">

      <img src="${foto || "https://picsum.photos/seed/food/600/400"}"
           class="w-full h-full object-cover">

        <button class="bloquear absolute top-2 right-2 bg-black/50 rounded px-2 py-1 text-sm z-10">
        🔓
        </button>

        <button class="regen absolute top-2 left-2 bg-black/50 rounded px-2 py-1 text-sm z-10">
          ♻
        </button>

        <div class="absolute inset-0 bg-black/40"></div>

        <div class="titulo absolute bottom-2 left-3 right-3 text-sm font-semibold text-white line-clamp-2">
          ${icono} ${nombre}
        </div>

      </div>

      <div class="p-2 text-xs text-zinc-400 text-center">
        ${momento} · ${tiempo} min
      </div>
    `;
    const bloquearBtn = card.querySelector(".bloquear");
    const regenBtn = card.querySelector(".regen");

    if (bloquearBtn) {
      bloquearBtn.onclick = (e) => {
        e.stopPropagation();

        const locked = card.dataset.locked === "true";

        if (locked) {
          // desbloquear
          card.dataset.locked = "false";
          card.style.outline = "none";
          card.style.opacity = "1";
          bloquearBtn.textContent = "🔓";
        } else {
          // bloquear
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

        // recetas ya usadas en el menú
        const usadas = Array.from(document.querySelectorAll(".titulo")).map(
          (el) => el.textContent,
        );

        const disponibles = poolRecetas.filter((r) => !usadas.includes(r.name));

        const nueva =
          disponibles[Math.floor(Math.random() * disponibles.length)];

        const foto = await obtenerImagenReceta(nueva.url);

        const img = card.querySelector("img");
        if (img) img.src = foto;
        card.querySelector(".titulo").textContent = nueva.name;

        card.onclick = () => {
          window.open(nueva.url, "_blank");
        };
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
