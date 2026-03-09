export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    res.status(400).send("Missing url");
    return;
  }

  try {
    const r = await fetch(url);
    const text = await r.text();

    res.status(200).send(text);
  } catch (e) {
    res.status(500).send("Proxy error");
  }
}
