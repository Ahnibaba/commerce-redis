import { useEffect, useState } from "react"
import ProductCard from "./ProductCard"
import axios from "../lib/axios"
import { useNavigate } from "react-router-dom"
import LoadingSpinner from "./LoadingSpinner"

const PeopleAlsoBought = () => {
  const [recommendations, setRecommendations] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  const navigate = useNavigate()


  useEffect(() => {
     const fetchRecommendations = async () => {
       try {
        const response = await axios.get("/products/recommendations")
        setRecommendations(response.data)
        setIsLoading(false)
       } catch (error) {
        error.response ? toast.error(error.response.data.error) : error.response.status === 401 ?
        navigate("/login") :  toast.error(error.message)
       } finally {
        setIsLoading(false)
       }
     }

     fetchRecommendations()
  }, [])

  // if(isLoading) {
  //   return <LoadingSpinner />
  // }
  return (
    <div className="mt-8">
       <h3 className="text-2xl font-semibold text-emerald-400">
         People also bought
       </h3>
       <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-col-3">
          {recommendations.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
       </div>
    </div>
  )
}

export default PeopleAlsoBought