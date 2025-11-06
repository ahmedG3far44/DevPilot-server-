import { Schema, model, Document } from 'mongoose';
import { IEnvVar, DeploymentStatus } from '../types';

export interface IDeployment extends Document {
  userId: string;
  project_name: string;
  clone_url: string;
  description?: string;
  package_manager: 'npm' | 'yarn' | 'pnpm';
  envVars: IEnvVar[];
  run_script: string;
  build_script?: string;
  entry_file: string;
  main_directory: string;
  port: number;
  status: DeploymentStatus;
  deployment_url?: string;
  last_deployed_at?: Date;
  error_message?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EnvVarSchema = new Schema<IEnvVar>(
  {
    key: { type: String, required: true, trim: true },
    value: { type: String, required: true }
  },
  { _id: false }
);

const DeploymentSchema = new Schema<IDeployment>(
  {
    userId: { 
      type: String, 
      required: true, 
      index: true 
    },
    project_name: { 
      type: String, 
      required: true, 
      trim: true,
      minlength: 1,
      maxlength: 100
    },
    clone_url: { 
      type: String, 
      required: true,
      trim: true,
      validate: {
        validator: (v: string) => {
          return /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/.test(v);
        },
        message: 'Invalid clone URL format'
      }
    },
    description: { 
      type: String, 
      maxlength: 500 
    },
    package_manager: { 
      type: String, 
      required: true,
      enum: ['npm', 'yarn', 'pnpm'],
      default: 'npm'
    },
    envVars: {
      type: [EnvVarSchema],
      default: []
    },
    run_script: { 
      type: String, 
      required: true,
      trim: true
    },
    build_script: { 
      type: String,
      trim: true
    },
    entry_file: { 
      type: String, 
      required: true,
      trim: true,
      default: './src/index.js'
    },
    main_directory: { 
      type: String, 
      required: true,
      trim: true,
      default: './'
    },
    port: { 
      type: Number, 
      required: true,
      min: 3000,
      max: 65535
    },
    status: { 
      type: String, 
      enum: ['pending', 'deployed', 'failed', 'redeploying'],
      default: 'pending'
    },
    deployment_url: String,
    last_deployed_at: Date,
    error_message: String
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);


DeploymentSchema.index({ userId: 1, createdAt: -1 });
DeploymentSchema.index({ project_name: 1, userId: 1 });


DeploymentSchema.statics.getNextAvailablePort = async function(): Promise<number> {
  const lastDeployment = await this.findOne()
    .sort({ port: -1 })
    .select('port')
    .lean();
  
  return lastDeployment ? lastDeployment.port + 1 : 3000;
};

const Deployment = model<IDeployment>('deployments', DeploymentSchema);

export default Deployment;
