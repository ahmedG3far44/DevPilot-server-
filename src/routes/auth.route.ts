
import {  Router } from "express";
import { githubCallback } from "../controllers/auth.controller";

const router = Router();

router.get("/auth/github/callback", githubCallback)

export default router;