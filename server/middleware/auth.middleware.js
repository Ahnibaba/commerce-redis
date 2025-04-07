import jwt from "jsonwebtoken";
import userModel from "../models/user.model.js";

const protectRoute = async (req, res, next) => {
    try {
        const accessToken = req.cookies.accessToken

        if (!accessToken) {
            return res.status(401).json({ error: "Unauthorized - No access token provided" })
        }

        try {
            const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET)
            const user = await userModel.findById(decoded.userId).select("-password")

            if (!user) {
                return res.status(401).json({ error: "User not found" })
            }

            req.user = user

            next()
        } catch (error) {
            if (error.name === "TokenExpiredError") {
                return res.status(401).json({ error: "Unauthorized - Access token expired" })
            }
            throw error
        }

    } catch (error) {
        console.log("Error in protectRoute function", error.message);
        res.status(401).json({ error: "Unauthorized - Invalid access token" })
    }
}

const adminRoute = (req, res, next) => {
    if (req.user && req.user.role === "admin") {
        next()
    } else {
        return res.status(403).json({ error: "Access denied - Admin only" })
    }
}

export { protectRoute, adminRoute }