const mapaProteinas = {
  pollo: ["pollo"],
  cerdo: ["cerdo", "chorizo", "jamon", "jamón", "lomo", "panceta"],
  ternera: ["ternera", "vacuno"],
  pescado: [
    "salmón",
    "atun",
    "atún",
    "merluza",
    "bacalao",
    "langostino",
    "langostinos",
    "gamba",
    "gambas",
    "pescado",
  ],
  huevos: ["huevo"],
  vegetal: [
    "tofu",
    "garbanzo",
    "garbanzos",
    "lenteja",
    "lentejas",
    "alubia",
    "alubias",
    "judia",
    "judías",
    "frijol",
    "frijoles",
  ],
};
export function equilibrarProteinas(recetas) {
  const objetivo = {
    pollo: 3,
    pescado: 3,
    vegetariano: 3,
  };

  const conteo = {
    pollo: 0,
    pescado: 0,
    vegetariano: 0,
  };

  const menu = [];

  for (const r of recetas) {
    const tipo = tipoProteina(r);
    if (!categoriaPermitida(r, menu)) continue;

    if (objetivo[tipo] && conteo[tipo] < objetivo[tipo]) {
      menu.push(r);
      conteo[tipo]++;
    }

    if (menu.length === 12) {
      return menu;
    }
  }

  for (const r of recetas) {
    if (!menu.includes(r) && categoriaPermitida(r, menu)) {
      menu.push(r);
    }

    if (menu.length === 12) {
      break;
    }
  }

  return menu;
}

export function categoriaPermitida(receta, menu) {
  const tipo = tipoCategoria(receta);

  const conteo = menu.filter((r) => tipoCategoria(r) === tipo).length;

  if (tipo === "pasta" && conteo >= 3) return false;
  if (tipo === "arroz" && conteo >= 3) return false;
  if (tipo === "sopa" && conteo >= 1) return false;

  return true;
}

const mapaCategorias = {
  pasta: [
    "espagueti",
    "espaguetis",
    "pasta",
    "tagliatelle",
    "penne",
    "orzo",
    "orzotto",
    "rigatoni",
    "yakisoba",
  ],
  arroz: ["arroz", "risotto", "chaufa", "paella"],
  sopa: ["sopa", "crema", "caldo"],
  tacos: ["taco", "tacos", "wrap", "burrito", "tostadas"],
  ensalada: ["ensalada"],
  curry: ["curry"],
};
export function tipoCategoria(receta) {
  const nombre = (receta.name || "").toLowerCase();

  for (const tipo in mapaCategorias) {
    const palabras = mapaCategorias[tipo];

    if (palabras.some((p) => nombre.includes(p))) {
      return tipo;
    }
  }

  return "otro";
}

export function obtenerIngredientes(recetas) {
  const lista = {};
  (recetas || []).forEach((r) => {
    const ingredientes = r?.ingredients || r?.data?.ingredients || [];
    ingredientes.forEach((i) => {
      const nombre = (i.name || "").toLowerCase().trim();
      if (!nombre) return;
      if (!lista[nombre]) {
        lista[nombre] = 0;
      }
      lista[nombre] += 1;
    });
  });
  return Object.entries(lista).map(([nombre, cantidad]) => ({
    nombre,
    cantidad,
  }));
}
export function nombreBase(receta) {
  let nombre = (receta.name || "").toLowerCase();

  nombre = nombre
    .replace(/con .*/, "")
    .replace(/extra .*/, "")
    .replace(/exprés /, "")
    .replace(/rápido /, "")
    .replace(/:/g, "")
    .trim();

  return nombre;
}

export function filtrarDuplicadas(recetas) {
  const vistos = new Set();

  return recetas.filter((r) => {
    const nombre = normalizarNombre(r.name);

    if (vistos.has(nombre)) return false;

    vistos.add(nombre);

    return true;
  });
}
export function tipoProteina(receta) {
  const ingredientes = receta.ingredients ||
    receta.data?.ingredients || [{ name: receta.name }];

  const nombres = ingredientes.map((i) => (i.name || "").toLowerCase());

  const prioridad = [
    "pescado",
    "pollo",
    "cerdo",
    "ternera",
    "huevos",
    "vegetal",
  ];

  for (const tipo of prioridad) {
    const palabras = mapaProteinas[tipo];

    const encontrado = nombres.some((ingrediente) =>
      palabras.some((p) => ingrediente.includes(p)),
    );

    if (encontrado) {
      if (tipo === "vegetal") return "vegetariano";
      return tipo;
    }
  }

  return "vegetariano";
}

export function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }

  return array;
}

export function normalizarNombre(nombre) {
  return nombre
    .toLowerCase()
    .replace("extra de ", "")
    .replace("extra ", "")
    .replace(/\s+/g, " ")
    .trim();
}
