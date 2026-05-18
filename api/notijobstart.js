import axios from "axios";

export default async function handler(req, res) {
  // ---- CORS ----
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const apiURL  = process.env.API_URL;
  const apiKey  = process.env.API_KEY_PRIVADA;

  if (!apiURL || !apiKey) {
    return res.status(500).json({ error: "Missing API credentials" });
  }

  try {
    switch (req.method) {
      case "POST":
        return await handlePost(req, res, apiURL, apiKey);

      default:
        res.setHeader("Allow", ["GET", "POST", "PUT"]);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error("API tracker error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

async function handlePost(req, res, apiURL, apiKey) {
  
  const url = `${apiURL}api/job/tracker/location`;

  const payload = {
    trackerId: req.body.id,
    notiOffStartJob: true,
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
    });
    
    return res.status(response.status).json(response.data);

  } catch (error) {
    console.error("POST error:", error.response?.data || error.message);

    return res
      .status(error.response?.status || 500)
      .json(error.response?.data || { error: "Request failed" });
  }
}
