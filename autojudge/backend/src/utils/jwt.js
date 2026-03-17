const jwt = require("jsonwebtoken");
const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET || "secret", { expiresIn: "15m" });
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET || "refresh_secret", { expiresIn: "7d" });
  return { accessToken, refreshToken };
};
const verifyToken = (token, secret) => jwt.verify(token, secret || process.env.JWT_SECRET);
const setTokenCookies = (res, accessToken, refreshToken) => {
  res.cookie("accessToken", accessToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", maxAge: 15*60*1000 });
  res.cookie("refreshToken", refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", maxAge: 7*24*60*60*1000 });
};
module.exports = { generateTokens, verifyToken, setTokenCookies };
