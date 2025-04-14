import dotenv from "dotenv"
import express from "express"
import cookieParser from "cookie-parser"
import authRoutes from "./routes/auth.route.js"
import productRoutes from "./routes/product.route.js"
import cartRoutes from "./routes/cart.route.js"
import couponRoutes from "./routes/coupon.route.js"
import paymentRoutes from "./routes/payment.route.js"
import analyticsRoutes from "./routes/analytics.route.js"
import { connectDB } from "./lib/db.js"
import path from "path"
import job from "./cron/cron.js"

dotenv.config()

connectDB()
//job.start()

const app = express()
const PORT = process.env.PORT || 5000

const __dirname = path.resolve()

app.use(express.json({ limit: "10mb" })) //allows you to parse the body of the request
app.use(express.urlencoded({ extended: true })) // To parse form data in the req.body
app.use(cookieParser())

app.use("/api/auth", authRoutes)
app.use("/api/products", productRoutes)
app.use("/api/cart", cartRoutes)
app.use("/api/coupons", couponRoutes)
app.use("/api/payment", paymentRoutes)
app.use("/api/analytics", analyticsRoutes)


if(process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "client","dist")))

  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "client", "dist", "index.html"))
  })
}

app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", "default-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self' 'unsafe-inline';");
  next();
});


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`); 
  
  
})