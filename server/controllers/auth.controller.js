import { redis } from "../lib/redis.js"
import userModel from "../models/user.model.js"
import jwt from "jsonwebtoken"
// import crypto from "crypto"

// console.log(crypto.randomBytes(64).toString("hex"));



const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "15m" }
  )
  const refreshToken = jwt.sign(
    { userId },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" }
  )

  return { accessToken, refreshToken }
}

const storeRefreshToken = async (userId, refreshToken) => {
   await redis.set(`refresh_token:${userId}`, refreshToken, "EX", 7*24*60*60)  // 7days
}

const setCookies = (res, accessToken, refreshToken) => {
    res.cookie("accessToken", accessToken, {
      httpOnly: true, //prevent XSS attacks, cross site scripting attack
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax", // prevents CSRF attack, cross-site request forgery
      maxAge: 15 * 60 * 1000, // 15 minutes


    }) 
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true, //prevent XSS attacks, cross site scripting attack
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax", // prevents CSRF attack, cross-site request forgery
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days


    }) 
 }

const signup = async (req, res) => {
    try {
        const { email, password, name } = req.body

        const userExists = await userModel.findOne({ email })
        if (userExists) {
            return res.status(400).json({ error: "User already exists" })
        }
        const user = await userModel.create({ name, email, password })

        // authenticate user
        const { accessToken, refreshToken } = generateTokens(user._id)
        await storeRefreshToken(user._id, refreshToken)
        
        setCookies(res, accessToken, refreshToken)
        


        res.status(201).json({ 
              _id: user._id,
              name: user.name,
              email: user.email,
              role: user.role
        })
    } catch (error) {
        console.log("Error in signup function", error.message);
        res.status(500).json({ error: error.message })
    }
}

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await userModel.findOne({ email })

        if(user && (await user.comparePassword(password))) {
           const { accessToken, refreshToken } = generateTokens(user._id)

           await storeRefreshToken(user._id, refreshToken)
           setCookies(res, accessToken, refreshToken)
        } else {
            return res.status(401).json({ error: "Invalid email or password" })
        }
        res.status(200).json({ 
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
      })
    } catch (error) {
        console.log("Error in login function", error.message);
        res.status(500).json({ error: error.message })
    }
}


const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken
    if(refreshToken){
      const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET)
      await redis.del(`refresh_token:${decoded.userId}`) 
    }
    
    res.clearCookie("accessToken")
    res.clearCookie("refreshToken")

    res.status(200).json({ message: "Logged out successfully" })

  } catch (error) {
    console.log("Error in logout function", error.message);
    res.status(500).json({ error: error.message })
  }  
}

// this will refresh the access token
const refreshToken = async(req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken
    console.log("I am refresh token", refreshToken);
    
    if(!refreshToken) {
        return res.status(401).json({error: "No refresh token provided" })
    }
   
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired refresh token" });
    }

    const storedToken = await redis.get(`refresh_token:${decoded.userId}`)

    if(storedToken !== refreshToken) {
      return res.status(401).json({ message: "Invalid refresh token" })
    }

    const accessToken = jwt.sign(
        { userId: decoded.userId },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "15m" }
    )

    res.cookie("accessToken", accessToken, {
        httpOnly: true, //prevent XSS attacks, cross site scripting attack
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax", // prevents CSRF attack, cross-site request forgery
        maxAge: 15 * 60 * 1000, // 15 minutes
  
  
    }) 

     res.status(200).json({ message: "Token refreshed successfully" })

  } catch (error) {
    console.log("Error in refreshToken function", error.message);
    res.status(500).json({ message: "Server error", error: error.message })
  }
}

const getProfile = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized - User not found" });
    }

    res.status(200).json(req.user);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Server error" });
  }
};


export { signup, login, logout, refreshToken, getProfile }