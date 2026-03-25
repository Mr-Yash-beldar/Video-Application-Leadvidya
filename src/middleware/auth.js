const jwt = require("jsonwebtoken");
const User = require("../../models/User"); // Path points to where we created it

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!token) {
      return res.status(401).json({ message: "No auth token provided." });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET || "leadvidya_dev_secret_change_me");
    
    // In strict mode, we might look up the user in DB here
    // const user = await User.findById(payload.userId);

    req.admin = payload; 
    next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized or invalid token." });
  }
};

module.exports = authMiddleware;
