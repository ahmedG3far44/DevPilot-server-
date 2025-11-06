import { CreateDeploymentDTO, UpdateDeploymentDTO } from '../types';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const validateCreateDeployment = (data: any): CreateDeploymentDTO => {
  const errors: string[] = [];

  if (!data.project_name || typeof data.project_name !== 'string') {
    errors.push('project_name is required and must be a string');
  }

  if (!data.clone_url || typeof data.clone_url !== 'string') {
    errors.push('clone_url is required and must be a string');
  }

  if (!data.package_manager || !['npm', 'yarn', 'pnpm'].includes(data.package_manager)) {
    errors.push('package_manager must be one of: npm, yarn, pnpm');
  }

  if (!Array.isArray(data.envVars)) {
    errors.push('envVars must be an array');
  } else {
    data.envVars.forEach((env: any, index: number) => {
      if (!env.key || !env.value) {
        errors.push(`envVars[${index}] must have both key and value`);
      }
    });
  }

  if (!data.run_script || typeof data.run_script !== 'string') {
    errors.push('run_script is required and must be a string');
  }

  if (!data.entry_file || typeof data.entry_file !== 'string') {
    errors.push('entry_file is required and must be a string');
  }

  if (!data.main_directory || typeof data.main_directory !== 'string') {
    errors.push('main_directory is required and must be a string');
  }

  if (errors.length > 0) {
    throw new ValidationError(errors.join(', '));
  }

  return data as CreateDeploymentDTO;
};

export const validateUpdateDeployment = (data: any): UpdateDeploymentDTO => {
  const allowedFields = ['description', 'entry_file', 'main_directory', 'envVars', 'build_script', 'run_script'];
  const providedFields = Object.keys(data);

  const invalidFields = providedFields.filter(field => !allowedFields.includes(field));
  
  if (invalidFields.length > 0) {
    throw new ValidationError(`Invalid fields: ${invalidFields.join(', ')}. Only ${allowedFields.join(', ')} can be updated.`);
  }

  if (data.envVars && !Array.isArray(data.envVars)) {
    throw new ValidationError('envVars must be an array');
  }

  return data as UpdateDeploymentDTO;
};