import mongoose from "mongoose";

export const connectDB = async () => {
   try {
    const MONGO_URI = process.env.MONGO_URI
    const conn = await mongoose.connect(MONGO_URI)
    console.log(`MongoDB connected: ${conn.connection.host}`);
   } catch (error) {
     console.log("Error connecting to MONGODB", error.message);
     process.exit(1) //meaning failure
     
   }
    
}