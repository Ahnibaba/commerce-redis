import productModel from "../models/product.model.js";


const getCartProducts = async(req, res) => {
    try {
      const products = await productModel.find({ _id: { $in: req.user.cartItems } })

      // add quantity for each product
      const cartItems = products.map(product => {
        const item = req.user.cartItems.find(cartItem => cartItem.id === product.id)
        return { ...product.toJSON(), quantity: item.quantity }
      })

      res.status(200).json(cartItems)
    } catch (error) {
     console.log("Error in getCartProducts function", error.message);
     res.status(500).json({ message: "Server error", error: error.message })  
    } 
 }

const addToCart = async(req, res) => {
  try {
    const { productId } = req.body
    console.log(productId);
    
    const user = req.user

    const existingItem = user.cartItems.find(item => item.id === productId)
    if(existingItem) {
        existingItem.quantity += 1
    } else {
        user.cartItems.push(productId)
    }

    await user.save()
    res.status(200).json(user.cartItems)


  } catch (error) {
    console.log("Error in addToCart function", error.message);
    res.status(500).json({ message: "Server error", error: error.message }) 
  }
}


const removeAllFromCart = async(req, res) => {
   try {
     const { productId } = req.body
     const user = req.user
     if(!productId) {
        user.cartItems = []
     } else {
        user.cartItems = user.cartItems.filter(item => item.id !== productId)
     }
     await user.save()
     res.status(200).json(user.cartItems)
   } catch (error) {
    console.log("Error in removeAllFromCart function", error.message);
    res.status(500).json({ message: "Server error", error: error.message }) 
   } 
}

const updateQuantity = async(req, res) =>{
    try {
        const { id: productId } = req.params
        const { quantity } = req.body
        const user = req.user
        const existingItem = user.cartItems.find((item) => item.id === productId)

        if(existingItem) {
          if(quantity === 0) {
            user.cartItems = user.cartItems.filter((item) => item.id !== productId)
            await user.save()
            return res.status(200).json(user.cartItems)
          } else {
            existingItem.quantity = quantity
            await user.save();
			      res.json(user.cartItems);

          }
        } else {
            return res.status(404).json({ error: "Product not found" })
        }
    } catch (error) {
      console.log("Error in updateQuantity function", error.message);
      res.status(500).json({ message: "Server error", error: error.message })  
    }
}



export { addToCart, removeAllFromCart, updateQuantity, getCartProducts }