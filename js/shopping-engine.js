import { obtenerStock } from "./inventory-engine.js";

export async function calcularCompraNecesaria(ingredientes) {
  const stock = await obtenerStock();

  const compra = [];

  ingredientes.forEach((ing) => {
    const producto = stock.find((p) =>
      p.nombre.toLowerCase().includes(ing.nombre),
    );

    if (!producto) {
      compra.push({
        nombre: ing.nombre,
        cantidad: ing.cantidad,
      });

      return;
    }

    if (producto.stock < ing.cantidad) {
      compra.push({
        nombre: producto.nombre,
        cantidad: ing.cantidad - producto.stock,
      });
    }
  });

  return compra;
}
