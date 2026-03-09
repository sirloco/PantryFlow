export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).send("Missing url");
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return res.status(response.status).send("Upstream error");
    }

    const text = await response.text();

    res.setHeader("Content-Type", "text/html");
    res.status(200).send(text);
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).send("Proxy failed");
  }
}
