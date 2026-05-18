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
    detail: handleGetVideoDetail,
    category: handleGetVideosByCategory,
  },

  POST: {
    setMode: handleSetMode,
    upload: handleUploadVideoSignature,
    finish: handleFinishVideoJob,
    toDbReprocess: handleVideoToDbReprocess,
  },

  PUT: {
    toDb: handleVideoToDb,
  },

  DELETE: {
    removeFrame: handleRemoveVideoFrame,
    removeVideo: handleRemoveVideo,
  },
};

export default async function handler(req, res) {
  // --- CORS ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // --- MOCK RESPONSE ---
  if (req.method === "GET" && mockJob) {
    return res.status(200).json(mockJob);
  }

  try {
    return await routeRequest(req, res);
  } catch (error) {
    console.error("API video error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

async function routeRequest(req, res) {
  const method = req.method;
  const methodRoutes = ROUTES[method];

  if (!methodRoutes) {
    return res.status(405).json({ error: `Method ${method} not supported` });
  }

  const actionQuery = req.query?.action;

  const actionBody =
    req.body?.action ||
    req.body?.data?.action ||
    null;

  const actionPath =
    req.url.split("?")[0].replace("/api/video", "").replace("/", "") || null;

  const action = actionQuery || actionBody || actionPath;

  if (!action || !methodRoutes[action]) {
    return res.status(400).json({ error: `Unknown action '${action}'` });
  }

  return methodRoutes[action](req, res);
}

/* --------------------------------------------------
 * ACTION: setMode
 * Backend principal: API_URL + API_KEY_PRIVADA
 * -------------------------------------------------- */
async function handleSetMode(req, res) {
  const apiURL = process.env.API_URL;
  const apiKey = process.env.API_KEY_PRIVADA;

  if (!apiURL || !apiKey) {
    return res.status(500).json({ error: "Missing API credentials" });
  }

  const url = `${apiURL}api/job/tracker/evidence`;

  const payload = {
    trackerId: req.body?.trackerId,
    mode: req.body?.mode,
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
    console.error("setMode error:", error.response?.data || error.message);

    return res
      .status(error.response?.status || 500)
      .json(error.response?.data || { error: "Request failed" });
  }
}

/* --------------------------------------------------
 * ACTION: upload
 * Backend firma video: API_AIROUTER_URL + API_AIROUTER_TOKEN
 * -------------------------------------------------- */
async function handleUploadVideoSignature(req, res) {
  const apiBaseUrl = process.env.API_AIROUTER_URL;
  const authToken = process.env.API_AIROUTER_TOKEN;

  if (!apiBaseUrl || !authToken) {
    return res.status(500).json({ error: "Missing video upload credentials" });
  }

  const url = `${apiBaseUrl}/api/video/upload`;

  const payload = {
    filename: req.body?.filename,
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
    });

    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error(
      "upload video signature error:",
      error.response?.data || error.message
    );

    return res
      .status(error.response?.status || 500)
      .json(error.response?.data || { error: "Video upload signature failed" });
  }
}

/* --------------------------------------------------
 * ACTION: toDb
 * Backend principal: API_URL + API_KEY_PRIVADA
 * -------------------------------------------------- */
async function handleVideoToDb(req, res) {
  const apiURL = process.env.API_URL;
  const apiKey = process.env.API_KEY_PRIVADA;

  if (!apiURL || !apiKey) {
    return res.status(500).json({ error: "Missing API credentials" });
  }

  const url = `${apiURL}api/job/tracker/videos`;

  try {
    const cleanBody = { ...(req.body?.data || req.body) };
    delete cleanBody.action;

    const response = await axios.put(url, cleanBody, {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
    });

    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error("video toDb error:", error.response?.data || error.message);

    return res
      .status(error.response?.status || 500)
      .json(error.response?.data || { error: "Video DB save failed" });
  }
}

/* --------------------------------------------------
 * ACTION: toDbReprocess
 * Backend principal: API_URL + API_KEY_PRIVADA
 * Endpoint real: POST /api/job/tracker/videos/reprocess
 * Body: { idVideo }
 * -------------------------------------------------- */
async function handleVideoToDbReprocess(req, res) {
  const apiURL = process.env.API_URL;
  const apiKey = process.env.API_KEY_PRIVADA;

  if (!apiURL || !apiKey) {
    return res.status(500).json({ error: "Missing API credentials" });
  }

  const url = `${apiURL}api/job/tracker/videos/reprocess`;

  try {
    const cleanBody = { ...(req.body?.data || req.body) };
    delete cleanBody.action;

    const response = await axios.post(url, cleanBody, {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
    });

    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error(
      "video toDbReprocess error:",
      error.response?.data || error.message
    );

    return res
      .status(error.response?.status || 500)
      .json(error.response?.data || { error: "Video reprocess failed" });
  }
}

/* --------------------------------------------------
 * ACTION: detail
 * Backend principal: API_URL + API_KEY_PRIVADA
 * -------------------------------------------------- */
async function handleGetVideoDetail(req, res) {
  const apiURL = process.env.API_URL;
  const apiKey = process.env.API_KEY_PRIVADA;

  if (!apiURL || !apiKey) {
    return res.status(500).json({ error: "Missing API credentials" });
  }

  const idVideo = req.query?.id;

  if (!idVideo) {
    return res.status(400).json({ error: "Missing video id" });
  }

  const url = `${apiURL}api/job/tracker/videos/${idVideo}`;

  try {
    const response = await axios.get(url, {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
    });

    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error("video detail error:", error.response?.data || error.message);

    return res
      .status(error.response?.status || 500)
      .json(error.response?.data || { error: "Video detail fetch failed" });
  }
}

/* --------------------------------------------------
 * ACTION: finish
 * Backend principal: API_URL + API_KEY_PRIVADA
 * -------------------------------------------------- */
async function handleFinishVideoJob(req, res) {
  const apiURL = process.env.API_URL;
  const apiKey = process.env.API_KEY_PRIVADA;

  if (!apiURL || !apiKey) {
    return res.status(500).json({ error: "Missing API credentials" });
  }

  const url = `${apiURL}api/job/tracker/videos`;

  const payload = {
    trackerId: req.body?.trackerId,
    location: req.body?.location || {
      lat: 0,
      lon: 0,
    },
  };

  console.log("-----");
  console.log("url", url);
  console.log("PAYLOAD FINISH", payload);

  try {
    const response = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
    });

    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error("finish video job error:", error.response?.data || error.message);

    return res
      .status(error.response?.status || 500)
      .json(error.response?.data || { error: "Video finish failed" });
  }
}

async function handleGetVideosByCategory(req, res) {
  const apiURL = process.env.API_URL;
  const apiKey = process.env.API_KEY_PRIVADA;

  if (!apiURL || !apiKey) {
    return res.status(500).json({ error: "Missing API credentials" });
  }

  const trackerId = req.query?.tracker_id;
  const categoryId = req.query?.category_id;

  if (!trackerId || !categoryId) {
    return res.status(400).json({
      error: "tracker_id and category_id are required",
    });
  }

  const url = `${apiURL}api/job/tracker/videos/${trackerId}/${categoryId}`;

  try {
    const response = await axios.get(url, {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
    });

    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error(
      "videos by category error:",
      error.response?.data || error.message
    );

    return res
      .status(error.response?.status || 500)
      .json(error.response?.data || { error: "Video category fetch failed" });
  }
}

/* --------------------------------------------------
 * ACTION: removeFrame
 * Backend principal: API_URL + API_KEY_PRIVADA
 * Endpoint real: DELETE /api/job/tracker/videos/images
 * Body: { idImage }
 * -------------------------------------------------- */
async function handleRemoveVideoFrame(req, res) {
  const apiURL = process.env.API_URL;
  const apiKey = process.env.API_KEY_PRIVADA;

  if (!apiURL || !apiKey) {
    return res.status(500).json({ error: "Missing API credentials" });
  }

  const idImage = req.body?.idImage;

  if (!idImage) {
    return res.status(400).json({
      error: "idImage is required",
    });
  }

  const url = `${apiURL}api/job/tracker/videos/images`;

  try {
    const response = await axios.delete(url, {
      data: { idImage },
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
    });

    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error(
      "remove video frame error:",
      error.response?.data || error.message
    );

    return res
      .status(error.response?.status || 500)
      .json(error.response?.data || { error: "Video frame remove failed" });
  }
}

/* --------------------------------------------------
 * ACTION: removeVideo
 * Backend principal: API_URL + API_KEY_PRIVADA
 * Endpoint real: DELETE /api/job/tracker/videos
 * Body: { trackerId, idCategory, tab, idVideo }
 * -------------------------------------------------- */
async function handleRemoveVideo(req, res) {
  const apiURL = process.env.API_URL;
  const apiKey = process.env.API_KEY_PRIVADA;

  if (!apiURL || !apiKey) {
    return res.status(500).json({ error: "Missing API credentials" });
  }

  const trackerId = req.body?.trackerId;
  const idCategory = req.body?.idCategory;
  const tab = req.body?.tab;
  const idVideo = req.body?.idVideo;

  if (!trackerId || !idCategory || !tab || !idVideo) {
    return res.status(400).json({
      error: "trackerId, idCategory, tab and idVideo are required",
    });
  }

  const url = `${apiURL}api/job/tracker/videos`;

  try {
    const response = await axios.delete(url, {
      data: {
        trackerId,
        idCategory,
        tab,
        idVideo,
      },
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
    });

    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error(
      "remove video error:",
      error.response?.data || error.message
    );

    return res
      .status(error.response?.status || 500)
      .json(error.response?.data || { error: "Video remove failed" });
  }
}
