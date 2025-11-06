import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth';

import {
  createDeployment,
  getDeployments,
  getDeploymentById,
  updateDeployment,
  redeployProject,
  deleteDeployment
} from '../controllers/deployment.controller';



const router = Router();

// All routes require authentication
router.use(authMiddleware);


router.post('/', createDeployment);
router.get('/', getDeployments);
router.get('/:id', getDeploymentById);
router.patch('/:id', updateDeployment);
router.post('/:id/redeploy', redeployProject);
router.delete('/:id', deleteDeployment);

export default router;