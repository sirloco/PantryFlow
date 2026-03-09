const HFRESH_TOKEN =
  "211|nhuth_hfdb_nne4Qi9ivpSosTawB6I8RzOF4lMNKpz9Am4mMxfm49eb5033";

export function normalizeRecipe(r) {
  return {
    id: r.id,
    name: r.name,
    image: r.imagePath || null,

    protein: detectProtein(r),
    carbs: detectCarb(r),
    cuisine: detectCuisine(r),

    vegetarian: r.tags?.includes("Vegetarian") || false,

    time: r.totalTime || 0,
    oven: detectOven(r),

    ingredients: r.ingredients || [],
  };
}

export async function obtenerRecetas(numero = 10) {
  const url =
    "/api/proxy?url=" +
    encodeURIComponent(
      "https://api.hfresh.info/es-ES/recipes?per_page=" + numero,
    );
  const res = await fetch(
    "/api/proxy?url=" +
      encodeURIComponent(
        "https://api.hfresh.info/es-ES/recipes?per_page=" + numero,
      ),
    {
      headers: {
        Authorization: `Bearer ${HFRESH_TOKEN}`,
        Accept: "application/json",
      },
    },
  );
  const data = await res.json();
  return data.data;
}

export async function obtenerRecetaCompleta(id) {
  const url =
    "/api/proxy?url=" +
    encodeURIComponent("https://api.hfresh.info/es-ES/recipes/" + id);

  const res = await fetch(
    "/api/proxy?url=" +
      encodeURIComponent("https://api.hfresh.info/es-ES/recipes/" + id),
    {
      headers: {
        Authorization: `Bearer ${HFRESH_TOKEN}`,
        Accept: "application/json",
      },
    },
  );

  const data = await res.json();
  const receta = data.data;

  const ingredientes = await obtenerIngredientesConCantidad(receta.url);

  receta.ingredients = ingredientes;

  return receta;
}

export async function obtenerIngredientesConCantidad(url) {
  const res = await fetch("/api/proxy?url=" + encodeURIComponent(url));
  const html = await res.text();

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const texto = doc.body.innerText;

  const regex =
    /([A-Za-zÁÉÍÓÚáéíóúñÑ\s]+)\n\s*([\d.]+)\s*(gramo|mililitro|unidad|cucharada|cucharadita|paquete)/gi;

  const ingredientes = [];
  let match;

  while ((match = regex.exec(texto)) !== null) {
    let unit = match[3]
      .replace("gramo", "g")
      .replace("mililitro", "ml")
      .replace("unidad", "unidad");

    ingredientes.push({
      name: match[1].trim().toLowerCase(),
      amount: parseFloat(match[2]),
      unit: unit,
    });
  }

  return ingredientes;
}

export async function obtenerImagenReceta(url) {
  try {
    const res = await fetch("/api/proxy?url=" + encodeURIComponent(url));
    const html = await res.text();

    const match = html.match(
      /https:\/\/img\.hellofresh\.com[^"]+Main_high[^"]+\.jpg/,
    );

    if (match) {
      return match[0];
    }

    return null;
  } catch (e) {
    console.error("Error obteniendo imagen", e);
    return null;
  }
}
