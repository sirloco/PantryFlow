async function cargarInventario() {

  const { data, error } = await supabaseClient
    .from("stock_actual")
    .select("*")
    .order("nombre", { ascending: true });

  if (error) {
    console.error("Error:", error);
    return;
  }

  const contenedor = document.getElementById("stock-container");
  contenedor.innerHTML = "";

  data.forEach(producto => {

    const card = document.createElement("div");
    card.className = `
      bg-white/5 backdrop-blur-md
      px-6 py-4 rounded-xl
      border border-white/10
      shadow-[2px_2px_6px_rgba(0,167,42,0.6)]
      transition-all duration-200
      hover:shadow-[4px_4px_10px_rgba(0,167,42,0.8)]
    `;

    card.innerHTML = `
      <div class="flex justify-between items-center">
        <h3 class="text-lg font-semibold tracking-wide">
          ${producto.nombre}
        </h3>
        <span class="text-sm font-bold px-3 py-1 rounded-full
                     bg-emerald-500/20 text-emerald-400">
          ${producto.stock}
        </span>
      </div>
    `;

    contenedor.appendChild(card);

    
    
  });
    const titulo = document.getElementById("tituloMovimiento");

  btnEntrada.addEventListener("click", () => {
  titulo.classList.remove("text-red-400");
  titulo.classList.add("text-emerald-400");
  });

  btnSalida.addEventListener("click", () => {
  titulo.classList.remove("text-emerald-400");
  titulo.classList.add("text-red-400");
  });

}

cargarInventario();