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
    pollo: 2,
    cerdo: 1,
    ternera: 1,
    pescado: 2,
    huevos: 2,
    vegetariano: 4,
  };

  const conteo = {
    pollo: 0,
    cerdo: 0,
    ternera: 0,
    pescado: 0,
    huevos: 0,
    vegetariano: 0,
  };

  const menu = [];

  // 1️⃣ Intentar cumplir cuotas
  for (const r of recetas) {
    const tipo = tipoProteina(r);

    if (conteo[tipo] < objetivo[tipo]) {
      menu.push(r);
      conteo[tipo]++;
    }

    if (menu.length === 12) return menu;
  }

  // 2️⃣ Rellenar con cualquier receta restante
  for (const r of recetas) {
    if (!menu.includes(r)) {
      menu.push(r);
    }

    if (menu.length === 12) break;
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

export function filtrarDuplicadas(recetas) {
  const vistas = new Set();

  return recetas.filter((r) => {
    let nombre = (r.name || "").toLowerCase();

    nombre = nombre
      .replace(/^extra de /, "")
      .replace(/^extra /, "")
      .replace(/^exprés /, "")
      .replace(/^rápido /, "")
      .replace(/:/g, "")
      .trim();

    if (vistas.has(nombre)) return false;

    vistas.add(nombre);

    return true;
  });
}
export function tipoProteina(receta) {
  const ingredientes = receta.ingredients || receta.data?.ingredients || [];

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
