import axios from "axios";
import { useGlobalStore } from "../store/useGlobalStore";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

const VALID_JOB_STATUSES = ["scheduled", "started", "completed"];

function extractJobStatus(data) {
  if (!data || typeof data !== "object") return null;

  return (
    data.jobStatus ??
    data.data?.jobStatus ??
    data.job?.jobStatus ??
    null
  );
}

function syncJobStatusFromResponse(data) {
  const jobStatus = extractJobStatus(data);

  if (!jobStatus || !VALID_JOB_STATUSES.includes(jobStatus)) {
    return;
  }

  const state = useGlobalStore.getState();

  if (typeof state.setJobStatus === "function") {
    state.setJobStatus(jobStatus);
  }

  if (typeof state.handleJobStatusChange === "function") {
    state.handleJobStatusChange(jobStatus, data);
  }
}

api.interceptors.response.use(
  (response) => {
    syncJobStatusFromResponse(response.data);
    return response;
  },
  (error) => {
    syncJobStatusFromResponse(error?.response?.data);
    return Promise.reject(error);
  }
);

export default api;