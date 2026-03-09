import { activarEventos } from "./menu-actions.js";
import { tipoProteina, tipoCategoria } from "./menu-engine.js";

export function mostrarMenu(recetas, menuActual, poolRecetas) {
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
  grid.className = "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-6";

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
      dragClass: "dragging-card",

      onMove(evt) {
        const card = evt.dragged;

        if (card.dataset.locked === "true") {
          return false;
        }
        if (card.dataset.cooked === "true") {
          return false;
        }
      },
      onEnd(evt) {
        actualizarEstadoMenu();
      },
    });
  });

  // Insertar recetas
  recetas.forEach((r, i) => {
    const diaIndex = Number.isFinite(Number(r.dia))
      ? Number(r.dia)
      : Math.floor(i / 2);
    const momento = r.momento
      ? r.momento.toLowerCase()
      : i % 2 === 0
        ? "comida"
        : "cena";

    const nombre = r?.name || "receta";
    const tiempo = r?.prep_time || "?";
    const foto = r.foto || "";
    const tipo = tipoProteina(r);
    const tipo2 = tipoCategoria(r);
    const icono = iconos[tipo] || "";
    const iconoCategoria = iconosCategoria[tipo2] || "";

    const card = document.createElement("div");

    card.classList.add("card");
    card.dataset.id = r.hf_recipe_id || r.id;
    card.dataset.menuRecetaId = r.menu_receta_id || "";

    card.dataset.protein = tipoProteina(r);
    card.dataset.name = r.name;

    card.className =
      "card bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden h-[230px] flex flex-col transition-all hover:shadow-lg hover:border-emerald-500/40 hover:-translate-y-1 hover:scale-[1.02] select-none";
    card.onclick = () => {
      window.open(r.url, "_blank");
    };

    card.innerHTML = `
      <div class="relative drag-handle h-40 overflow-hidden cursor-grab active:cursor-grabbing select-none">

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
            class="cocinar bg-zinc-900 border border-zinc-700 backdrop-blur rounded-full w-8 h-8 text-sm
            flex items-center justify-center hover:bg-black/70 transition">
            ✔
          </button>

          <button
            class="bloquear bg-zinc-900 border border-zinc-700 backdrop-blur rounded-full w-8 h-8 text-sm
            flex items-center justify-center hover:bg-black/70 transition">
            🔒
          </button>

          <button
            class="regen bg-zinc-900 border border-zinc-700 backdrop-blur rounded-full w-8 h-8 text-sm
            flex items-center justify-center hover:bg-black/70 transition">
            ♻
          </button>

        </div>
      </div>
      <div class="p-3 h-20 flex flex-col justify-between">

      <div class="text-sm font-semibold text-zinc-200 leading-tight clamp-2">
          ${nombre}
        </div>

        <div class="text-xs text-zinc-500 mt-1">
          ${momento} · ${tiempo} min
        </div>

      </div>
    `;
    if (r.cocinada) {
      card.dataset.cooked = "true";
      card.style.opacity = "0.5";

      const cocinarBtn = card.querySelector(".cocinar");

      if (cocinarBtn) {
        cocinarBtn.textContent = "✓";
      }

      card.classList.add("grayscale");
    }

    const contenedor = document.getElementById(`dia-${diaIndex}-${momento}`);
    if (!contenedor) {
      console.warn("Contenedor no encontrado:", diaIndex, momento);
      return;
    }
    activarEventos(card, menuActual, poolRecetas);
    contenedor.appendChild(card);
  });
}
