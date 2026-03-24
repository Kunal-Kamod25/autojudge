// This file drives the jwt feature flow and keeps the behavior easy to reason about.
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error("Missing JWT secrets. Set JWT_SECRET and JWT_REFRESH_SECRET.");
}

// generateTokens handles one focused part of this file's workflow.
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
// verifyToken handles one focused part of this file's workflow.
const verifyToken = (token, secret) => jwt.verify(token, secret || JWT_SECRET, { algorithms: ["HS256"] });
// getCookieConfig handles one focused part of this file's workflow.
const getCookieConfig = () => {
  const isProduction = process.env.NODE_ENV === "production";
  const sameSite = (process.env.COOKIE_SAME_SITE || (isProduction ? "none" : "lax")).toLowerCase();
  // Browsers require Secure=true when SameSite=None.
  const secure = sameSite === "none" ? true : isProduction;
  return {
    httpOnly: true,
    secure,
    sameSite,
    partitioned: sameSite === 'none', // Enable CHIPS for cross-site cookies
    path: "/"
  };
};
// setTokenCookies handles one focused part of this file's workflow.
const setTokenCookies = (res, accessToken, refreshToken) => {
  const cookieConfig = getCookieConfig();
  res.cookie("accessToken", accessToken, { ...cookieConfig, maxAge: 15 * 60 * 1000 });
  res.cookie("refreshToken", refreshToken, { ...cookieConfig, maxAge: 7 * 24 * 60 * 60 * 1000 });
};
module.exports = { generateTokens, verifyToken, setTokenCookies, getCookieConfig, JWT_SECRET, JWT_REFRESH_SECRET };
