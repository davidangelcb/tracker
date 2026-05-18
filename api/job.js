import axios from "axios";

// MOCK ACTIVATION
let mockJob = null;

const shouldMock =
  process.env.NODE_ENV !== "production" &&
  process.env.MOCK_API === "true";

if (shouldMock) {
  try {
    const module = await import("./mocks/job.js");
    mockJob = module.default;
    console.log("Mock loaded successfully.");
  } catch (err) {
    console.warn("Mock not loaded: file not found or mock error.", err);
  }
}
// ROUTES MAP
const ROUTES = {
  GET: {
    job: handleGetJob,
    pdf: getPdf,
    getphotos: getPhotos,
    fetchPhotoById: fetchPhotoById,
  },

  POST: {
    tracker: handlePostTracker,
    toDb: toDb,
    deletePhoto: deletePhoto,
    finishJobApi: finishJobApi,
  },

  PUT: {
    generateSignature: generateSignature,
  },
  
};

export default async function handler(req, res) {

  // --- CORS ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // --- MOCK RESPONSE ---
  if (req.method === "GET" && mockJob) {
    return res.status(200).json(mockJob);
  }

  const apiURL = process.env.API_URL;
  const apiKey = process.env.API_KEY_PRIVADA;

  if (!apiURL || !apiKey) {
    return res.status(500).json({ error: "Missing API credentials" });
  }

  try {
    return await routeRequest(req, res, apiURL, apiKey);

  } catch (error) {
    console.error("API job error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

async function routeRequest(req, res, apiURL, apiKey) {
  const method = req.method;
  const methodRoutes = ROUTES[method];

  if (!methodRoutes) {
    return res.status(405).json({ error: `Method ${method} not supported` });
  }

  const actionQuery = req.query?.action;

  // soporte para "data.action" cuando el frontend envía payload como data:{...}
  const actionBody =
    req.body?.action ||
    req.body?.data?.action ||
    null;

  const actionPath =
    req.url.split("?")[0].replace("/api/job", "").replace("/", "") || null;

  const action = actionQuery || actionBody || actionPath;

  if (!action || !methodRoutes[action]) {
    return res.status(400).json({ error: `Unknown action '${action}'` });
  }

  return methodRoutes[action](req, res, apiURL, apiKey);
}


// GET HANDLERS
async function handleGetJob(req, res, apiURL, apiKey) {
  const jobId = req.query.id;
  const url = `${apiURL}api/job/${jobId}`;
  // console.log(url);

  try {
    const response = await axios.get(url, {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
    });

    return res.status(response.status).json(response.data);

  } catch (error) {
    console.error("GET error:", error.response?.data || error.message);

    return res
      .status(error.response?.status || 500)
      .json(error.response?.data || { error: "Request failed" });
  }
}

// POST HANDLERS
async function handlePostTracker(req, res, apiURL, apiKey) {
  const url = `${apiURL}api/job/tracker`;

  try {
    const response = await axios.post(url, req.body, {
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

// PUT HANDLERS
async function generateSignature(req, res, apiURL, apiKey) {
  const url = `${apiURL}api/job/uploadUrl`;

  try {
    const response = await axios.post(url, req.body, {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
    });

    return res.status(response.status).json(response.data);

  } catch (error) {
    console.error("PUT error:", error.response?.data || error.message);

    return res
      .status(error.response?.status || 500)
      .json(error.response?.data || { error: "Request failed" });
  }
}

async function toDb(req, res, apiURL, apiKey) {
  const url = `${apiURL}api/job/tracker/evidence`;

  try {
    const cleanBody = { ...req.body };
    delete cleanBody.action;

    const response = await axios.put(url, cleanBody, {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
    });

    return res.status(response.status).json(response.data);

  } catch (error) {
    console.error("PUT error:", error.response?.data || error.message);

    return res
      .status(error.response?.status || 500)
      .json(error.response?.data || { error: "Request failed" });
  }
}


// DELETE HANDLERS
async function deletePhoto(req, res, apiURL, apiKey) {

  const url = `${apiURL}api/job/tracker/evidence`;

  const payload = req.body.data || req.body;
  delete payload.action;

  try {
    const result = await axios.delete(url, {
      headers: { 
        "Content-Type": "application/json",
        "x-api-key": apiKey
      },
      data: payload
    });

    return res.status(result.status).json(result.data);

  } catch (err) {
    console.error("deletePhoto error", err.response?.data || err.message);
    return res.status(err.response?.status || 500).json({ error: "delete failed" });
  }
}

// FINISH JOB BUTTON
async function finishJobApi(req, res, apiURL, apiKey) {
  const url = `${apiURL}api/job/tracker/evidence`;

  const payload = req.body.data || req.body;
  delete payload.action;

  try {
    const response = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
    });

    return res.status(response.status).json(response.data);

  } catch (error) {
    console.error("Error: Finish Job:", error.response?.data || error.message);

    return res
      .status(error.response?.status || 500)
      .json(error.response?.data || { error: "Request failed" });
  }
}

async function getPdf(req, res, apiURL, apiKey) {
  const uuid = req.query.uuid;

  if (!uuid) {
    return res.status(400).json({ error: "UUID is required" });
  }

  try {
    const endpoint = `${apiURL}api/job/tracker/${uuid}`;

    const response = await axios.get(endpoint, {
      headers: { "x-api-key": apiKey }
    });

    return res.json({
      status: "ok",
      pdfUrl: response.data.pdfUrl
    });

  } catch (error) {
    console.error("PDF proxy error:", error.response?.data || error);
    
    return res.status(500).json({
      status: "error",
      message: "Failed to get PDF URL"
    });
  }
}


async function getPhotos(req, res, apiURL, apiKey) {
  const trackerId = req.query.tracker_id;
  const categoryId = req.query.category_id;

  if (!trackerId) {
    return res.status(400).json({ error: "TrackerID is required" });
  }

  try {
    const endpoint = `${apiURL}api/job/tracker/evidences/${trackerId}/${categoryId}/`;

    const response = await axios.get(endpoint, {
      headers: { "x-api-key": apiKey }
    });

    // console.log("RES FOTOS cat: " + categoryId, response.data);
    
    return res.status(200).json(response.data);

  } catch (error) {
    console.error("Images proxy error:", error.response?.data || error);
    
    return res.status(500).json({
      status: "error",
      message: "Failed to get PHOTOS"
    });
  }
}

async function fetchPhotoById(req, res, apiURL, apiKey) {
  const photoId = req.query.photo_id;

  if (!photoId) {
    return res.status(400).json({ error: "photo_id is required" });
  }

  try {
    const url = `${apiURL}api/job/tracker/evidence/${photoId}`;

    const response = await axios.get(url, {
        headers: { "x-api-key": apiKey }
      });
    
    console.log('fetchPhotoById() response:', response.data);
    return res.status(200).json(response.data);

  } catch (error) {
    console.error("fetchPhotoById() error:", error.response?.data || error);
    
    return res.status(500).json({
      status: "error",
      message: "Failed to get PHOTO by ID"
    });
  }

}

