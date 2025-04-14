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
      console.log("USER", error);
      console.log(error);
      set({ user: null, checkingAuth: false })

    } 
  },

  logout: async () => {
    try {
      await axios.post("/auth/logout")
      localStorage.removeItem("user")
      set({ user: null, checkingAuth: false})
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
let refreshSubscribers = [];

function onRefreshed() {
  refreshSubscribers.forEach(callback => callback());
  refreshSubscribers = [];
}

function addRefreshSubscriber(callback) {
  refreshSubscribers.push(callback);
}


async function waitForRefresh() {
  return new Promise(resolve => {
    if (!isRefreshing) return resolve();
    const interval = setInterval(() => {
      if (!isRefreshing) {
        clearInterval(interval);
        resolve();
      }
    }, 100); // check every 100ms
  });
}


if(localStorage.getItem("user")) {
  axios.interceptors.response.use(
    response => response,
    async error => {
      const originalRequest = error.config;
  
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
  
        if (!isRefreshing) {
          isRefreshing = true;
          try {
            await axios.post("/auth/refresh-token");
          
            isRefreshing = false;

            onRefreshed();
          } catch (refreshError) {
            console.log(refreshError);
            
            isRefreshing = false;
            
            
            return Promise.reject(refreshError); // for other errors
          }
        }
  
        return new Promise((resolve) => {
          addRefreshSubscriber(() => {
            resolve(axios(originalRequest));
          });
        });
      }
  
      return Promise.reject(error);
    }
  );
  
}

if(!useUserStore.getState().user) {
  setTimeout(() => {
    useUserStore.setState({ checkingAuth: false })
  }, 6000)
}

