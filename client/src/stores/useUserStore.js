import { create } from "zustand"
import axios from "../lib/axios"
import { toast } from "react-hot-toast"


export const useUserStore = create((set, get) => ({
  user: localStorage.getItem("user"),
  loading: false,
  checkingAuth: true,
  refreshError: null, // Add this to track refresh failures


  signup: async ({ name, email, password, confirmPassword }) => {
    set({ loading: true })

    if (password !== confirmPassword) {
      set({ loading: false })
      return toast.error("Passwords do not match")
    }

    try {
      const response = await axios.post("/auth/signup", { name, email, password })
      console.log(response);
      localStorage.setItem("user", JSON.stringify({ user: "logged in" }))
      set({ user: response.data, loading: false })
      toast.success("Sign up successful")
    } catch (error) {

      toast.error(error.response.data.error)
      set({ loading: false })
    }
  },

  login: async (email, password) => {
    set({ loading: true })

    try {
      const response = await axios.post("/auth/login", { email, password })
      console.log(response);
      localStorage.setItem("user", JSON.stringify({ user: "logged in" }))
      set({ user: response.data, loading: false })
      toast.success("Login successful")

    } catch (error) {
      set({ loading: false })
      console.log(error);
      if (error.response?.data?.error) {
        toast.error(error.response.data.error)
      } else {
        toast.error(error.message)
      }

    }
  },

  checkAuth: async () => {
    set({ checkingAuth: true });
    try {
      const response = await axios.get("/auth/profile");
      set({ user: response.data, checkingAuth: false, refreshError: null });
    } catch (error) {
      // Don't immediately set user to null on 401 - let interceptor try refresh first
      set({ checkingAuth: false });
      if (error.response?.status !== 401) {
        // Only set user to null for non-401 errors
        set({ user: null });
        toast.error(error.message);
      }
    }
  },

  logout: async () => {
    try {
      await axios.post("/auth/logout");
      localStorage.removeItem("user");
      set({ user: null, checkingAuth: false, refreshError: null });
    } catch (error) {
      toast.error(error.response?.data?.error || "An error occurred during logout");
    }
  },

  refreshToken: async () => {
    try {
      set({ checkingAuth: true });
      const response = await axios.post("/auth/refresh-token");
      set({ checkingAuth: false, refreshError: null });
      return response.data; // Return the new tokens if needed
    } catch (error) {
      console.log("Refresh token error", error);
      set({ 
        user: null, 
        checkingAuth: false,
        refreshError: error.response?.data?.error || "Session expired"
      });
      localStorage.removeItem("user");
      throw error; // Important to re-throw so interceptor can handle it
    }
  },
}))



// Axios interceptor for token refresh
let refreshPromise = null;

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Only handle 401 errors and not retried requests
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Skip refresh attempt if this was already a refresh token request
      if (originalRequest.url === "/auth/refresh-token") {
        useUserStore.getState().logout();
        return Promise.reject(error);
      }

      try {
        // If a refresh is already in progress, wait for it
        refreshPromise = refreshPromise || useUserStore.getState().refreshToken();
        await refreshPromise;
        refreshPromise = null;
        
        // Retry the original request with new token
        return axios(originalRequest);
      } catch (refreshError) {
        refreshPromise = null;
        // If refresh fails, logout and reject
        useUserStore.getState().logout();
        return Promise.reject(refreshError);
      }
    }
    
    // For non-401 errors or already retried requests
    return Promise.reject(error);
  }
);