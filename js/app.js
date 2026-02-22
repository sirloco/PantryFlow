async function cargarInventario() {

  const { data, error } = await supabaseClient
    .from("stock_actual")
    .select("*")
    .order("nombre", { ascending: true });

  if (error) {
    console.error("Error:", error);
    return;
  }

  const contenedor = document.createElement("div");
  contenedor.className = "max-w-2xl mx-auto mt-10 space-y-4";

  data.forEach(producto => {

    const card = document.createElement("div");
    card.className = "bg-white shadow-md rounded-xl p-5 border border-gray-200";

    card.innerHTML = `
      <div class="flex justify-between items-center">
        <h2 class="text-lg font-semibold text-gray-800">
          ${producto.nombre}
        </h2>
        <span class="text-sm font-bold px-3 py-1 rounded-full bg-blue-100 text-blue-700">
          Stock: ${producto.stock}
        </span>
      </div>
    `;

    contenedor.appendChild(card);

  });

  document.body.appendChild(contenedor);
}

cargarInventario();