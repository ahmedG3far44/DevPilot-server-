 import { Response, Router } from "express";
import { AuthRequest } from "../types";
import { deleteProjectById, getProjectById, getProjectsList, updateProjectById } from "../controllers/project.controller";


 const router = Router();



 router.get("/", getProjectsList)
 router.get("/:id", getProjectById)
 router.put("/:id", updateProjectById)
 router.delete("/:id", deleteProjectById)


 export default router;