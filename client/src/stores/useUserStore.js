import { create } from "zustand"
import axios from "../lib/axios"
import { toast } from "react-hot-toast"


export const useUserStore = create((set, get) => ({
  user: null,
  loading: false,
  checkingAuth: true,


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
    await waitForRefresh(); // 🕓 wait if refresh is happening
    set({ checkingAuth: true })
    try {
      const response = await axios.get("/auth/profile")
      set({ user: response.data, checkingAuth: false })

    } catch (error) {
      set({ user: null, checkingAuth: false })

    }
  },

  logout: async () => {
    try {
      await axios.post("/auth/logout")
      localStorage.removeItem("user")
      set({ user: null, checkingAuth: false })
    } catch (error) {
      toast.error(error.response?.data?.error || "An error occured during logout")
    }
  },

  refreshToken: async () => {
    // Prevent multiple simultaneous refresh attempts
    if (get().checkingAuth) return;

    set({ checkingAuth: true });
    try {
      const response = await axios.post("/auth/refresh-token");
      set({ checkingAuth: false });
      return response.data;
    } catch (error) {
      set({ user: null, checkingAuth: false });
      throw error;
    }
  },
}))



// TODO implement the axios interceptors for refreshing access token 15m


let isRefreshing = false;
let refreshErrorHolder = null;
const subscribers = [];

function addRefreshSubscriber(callback) {
  subscribers.push(callback);
}

function onRefreshed() {
  subscribers.forEach(callback => callback());
  subscribers.length = 0; // clear subscribers
}


function waitForRefresh(timeout = 5000) {
  return new Promise((resolve, reject) => {
    if (!isRefreshing) {
      if (refreshErrorHolder) {
        useUserStore.setState({ checkingAuth: false });
        return reject(refreshErrorHolder);
      } else {
        return resolve();
      }
    }

    const start = Date.now();
    const interval = setInterval(() => {
      if (!isRefreshing) {
        clearInterval(interval);
        if (refreshErrorHolder) {
          console.error("waitForRefresh detected refresh failure");
          useUserStore.setState({ checkingAuth: false });
          reject(refreshErrorHolder);
        } else {
          resolve();
        }
      } else if (Date.now() - start >= timeout) {
        clearInterval(interval);
        const timeoutError = new Error("Refresh timeout");
        console.error("waitForRefresh rejected:", timeoutError.message);
        useUserStore.setState({ checkingAuth: false });
        reject(timeoutError);
      }
    }, 100);
  });
}

if (localStorage.getItem("user")) {
  axios.interceptors.response.use(
    response => response,
    async error => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        if (!isRefreshing) {
          isRefreshing = true;
          refreshErrorHolder = null;

          try {
            await axios.post("/auth/refresh-token");
            isRefreshing = false;
            onRefreshed();
          } catch (refreshError) {
            console.error("Refresh token request failed:", refreshError);
            refreshErrorHolder = refreshError;
            isRefreshing = false;
            onRefreshed(); // still notify waiting requests
          }
        }

        try {
          await waitForRefresh();

          // Only retry if refresh succeeded
          return axios(originalRequest);
        } catch (err) {
          // Now you can make a decision here, e.g. logout user
          console.error("Interceptor caught failed refresh:", err.message);
          // e.g., logoutUser(); or redirect to login
          return Promise.reject(err); // let it bubble to caller
        }
      }

      return Promise.reject(error);
    }
  );

}