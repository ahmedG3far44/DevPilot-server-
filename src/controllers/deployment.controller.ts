import { Response } from 'express';
import { streamRemoteCommand } from '../utils/ssh';
import {  validateUpdateDeployment, ValidationError } from '../utils/validators';
import { AuthRequest, UpdateDeploymentDTO } from '../types';


import Deployment from '../models/Deployment';



export const createDeployment = async (req: AuthRequest, res: Response) => {
    const { project_name, clone_url } = req.body;
  
    // 1. Validate input early
    if (!project_name || !clone_url) {
      return res.status(400).json({ error: "project_name and clone_url are required" });
    }
  
    // 2. Prepare SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
  
    // 3. Gracefully handle client disconnects
    req.on("close", () => {
      console.log(`[SSE] Client disconnected for project: ${project_name}`);
      res.end();
    });
  
    const command = `sudo bash deploy.sh "${clone_url}" "${project_name}"`;
  
    try {
      // 4. Run SSH command with error + close handling
      streamRemoteCommand(
        command,
        (data) => {
          // Send incremental logs
          res.write(`data: ${data}\n\n`);
        },
        () => {
          // On successful completion
          res.write(`data: Deployment finished successfully\n\n`);
          res.end();
        },
        (error) => {
          // Custom error callback from streamRemoteCommand
          console.error("[SSH ERROR]", error);
          res.write(`data: ERROR: ${error.message || error}\n\n`);
          res.end();
        }
      );
    } catch (err: any) {
      // 5. Catch synchronous setup errors
      console.error("[Deploy Error]", err);
      res.write(`data: Failed to start deployment: ${err.message}\n\n`);
      res.end();
    }
  };

export const getDeployments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized: User not authenticated' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const deployments = await Deployment.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v')
      .lean();

    const total = await Deployment.countDocuments({ userId });

    res.status(200).json({
      deployments,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch deployments',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getDeploymentById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized: User not authenticated' });
      return;
    }

    const { id } = req.params;
    const deployment = await Deployment.findOne({ _id: id, userId });

    if (!deployment) {
      res.status(404).json({ error: 'Deployment not found' });
      return;
    }

    res.status(200).json({ deployment });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch deployment',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const updateDeployment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized: User not authenticated' });
      return;
    }

    const { id } = req.params;
    const validatedData: UpdateDeploymentDTO = validateUpdateDeployment(req.body);

    const deployment = await Deployment.findOne({ _id: id, userId });

    if (!deployment) {
      res.status(404).json({ error: 'Deployment not found' });
      return;
    }

    Object.assign(deployment, validatedData);
    await deployment.save();

    res.status(200).json({
      message: 'Deployment updated successfully',
      deployment
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ 
      error: 'Failed to update deployment',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const redeployProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized: User not authenticated' });
      return;
    }

    const { id } = req.params;
    const deployment = await Deployment.findOne({ _id: id, userId });

    if (!deployment) {
      res.status(404).json({ error: 'Deployment not found' });
      return;
    }

    // Update status to redeploying
    deployment.status = 'redeploying';
    await deployment.save();

    // Execute redeployment asynchronously
    // sshManager.executeDeployment({
    //   clone_url: deployment.clone_url,
    //   project_name: deployment.project_name,
    //   package_manager: deployment.package_manager,
    //   entry_file: deployment.entry_file,
    //   main_directory: deployment.main_directory,
    //   build_script: deployment.build_script,
    //   run_script: deployment.run_script,
    //   envVars: deployment.envVars,
    //   port: deployment.port
    // })
    //   .then(async () => {
    //     await Deployment.findByIdAndUpdate(deployment._id, {
    //       status: 'deployed',
    //       last_deployed_at: new Date(),
    //       error_message: undefined
    //     });
    //   })
    //   .catch(async (error) => {
    //     await Deployment.findByIdAndUpdate(deployment._id, {
    //       status: 'failed',
    //       error_message: error.message
    //     });
    //   });

    res.status(200).json({
      message: 'Redeployment initiated successfully',
      deployment
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to redeploy project',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const deleteDeployment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized: User not authenticated' });
      return;
    }

    const { id } = req.params;
    const deployment = await Deployment.findOne({ _id: id, userId });

    if (!deployment) {
      res.status(404).json({ error: 'Deployment not found' });
      return;
    }

    // Delete from EC2
    try {
    //   await sshManager.deleteDeployment(deployment.project_name);
    } catch (sshError) {
      console.error('SSH deletion error:', sshError);
      // Continue with DB deletion even if SSH fails
    }

    // Delete from database
    await Deployment.findByIdAndDelete(id);

    res.status(200).json({
      message: 'Deployment deleted successfully',
      project_name: deployment.project_name
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to delete deployment',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
