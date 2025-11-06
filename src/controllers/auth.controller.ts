import { Request, Response } from "express";

import jwt from "jsonwebtoken";


export const githubCallback = async (req: Request, res: Response) => {
    try {
      const code = req.query.code as string;

      if (!code) {
        return res.status(400).json({ error: "Missing GitHub code" });
      }
  
      const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });
  
      const tokenData = await tokenResponse.json();
      const access_token = tokenData.access_token;
      if (!access_token) {
        return res.status(400).json({ error: "Failed to retrieve GitHub access token" });
      }

      const userResponse = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "User-Agent": "node-fetch",
        },
      });
      const githubUser = await userResponse.json();

      console.log(githubUser)
  
      // Create your own JWT to store in cookie
      const jwtToken = jwt.sign(
        {
          id: githubUser.id,
          name:githubUser.name,
          email: githubUser.email,
          avatar_url: githubUser.avatar_url,
          login: githubUser.login,
        },
        process.env.JWT_SECRET || "supersecret",
        { expiresIn: "7d" }
      );
  
      // Send JWT as HttpOnly cookie
      res.cookie("auth_token", jwtToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
  
      // You can redirect or send JSON response
      return res.redirect(`${process.env.CLIENT_URL}/projects`);
      // or:
      // res.json({ message: "Login successful", user: githubUser });
    } catch (error) {
      console.error("GitHub auth error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  };