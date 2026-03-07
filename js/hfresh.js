const HFRESH_TOKEN =
  "211|nhuth_hfdb_nne4Qi9ivpSosTawB6I8RzOF4lMNKpz9Am4mMxfm49eb5033";

export async function obtenerRecetas(numero = 10) {
  const url =
    "https://corsproxy.io/?https://api.hfresh.info/es-ES/recipes?per_page=" +
    numero;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${HFRESH_TOKEN}`,
      Accept: "application/json",
    },
  });
  const data = await res.json();
  return data.data;
}

export async function obtenerRecetaCompleta(id) {
  const url =
    "https://corsproxy.io/?https://api.hfresh.info/es-ES/recipes/" + id;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${HFRESH_TOKEN}`,
      Accept: "application/json",
    },
  });
  const data = await res.json();
  return data.data;
}

export async function obtenerImagenReceta(url) {
  try {
    const res = await fetch("https://corsproxy.io/?" + url);
    const html = await res.text();

    // buscar imagen HelloFresh limpia
    const match = html.match(
      /https:\/\/img\.hellofresh\.com[^"]+Main_high[^"]+/,
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
