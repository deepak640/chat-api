import jwt from "jsonwebtoken";
import { CONFIG } from "../common/config";

import { jwtDecode } from "jwt-decode";

export const GenerateToken = async (obj: object) => {
  const expiryInSeconds = 100000 * 60; // Set expiry to 10 seconds

  // Get the current time in seconds (UTC) and add 10 seconds for expiration
  const expirationInUtc = Math.floor(Date.now() / 1000) + expiryInSeconds;

  return jwt.sign(
    {
      ...obj,
      exp: expirationInUtc, // Expiry time in UTC
    },
    CONFIG.JWT_SECRET
  );
};

export const generateRefreshJwt = async (obj: object) => {
  // const expiryInSeconds = 60; // 7 days or your desired expiry duration
  const expiryInSeconds = 604800 * 60; // 7 days or your desired expiry duration

  // Get the current time in UTC and add the expiration time
  const expirationInUtc = Math.floor(Date.now() / 1000) + expiryInSeconds;

  // Convert UTC time to IST by adding 5 hours and 30 minutes (19800 seconds)
  const expirationInIST = expirationInUtc + 19800;

  return jwt.sign(
    {
      ...obj,
      exp: expirationInIST, // Use IST time for expiration
    },
    CONFIG.JWT_SECRET // Use a separate secret for refresh token
  );
};

export const decodeJwt = (token: string) => jwtDecode(token);
