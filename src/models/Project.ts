import { Schema, Document, model } from "mongoose";


export interface IEnv {
    _id?:string;
  key: string;
  value: string;
}

export interface IProject extends Document {
    _id:string;
    name: string;
    port: number;
    description: string;
    clone_url:string;
    run_script?: string;
    build_script?: string;
    main_directory: string;
    entry_file: string;
    typescript:boolean;
    type: "react" | "nest" | "express" | "next";
    envVars: IEnv[];
}


export enum ProjectType {
  REACT = "react",
  NEST = "nest",
  EXPRESS = "express",
  NEXT = "next",
}

const envSchema = new Schema<IEnv>({
  key: { type: String, required: true },
  value: { type: String, required: true },
});

const projectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    run_script: { type: String },
    build_script: { type: String },
    port: { type: Number, required: true, default: 3000 },
    main_directory: { type: String, required: true },
    entry_file: { type: String, required: true },
    type: {
      type: String,
      enum: Object.values(ProjectType),
      required: true,
    },
    typescript: {
      type: Boolean,
      required: true,
      default:false,
    },
    envVars: { type: [envSchema], default: [] },
  },
  { timestamps: true }
);


projectSchema.pre<IProject>("save", async function (next) {
 
  if (!this.isNew || this.port) return next();

  const Project = model<IProject>("Project");
  const lastProject = await Project.findOne().sort({ port: -1 }).exec();

  const lastPort = lastProject ? lastProject.port : 3000;
  this.port = lastPort + 1;

  next();
});


const Project = model<IProject>("Project", projectSchema);

export default Project;
