import { create } from "zustand"
import toast from "react-hot-toast"
import axios from "../lib/axios"


export const useProductStore = create((set) => ({
    products: [],
    loading: false,
    deleteItem: null,
    

    setProducts: (products) => set({ products }),
    
    createProduct: async (productData) => {
      set({ loading: true })
      try {
        const response = await axios.post("/products", productData)
        set((prevState) => ({
            products: [...prevState.products, response.data.product],
            loading: false,
        }))
        toast.success("Successfully created a product")


        return true
      } catch (error) {
        error.response ? toast.error(error.response.data.error) : toast.error(error.message)
        set({ loading: false })

        return false
      }
    },

    fetchAllProducts: async() => {
      set({ loading: true })
      try {
        const response = await axios.get("/products")
        console.log(response);
        
        set({ products: response.data, loading: false })
      } catch (error) {
        set({ error: "Failed to fetch products", loading: false })
        error.response ? toast.error(error.response.data.error) :
        toast.error(error.message)
      }
    },
    fetchProductsByCategory: async (category) => {
      set({ loading: true })
      try {
        const response = await axios.get(`products/category/${category}`)
        set({ products: response.data, loading: false })
      } catch (error) {
        set({ error: "Failed to fetch products", loading: false })
        error.response ? toast.error(error.response.data.error) :
        toast.error(error.message)
      }
    },

    deleteProduct: async(productId) => {
      set((prevProducts) => ({
        loading: true,
        deleteItem: prevProducts.products.find(product => product._id === productId)
      }))
      try {
        await axios.delete(`/products/${productId}`)
        set((prevProducts) => ({
          products: prevProducts.products.filter((product) => product._id !== productId),
          loading: false,
        }))
      } catch (error) {
        set({ loading: false })
        error.response ? toast.error(error.response.data.error)
        : toast.error(error.message)
      }
      
    },
    toggleFeaturedProduct: async(productId) => {
      set({ loading: true })
      try {
        const response = await axios.patch(`/products/${productId}`)
        set((prevProducts) => ({
          products: prevProducts.products.map((product) => (
            product._id === productId ? { ...product, isFeatured: response.data.isFeatured } : product
          )),
          loading: false
        }))
      } catch (error) {
        error.response ? toast.error(error.response.data.error) :
        toast.error(error.message)
      }
    },
    
    
}))