export async function obtenerStock() {
  const { data, error } = await supabaseClient.from("stock_actual").select("*");

  if (error) {
    console.error(error);
    return [];
  }

  return data;
}
