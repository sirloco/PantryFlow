async function cargarInventario() {

  const { data, error } = await supabaseClient
    .from("stock_actual")
    .select("*");

  if (error) {
    console.error(error);
    return;
  }

  const contenedor = document.getElementById("stock-container");
  contenedor.innerHTML = "";

  data.forEach(item => {

    const card = document.createElement("div");
  
    card.className = `
      bg-zinc-900/70
      border border-zinc-800
      rounded-xl overflow-hidden
      transition-all duration-300
      cursor-pointer
      hover:border-emerald-500/40
      hover:shadow-[0_0_40px_rgba(16,185,129,0.55)]
    `;

    const imagen = item.imagen_url ?? "https://placehold.co/200x200";

    card.innerHTML = `
    <div class="drag-handle relative overflow-hidden h-32">
      <img src="${imagen}" class="w-full h-full object-cover">
    </div>
    <div class="p-3 space-y-1">
      <div class="text-sm font-semibold text-zinc-200 leading-snug truncate">${item.nombre}</div>
      <div class="text-sm text-emerald-400">${item.stock} ${item.unidad ?? ""}</div>
    </div>`;

    card.addEventListener("click", () => abrirModalMovimiento(item));

    contenedor.appendChild(card);

  });


  
}

const botonGuardar = document.getElementById("guardarProducto");

if (botonGuardar) {
  botonGuardar.addEventListener("click", async () => {

    const nombre = document.getElementById("nombre").value;
    let codigo_barras = document.getElementById("codigo_barras").value;
    const categoria = document.getElementById("categoria").value;
    const unidad = document.getElementById("unidad").value;
    const unitSize = document.getElementById("unit_size").value;
    const paquetes = document.getElementById("paquetes").value;
    const imagen = document.getElementById("imagen_url").value;
    const cantidadMovimiento = unitSize * paquetes;

    if (codigo_barras === "") {
      codigo_barras = null;
    }


    if (!nombre) {
      alert("El producto necesita nombre");
      return;
    }

    const { data, error } = await supabaseClient
      .from("productos")
      .insert([
        {
          nombre: nombre,
          codigo_barras: codigo_barras,
          categoria: categoria,
          unidad: unidad,
          unit_size: unitSize,
          imagen_url: imagen
        }
      ]).select();

    if (!error && paquetes > 0) {

      const producto_id = data[0].id;

      const { error: errorMovimiento } = await supabaseClient
        .from("movimientos")
        .insert([
          {
            producto_id: producto_id,
            tipo: "entrada",
            cantidad: cantidadMovimiento
          }
        ]);

      if (errorMovimiento) {
        console.error(errorMovimiento);
      }

    }

    if (error) {
      console.error(error);
      alert("Error al guardar producto");
      return;
    }

    alert("Producto guardado correctamente");

  });
}

let productoSeleccionado = null;

function abrirModalMovimiento(producto) {

  productoSeleccionado = producto;

  document.getElementById("modalProductoNombre").innerText =
    producto.nombre;

  document.getElementById("modalMovimiento").classList.remove("hidden");
}

document.getElementById("cancelarMovimiento").addEventListener("click", () => {

  document.getElementById("modalMovimiento").classList.add("hidden");

});

document.getElementById("guardarMovimiento").addEventListener("click", async () => {

  const tipo = document.getElementById("tipoMovimiento").value;
  const cantidad = document.getElementById("cantidadMovimiento").value;

  if (!cantidad || cantidad <= 0) {
    alert("Cantidad inválida");
    return;
  }

  const { error } = await supabaseClient
    .from("movimientos")
    .insert([
      {
        producto_id: productoSeleccionado.id,
        tipo: tipo,
        cantidad: cantidad
      }
    ]);

  if (error) {
    console.error(error);
    alert("Error guardando movimiento");
    return;
  }

  document.getElementById("modalMovimiento").classList.add("hidden");


  document.getElementById("nombre").value = "";
  document.getElementById("codigo_barras").value = "";
  document.getElementById("unit_size").value = "";
  document.getElementById("paquetes").value = "";
  document.getElementById("imagen_url").value = "";
  preview.src = "";

  cargarInventario();

});

cargarInventario();