import cloudinary from "../lib/cloudinary.js";
import productModel from "../models/product.model.js"


const getAllProducts = async (req, res) => {
    try {
        const products = await productModel.find({}) //find sll products

        res.status(200).json(products)
    } catch (error) {
        console.log("Error in getAllProduct function", error.message);
        res.status(500).json({ message: "Server error", error: error.message })
    }
}

const getFeaturedProducts = async (req, res) => {
    try {
        let featuredProducts = await redis.get("featured_products")
        if (featuredProducts) {
            return res.json(JSON.parse(featuredProducts))
        }

        // if not in redis, fetch from mongodb
        // .lean() is gonna return a plain javascript object instead of a mongodb document
        // which is good for performance
        featuredProducts = await productModel.find({ isFeatured: true }).lean()

        if (!featuredProducts) {
            return res.status(404).json({ error: "No featured products found" })
        }

        // store in redis for future quick access
        await redis.set("featured_products", JSON.stringify(featuredProducts))

        res.status(200).json(featuredProducts)

    } catch (error) {
        console.log("Error in getFeaturedProducts function", error.message);
        res.status(500).json({ message: "Server error", error: error.message })
    }
}

const createProduct = async (req, res) => {
    try {
        const { name, decription, price, image, category } = req.body

        let cloudinaryResponse = null

        if (image) {
            cloudinaryResponse = await cloudinary.uploader.upload(image, { folder: "products" })
        }

        const product = await productModel.create({
            name,
            description,
            price,
            image: cloudinaryResponse?.secure_url ? cloudinaryResponse.secure_url : "",
            category
        })

        res.status(201).json(product)

    } catch (error) {
        console.log("Error in createProduct function", error.message);
        res.status(500).json({ message: "Server error", error: error.message })
    }
}

const deleteProduct = async (req, res) => {
    try {
        const product = await productModel.findById(req.params.id)

        if (!product) {
            return res.status(404).json({ error: "Product not found" })
        }

        if (product.image) {
            const publicId = product.image.split("/").pop().split(".")[0]

            try {
                await cloudinary.uploader.destroy(`products/${publicId}`)
                console.log("Deleted image from cloudinary");

                await productModel.findByIdAndDelete(req.params.id)

                res.json({ message: "Product deleted successfully" })
            } catch (error) {
                console.log("error deleting image from cloudinary", error);

            }
        }


    } catch (error) {
        console.log("Error in deleteProduct function", error.message);
        res.status(500).json({ message: "Server error", error: error.message })
    }
}

const  getRecommendedProducts = async(req, res) => {
    try {
      const products = await productModel.aggregate([
        {
            $sample: { size: 3 }
        },
        {
            $project: {
                _id: 1,
                name: 1,
                description: 1,
                image: 1,
                price: 1
            }
        }

      ])
      res.status(200).json(products)
    } catch (error) {
        console.log("Error in getRecommendedProducts function", error.message);
        res.status(500).json({ message: "Server error", error: error.message })
    }
}

const getProductsByCategory = async(req, res) => {
    const { category } = req.params
    try {
      const products = await productModel.find({ category })

      res.status(200).json(products) 

    } catch (error) {
        console.log("Error in getProductsByCategory function", error.message);
        res.status(500).json({ message: "Server error", error: error.message }) 
    }
}

const toggleFeaturedProduct = async(req, res) => {
    try {
        const product = await product.findById(req.params.id)
        if(product) {
            product.isFeatured = !product.isFeatured
            const updatedProduct = await product.save()

            await updateFeaturedProductCache()
            res.json(updatedProduct)
        } else {
            res.status(404).json({ error: "Product not found" })
        }
        
    } catch (error) {
        console.log("Error in toggleFeaturedProduct function", error.message);
        res.status(500).json({ message: "Server error", error: error.message })  
    }

}

async function updateFeaturedProductCache() {
    try {
      const featuredProducts =  await productModel.find({ isFeatured: true }).lean()
      await redis.set("featured_products", JSON.stringify(featuredProducts))
    } catch (error) {
        console.log("Error in updateFeaturedProductCache function", error.message);
       
    }
}



export { 
    getAllProducts,
    getFeaturedProducts,
    createProduct, deleteProduct,
    getRecommendedProducts,
    getProductsByCategory,
    toggleFeaturedProduct
}