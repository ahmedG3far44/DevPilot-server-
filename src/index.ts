import cors from 'cors';
import dotenv from 'dotenv';
import indexRouter from "./routes/index.route"

import express, { Application } from 'express';

import { errorHandler } from './middlewares/errorHandler';
import { connectDatabase } from './configs/db';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;



app.use(cors({
  origin:"*",
  methods:["POST","GET","PUT", "DELETE"],
  allowedHeaders:["Content-Type","Authorization"],
  credentials:true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});


app.use('/api', indexRouter);


app.use(errorHandler);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});


const startServer = async () => {
  try {
    await connectDatabase();
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer()



export default app;