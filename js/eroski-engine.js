export function generarBusquedaEroski(productos) {
  const nombres = productos.map((p) => p.nombre).join(",");

  return `https://supermercado.eroski.es/es/search/results?q=${encodeURIComponent(nombres)}`;
}
