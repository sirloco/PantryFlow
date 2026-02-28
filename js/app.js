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
      border border-emerald-500/10
      rounded-xl overflow-hidden
      transition-all duration-300
      cursor-pointer
      hover:border-emerald-500/40
      hover:shadow-[0_0_40px_rgba(16,185,129,0.55)]
    `;

    const imagen = item.imagen_url 
      ?? "https://via.placeholder.com/200x200?text=No+Image";

    card.innerHTML = `
      <div class="w-full aspect-square bg-zinc-800">
        <img src="${imagen}"
             class="w-full h-full object-cover">
      </div>

      <div class="border-t border-emerald-500/10 p-2">

        <h3 class="text-xs font-semibold text-emerald-400 truncate">
          ${item.nombre}
        </h3>

        <p class="text-[11px] text-zinc-400 mt-1">
          ${item.stock} ${item.unidad ?? ""}
        </p>

      </div>
    `;

    contenedor.appendChild(card);

  });

}

cargarInventario();