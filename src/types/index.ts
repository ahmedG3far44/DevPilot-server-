import { Request } from 'express';

export interface IEnvVar {
  key: string;
  value: string;
}

export interface IUser {
  id: string;
  name:string;
  email: string;
  avatar_url:string;
  login:string;
}

export interface AuthRequest extends Request {
  user?: IUser;
}

export interface CreateDeploymentDTO {
  project_name: string;
  clone_url: string;
  description?: string;
  package_manager: 'npm' | 'yarn' | 'pnpm';
  envVars: IEnvVar[];
  run_script: string;
  build_script?: string;
  entry_file: string;
  main_directory: string;
  port?: number;
}

export interface UpdateDeploymentDTO {
  description?: string;
  entry_file?: string;
  main_directory?: string;
  envVars?: IEnvVar[];
  build_script?: string;
  run_script?: string;
}

export type DeploymentStatus = 'pending' | 'deployed' | 'failed' | 'redeploying';
