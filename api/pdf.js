import axios from "axios";

export async function getPdf(req, res, apiURL, apiKey) {
  const { uuid } = req.params;

  try {
    const endpoint = `${apiURL}api/job/tracker/${uuid}`;

    const response = await axios.get(endpoint, {
      headers: {
        "x-api-key": apiKey,
      },
      responseType: "arraybuffer",
    });

    res.setHeader("Content-Type", "application/pdf");
    res.send(response.data);
  } catch (error) {
    console.error("PDF proxy error:", error.response?.data || error);
    res.status(500).json({ error: "Failed to fetch PDF" });
  }
};

