const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error("Missing JWT secrets. Set JWT_SECRET and JWT_REFRESH_SECRET.");
}

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, JWT_SECRET, {
    expiresIn: "15m",
    algorithm: "HS256"
  });
  const refreshToken = jwt.sign({ id: userId }, JWT_REFRESH_SECRET, {
    expiresIn: "7d",
    algorithm: "HS256"
  });
  return { accessToken, refreshToken };
};
const verifyToken = (token, secret) => jwt.verify(token, secret || JWT_SECRET, { algorithms: ["HS256"] });
const setTokenCookies = (res, accessToken, refreshToken) => {
  const cookieConfig = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax"
  };
  res.cookie("accessToken", accessToken, { ...cookieConfig, maxAge: 15 * 60 * 1000 });
  res.cookie("refreshToken", refreshToken, { ...cookieConfig, maxAge: 7 * 24 * 60 * 60 * 1000 });
};
module.exports = { generateTokens, verifyToken, setTokenCookies, JWT_SECRET, JWT_REFRESH_SECRET };
