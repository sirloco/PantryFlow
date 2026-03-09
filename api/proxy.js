export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).send("Missing url");
  }

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: req.headers.authorization || "",
        Accept: "application/json",
      },
    });

    const text = await response.text();

    res.status(response.status).send(text);
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).send("Proxy failed");
  }
}
