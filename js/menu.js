import { obtenerRecetas, obtenerRecetaCompleta } from "./hfresh.js";
import { obtenerIngredientes, tipoCategoria } from "./menu-engine.js";
import { filtrarDuplicadas } from "./menu-engine.js";
import { equilibrarProteinas } from "./menu-engine.js";
import { shuffle } from "./menu-engine.js";
import { tipoProteina } from "./menu-engine.js";
import { obtenerImagenReceta } from "./hfresh.js";

let poolRecetas = [];
let menuActual = {
  id: null,
  recetas: [],
};
let colaEquivalencias = [];
let modalAbierto = false;
function ocultarLoader() {
  const loader = document.getElementById("loader");
  if (loader) loader.style.display = "none";
}

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
  await supabaseClient
    .from("menus")
    .update({ estado: "archivado" })
    .eq("estado", "activo");
  const { data: menuCreado, error: errorMenu } = await supabaseClient
    .from("menus")
    .insert({
      nombre: "Semana " + new Date().toLocaleDateString(),
      estado: "activo",
    })
    .select()
    .single();

  if (errorMenu) {
    console.error("ERROR creando menu:", errorMenu);
  }

  const menuId = menuCreado.id;

  const filas = recetas.map((r, i) => {
    const dia = Math.floor(i / 2);
    const momento = i % 2 === 0 ? "comida" : "cena";

    return {
      menu_id: menuId,
      hf_recipe_id: r.id,
      nombre: r.name,
      dia,
      momento,
    };
  });

  const { data: filasInsertadas, error } = await supabaseClient
    .from("menu_recetas")
    .insert(filas)
    .select();

  filasInsertadas.forEach((f, i) => {
    recetas[i].menu_receta_id = f.id;
    recetas[i].dia = f.dia;
    recetas[i].momento = f.momento;
  });
  menuActual.id = menuId;
  menuActual.recetas = recetas;
  return recetas;
}
window.generarMenuSemanal = generarMenuSemanal;
document.addEventListener("DOMContentLoaded", async () => {
  generarSelectorReemplazo();
  document
    .getElementById("generarMenu")
    .addEventListener("click", generarMenuSemanal);
  const { data } = await supabaseClient
    .from("menus")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1);

  if (data?.length) {
    const menuId = data[0].id;

    const { data: recetasMenu } = await supabaseClient
      .from("menu_recetas")
      .select("*")
      .eq("menu_id", menuId)
      .order("dia", { ascending: true })
      .order("momento", { ascending: false });

    const recetas = await Promise.all(
      recetasMenu.map(async (r) => {
        const data = await obtenerRecetaCompleta(r.hf_recipe_id);

        const foto = await obtenerImagenReceta(data.url || "");

        return {
          id: r.hf_recipe_id,
          hf_recipe_id: r.hf_recipe_id,
          name: data.name || r.nombre,
          url: data.websiteUrl || data.url || "",
          prep_time: data.prep_time || data.totalTime || "?",
          ingredients: data.ingredients || [],
          foto: foto,
          menu_receta_id: r.id,
          dia: r.dia,
          momento: r.momento,
          cocinada: r.cocinada,
        };
      }),
    );

    menuActual.id = menuId;
    menuActual.recetas = recetas;
    mostrarMenu(recetas);
  } else {
    await generarMenuSemanal();
  }
  ocultarLoader();
});
function generarSelectorReemplazo() {
  const dias = ["Sábado", "Domingo", "Lunes", "Martes", "Miércoles", "Jueves"];

  const select = document.getElementById("recetaReemplazar");

  select.innerHTML = "";

  let index = 0;

  dias.forEach((dia) => {
    const comida = document.createElement("option");
    comida.value = index++;
    comida.textContent = `${dia} comida`;
    select.appendChild(comida);

    const cena = document.createElement("option");
    cena.value = index++;
    cena.textContent = `${dia} cena`;
    select.appendChild(cena);
  });
}

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
    const diaIndex = Number(r.dia);
    const momento = (r.momento || "").toLowerCase();

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
    const bloquearBtn = card.querySelector(".bloquear");
    const regenBtn = card.querySelector(".regen");
    const cocinarBtn = card.querySelector(".cocinar");

    if (bloquearBtn) {
      bloquearBtn.onclick = (e) => {
        e.stopPropagation();

        const locked = card.dataset.locked === "true";
        if (card.dataset.cooked === "true") return;

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
        if (card.dataset.cooked === "true") return;

        const usadas = Array.from(document.querySelectorAll(".card")).map(
          (c) => c.dataset.id,
        );

        const protein = card.dataset.protein;

        const disponibles = poolRecetas.filter(
          (r) => tipoProteina(r) === protein && !usadas.includes(String(r.id)),
        );

        if (!disponibles.length) {
          toast("No hay más recetas de ese tipo");
          return;
        }

        const nueva =
          disponibles[Math.floor(Math.random() * disponibles.length)];

        const foto = nueva.foto || (await obtenerImagenReceta(nueva.url || ""));

        const img = card.querySelector("img");
        if (img) img.src = foto;
        card.dataset.id = nueva.id;
        const recetaEstado = menuActual.recetas.find(
          (r) => r.menu_receta_id === card.dataset.menuRecetaId,
        );

        if (recetaEstado) {
          recetaEstado.id = nueva.id;
          recetaEstado.name = nueva.name;
        }

        card.onclick = () => window.open(nueva.url, "_blank");
      };
    }
    if (cocinarBtn) {
      cocinarBtn.onclick = async (e) => {
        e.stopPropagation();

        // 🚫 evitar cocinar dos veces
        if (card.dataset.cooked === "true") return;

        const hfId = Number(card.dataset.id);
        const menuRecetaId = card.dataset.menuRecetaId?.trim();
        try {
          const ok = await cocinarReceta(hfId, menuRecetaId);

          if (!ok) return;

          card.dataset.cooked = "true";

          card.style.opacity = "0.5";
          cocinarBtn.textContent = "✓";
          card.classList.add("grayscale");
        } catch (err) {
          console.error(err);
          toast("Error cocinando receta");
        }
      };
    }

    const contenedor = document.getElementById(`dia-${diaIndex}-${momento}`);
    if (!contenedor) {
      console.warn("Contenedor no encontrado:", diaIndex, momento);
      return;
    }
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

async function cocinarReceta(hfRecipeId, menuRecetaId) {
  if (!hfRecipeId) {
    console.error("hfRecipeId undefined");
    return;
  }
  // 1. obtener receta completa HF
  const receta = await obtenerRecetaCompleta(hfRecipeId);
  console.log("ingredientes receta:", receta.ingredients);
  if (!receta) {
    console.error("No se pudo cargar la receta HF");
    return;
  }

  const ingredientes = receta.ingredients || [];
  let faltanEquivalencias = false;
  const ignorar = [
    "sal",
    "pimienta",
    "sal y pimienta",
    "pimienta negra",
    "aceite de oliva",
    "aceite",
    "aceite vegetal",
    "aceite para cocinar",
    "ajo",
    "vinagre",
    "crema de vinagre balsámico",
    "azúcar",
    "orégano",
    "semillas de sésamo blancas",
    "miel",
  ];

  let agua = 0;

  for (const ing of ingredientes) {
    const nombre = ing.name.toLowerCase().trim();

    if (nombre.includes("agua")) {
      agua += ing.amount || 0;
    }
  }

  for (const ing of ingredientes) {
    const nombre = ing.name.toLowerCase().trim();

    // ignorar agua
    if (nombre.includes("agua")) {
      continue;
    }

    // ignorar básicos
    if (ignorar.includes(nombre)) {
      continue;
    }

    let cantidad = ing.amount || 1;
    const unidad = ing.unit || "unidad";
    let cantidadFinal = cantidad;

    // transformar caldo
    if (nombre.includes("caldo") && agua > 0) {
      cantidad = agua;
    }

    const { data: eq } = await supabaseClient
      .from("equivalencias")
      .select("*")
      .ilike("hf_nombre", nombre)
      .maybeSingle();
    if (!eq) {
      faltanEquivalencias = true;

      colaEquivalencias.push({
        nombre,
        unidad,
      });

      if (!modalAbierto) {
        procesarColaEquivalencias();
      }

      continue;
    }
    if (eq.factor_conversion) {
      cantidadFinal = cantidad * eq.factor_conversion;
    }

    const { error: movError } = await supabaseClient
      .from("movimientos")
      .insert({
        producto_id: eq.producto_id,
        cantidad: cantidadFinal,
        tipo: "salida",
      });

    if (movError) {
      console.error("Error movimiento:", movError);
      return false;
    }
  }
  if (faltanEquivalencias) {
    console.log("Faltan equivalencias, no se marca como cocinada");
    return false;
  }

  console.log("Actualizando receta:", menuRecetaId);

  const { data, error } = await supabaseClient
    .from("menu_recetas")
    .update({ cocinada: true })
    .eq("id", menuRecetaId)
    .select();

  console.log("resultado update:", data, error);
  const { data: test } = await supabaseClient
    .from("menu_recetas")
    .select("id")
    .eq("id", menuRecetaId);

  console.log("fila encontrada:", test);
  return true;
}

async function abrirModalEquivalencia(nombre, unidad) {
  document.getElementById("modalEquivalencia").classList.remove("hidden");

  document.getElementById("hfIngrediente").innerText = nombre;

  document.getElementById("unidadHF").value = unidad || "unidad";

  const { data } = await supabaseClient
    .from("productos")
    .select("id,nombre,unidad,unit_size");

  const select = document.getElementById("productoEquivalente");

  select.innerHTML = data
    .map(
      (p) => `
        <option
          value="${p.id}"
          data-unidad="${p.unidad}"
          data-size="${p.unit_size}">
          ${p.nombre}
        </option>
      `,
    )
    .join("");
  select.onchange = () => {
    const option = select.selectedOptions[0];

    const unidad = option.dataset.unidad;
    const size = option.dataset.size;

    document.getElementById("infoSize").innerText =
      `Tamaño unidad: ${size} ${unidad}`;

    // sugerir factor automáticamente
    if (size) {
      document.getElementById("factorConversion").value = size;
    }
  };
}
async function procesarColaEquivalencias() {
  if (colaEquivalencias.length === 0) {
    modalAbierto = false;
    return;
  }

  modalAbierto = true;

  const item = colaEquivalencias.shift();

  abrirModalEquivalencia(item.nombre, item.unidad);
}
document.getElementById("saveMenu").onclick = async (e) => {
  const btn = e.target;

  const textoOriginal = btn.innerText;

  btn.innerText = "💾 Guardando...";
  btn.disabled = true;

  await guardarMenu();

  btn.innerText = "✔ Menú guardado";

  setTimeout(() => {
    btn.innerText = textoOriginal;
    btn.disabled = false;
  }, 2000);
};

function actualizarEstadoMenu() {
  const cards = document.querySelectorAll(".card");

  cards.forEach((card) => {
    const id = card.dataset.menuRecetaId;

    const contenedor = card.closest(".dia");

    const partes = contenedor.id.split("-");

    const dia = Number(partes[1]);
    const momento = partes[2];

    const recetaEstado = menuActual.recetas.find(
      (r) => r.menu_receta_id === id,
    );

    if (recetaEstado) {
      recetaEstado.dia = dia;
      recetaEstado.momento = momento;
    }
  });
}

async function guardarMenu() {
  for (const r of menuActual.recetas) {
    await supabaseClient
      .from("menu_recetas")
      .update({
        dia: r.dia,
        momento: r.momento,
      })
      .eq("id", r.menu_receta_id);
  }

  toast("Menú guardado");
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("guardarEquivalencia");

  if (btn) {
    btn.onclick = async () => {
      const option = document.getElementById("productoEquivalente")
        .selectedOptions[0];

      const productoId = option.value;

      const nombreHF = document.getElementById("hfIngrediente").innerText;

      const unidadHF = document.getElementById("unidadHF").value || "unidad";

      const factor =
        Number(document.getElementById("factorConversion").value) || 1;

      const { error } = await supabaseClient.from("equivalencias").insert({
        hf_nombre: nombreHF,
        producto_id: productoId,
        unidad_hf: unidadHF,
        factor_conversion: factor,
      });

      if (error) console.error(error);

      console.log("Equivalencia guardada:", nombreHF, "factor:", factor);

      document.getElementById("modalEquivalencia").classList.add("hidden");

      procesarColaEquivalencias();
    };
  }
});

document.getElementById("ignorarEquivalencia").onclick = () => {
  document.getElementById("modalEquivalencia").classList.add("hidden");

  procesarColaEquivalencias();
};

document.getElementById("replaceRecipe").onclick = () => {
  document.getElementById("modalReceta").classList.remove("hidden");
};

document.getElementById("cancelarReceta").onclick = () => {
  document.getElementById("modalReceta").classList.add("hidden");
};

function toast(msg) {
  const t = document.getElementById("toast");

  t.innerText = msg;
  t.classList.remove("hidden");

  setTimeout(() => {
    t.classList.add("hidden");
  }, 2500);
}
document.getElementById("guardarReceta").onclick = async () => {
  const id = document.getElementById("hfId").value;

  const posicion = Number(document.getElementById("recetaReemplazar").value);

  const dia = menuActual.recetas[posicion].dia;
  const momento = menuActual.recetas[posicion].momento;

  const receta = await obtenerRecetaCompleta(id);

  await supabaseClient
    .from("menu_recetas")
    .update({
      hf_recipe_id: id,
      nombre: receta.name,
    })
    .eq("id", menuActual.recetas[posicion].menu_receta_id);

  menuActual.recetas[posicion] = {
    ...menuActual.recetas[posicion],
    id,
    hf_recipe_id: id,
    name: receta.name,
    url: receta.url,
    prep_time: receta.prep_time || "?",
    ingredients: receta.ingredients,
    foto: await obtenerImagenReceta(receta.url),
  };

  mostrarMenu(menuActual.recetas);

  document.getElementById("modalReceta").classList.add("hidden");

  toast("Receta reemplazada");

  document.getElementById("hfId").value = "";
};
