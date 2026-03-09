import { obtenerRecetas, obtenerRecetaCompleta } from "./hfresh.js";
import { obtenerIngredientes, tipoCategoria } from "./menu-engine.js";
import { filtrarDuplicadas } from "./menu-engine.js";
import { equilibrarProteinas } from "./menu-engine.js";
import { shuffle } from "./menu-engine.js";
import { tipoProteina } from "./menu-engine.js";
import { obtenerImagenReceta } from "./hfresh.js";
import { calcularCompraNecesaria } from "./shopping-engine.js";
import { generarBusquedaEroski } from "./eroski-engine.js";
import { mostrarMenu } from "./menu-ui.js";

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

  mostrarMenu(recetas, menuActual, poolRecetas);
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
    mostrarMenu(recetas, menuActual, poolRecetas);
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

document.getElementById("generarLista").onclick = async () => {
  const ingredientes = obtenerIngredientes(menuActual.recetas);
  const compra = await calcularCompraNecesaria(ingredientes);
  mostrarListaCompra(compra);
};
document.getElementById("abrirEroski").onclick = () => {
  const texto = document.getElementById("listaCompra").value;
  const productos = texto.split("\n").map((n) => ({ nombre: n }));
  const url = generarBusquedaEroski(productos);
  window.open(url, "_blank");
};
document.getElementById("copiarLista").onclick = async () => {
  const texto = document.getElementById("listaCompra").value;

  if (!texto) return;

  await navigator.clipboard.writeText(texto);

  toast("Lista copiada");
};
function mostrarListaCompra(lista) {
  const textarea = document.getElementById("listaCompra");

  if (!textarea) return;

  const lineas = (lista || []).map((i) => {
    return `${i.nombre} ${i.cantidad}`;
  });

  textarea.value = lineas.join("\n");
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

export function actualizarEstadoMenu() {
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
