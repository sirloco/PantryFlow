import { toast } from "./menu.js";
import { cocinarReceta } from "./menu.js";

export function activarEventos(card, menuActual, poolRecetas) {
  const bloquearBtn = card.querySelector(".bloquear");
  const regenBtn = card.querySelector(".regen");
  const cocinarBtn = card.querySelector(".cocinar");

  if (bloquearBtn) {
    bloquearBtn.onclick = (e) => {
      e.stopPropagation();

      const locked = card.dataset.locked === "true";
      if (card.dataset.cooked === "true") return;

      if (locked) {
        card.dataset.locked = "false";
        card.style.outline = "none";
        card.style.opacity = "1";
        bloquearBtn.textContent = "🔓";
      } else {
        card.dataset.locked = "true";
        card.style.outline = "2px solid #14b8a6";
        card.style.opacity = "0.8";
        bloquearBtn.textContent = "🔒";
      }
    };
  }

  if (regenBtn) {
    regenBtn.onclick = async (e) => {
      e.stopPropagation();

      if (card.dataset.locked === "true") return;
      if (card.dataset.cooked === "true") return;

      const usadas = Array.from(document.querySelectorAll(".card")).map(
        (c) => c.dataset.id,
      );

      const protein = card.dataset.protein;

      const disponibles = poolRecetas.filter(
        (r) => tipoProteina(r) === protein && !usadas.includes(String(r.id)),
      );

      if (!disponibles.length) {
        toast("No hay más recetas de ese tipo");
        return;
      }

      const nueva = disponibles[Math.floor(Math.random() * disponibles.length)];

      const foto = nueva.foto || (await obtenerImagenReceta(nueva.url || ""));

      const img = card.querySelector("img");
      if (img) img.src = foto;
      card.dataset.id = nueva.id;
      const recetaEstado = menuActual.recetas.find(
        (r) => r.menu_receta_id === card.dataset.menuRecetaId,
      );

      if (recetaEstado) {
        recetaEstado.id = nueva.id;
        recetaEstado.hf_recipe_id = nueva.id;
        recetaEstado.name = nueva.name;
      }

      card.onclick = () => window.open(nueva.url, "_blank");
    };
  }

  if (cocinarBtn) {
    cocinarBtn.onclick = async (e) => {
      e.stopPropagation();

      // 🚫 evitar cocinar dos veces
      if (card.dataset.cooked === "true") return;

      const hfId = Number(card.dataset.id);
      const menuRecetaId = card.dataset.menuRecetaId?.trim();
      try {
        const ok = await cocinarReceta(hfId, menuRecetaId);

        if (!ok) return;

        card.dataset.cooked = "true";

        card.style.opacity = "0.5";
        cocinarBtn.textContent = "✓";
        card.classList.add("grayscale");
      } catch (err) {
        console.error(err);
        toast("Error cocinando receta");
      }
    };
  }
}
