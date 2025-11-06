import { Router } from "express";
import deployRouter from "./deployment.route"


const router = Router()



router.use("/deploy", deployRouter)

export default router;