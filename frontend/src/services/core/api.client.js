import axios from "axios";

/**
 * Configured axios instance for API communication.
 */
const apiBaseURL = import.meta.env.VITE_API_BASE_URL;

if (!apiBaseURL && import.meta.env.PROD) {
  throw new Error("VITE_API_BASE_URL must be set in production.");
}

const apiClient = axios.create({
  baseURL: apiBaseURL || "http://localhost:3778",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Request interceptor to attach the JWT token to headers.
 */
apiClient.interceptors.request.use(
  (config) => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

/**
 * Response interceptor to handle global 401 unauthorized errors.
 */
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Skip global 401 redirect for auth endpoints so components can handle login/register errors
    const requestUrl = error.config?.url ?? "";
    const isAuthEndpoint = /\/api\/auth\/(login|register)(?:\/|$|\?)/.test(
      requestUrl,
    );

    if (error.response?.status === 401 && !isAuthEndpoint) {
      // Clear authentication data
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // Redirect to login page
      window.location.assign(
        new URL("/auth", window.location.origin).toString(),
      );
    }
    return Promise.reject(error);
  },
);

export { apiClient };
