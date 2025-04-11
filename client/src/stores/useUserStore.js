import { create } from "zustand"
import axios from "../lib/axios"
import { toast } from "react-hot-toast"

const useUserStore = create((set, get) => ({
  user: null,
  loading: false,
  checkingAuth: true,

  signup: async ({ name, email, password, confirmPassword }) => {
    set({ loading: true })

    if(password !== confirmPassword) {
        set({ loading: false })
        return toast.error("Passwords do not match")
    }

    try {
        const response = await axios.post("/auth/signup", { name, email, password })
        console.log(response);
        
        set({ user: response.data, loading: false })
        toast.success("Sign up successful")
    } catch (error) {
        
        toast.error(error.response.data.error)
        set({ loading: false })
    }
  },

  login: async(email, password) => {
    set({ loading: true })

    try {
        const response = await axios.post("/auth/login", { email, password })
        console.log(response);
        set({ user: response.data, loading: false })
        toast.success("Login successful")
        
    } catch (error) {
        set({ loading: false })
        console.log(error);
        if(error.response?.data?.error) {
          toast.error(error.response.data.error) 
        }else {
          toast.error(error.message) 
        }
        
    }
  },

  checkAuth: async() => {
     set({ checkingAuth: true })
     try {
        const response = await axios.get("/auth/profile")
        set({ user: response.data, checkingAuth: false })
     } catch (error) {
        set({ user: null, checkingAuth: false })
     }
  },

  logout: async() => {
    try {
      await axios.post("/auth/logout")
      set({ user: null })
    } catch (error) {
      toast.error(error.response?.data?.error || "An error occured during logout")
    }
  }
}))

// TODO implement the axios interceptors for refreshing access token 15m

export default useUserStore