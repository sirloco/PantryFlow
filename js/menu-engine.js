const mapaProteinas = {
  pollo: ["pollo"],
  cerdo: ["cerdo", "chorizo", "jamon", "jamón"],
  ternera: ["ternera", "vacuno"],
  pescado: ["salmón", "atun", "atún", "merluza", "bacalao", "pescado"],
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
  const categoria = tipoCategoria(receta);

  const limite = 2;

  const count = menu.filter((r) => tipoCategoria(r) === categoria).length;

  return count < limite;
}

const mapaCategorias = {
  pasta: ["pasta", "espagueti", "espaguetis", "macarrones", "fettuccine"],
  arroz: ["arroz", "risotto"],
  sopa: ["sopa", "crema", "caldo"],
  ensalada: ["ensalada"],
  tacos: ["taco", "tortilla", "wrap"],
  curry: ["curry"],
  bowl: ["bowl"],
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
  const vistas = new Set();

  return recetas.filter((r) => {
    const base = nombreBase(r);
    console.log("BASE RECETA:", nombreBase(r), r.name);
    if (vistas.has(base)) return false;

    vistas.add(base);

    return true;
  });
}
export function tipoProteina(receta) {
  const ingredientes = receta.ingredients ||
    receta.data?.ingredients || [{ name: receta.name }];
  const nombres = ingredientes.map((i) => (i.name || "").toLowerCase());
  for (const tipo in mapaProteinas) {
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
  return array.sort(() => Math.random() - 0.5);
}
