# Deployment Service Backend

A production-ready backend service for managing application deployments to EC2 instances.

## Features

- 🚀 Create and deploy applications from Git repositories
- 📦 Support for npm, yarn, and pnpm package managers
- 🔄 Redeploy existing applications
- ✏️ Update deployment configurations
- 🗑️ Delete deployments and clean up EC2 resources
- 🔒 JWT authentication
- 📊 Pagination support
- 🛡️ Input validation and error handling
- 🔌 Auto-port assignment

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Authentication**: JWT
- **SSH**: ssh2-promise

## Prerequisites

- Node.js >= 18.x
- MongoDB >= 6.x
- EC2 instance with SSH access
- Deploy script on EC2 at `/opt/deploy/deploy.sh`

## Installation

```bash
# Clone repository
git clone <your-repo-url>
cd deployment-service-backend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Update .env with your configuration
```

## Environment Variables

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/deployment-service
JWT_SECRET=your-secret-key
EC2_HOST=your-ec2-ip
EC2_USER=ubuntu
EC2_SSH_PORT=22
EC2_PRIVATE_KEY="your-private-key"
```

## Running the Application

```bash
# Development mode with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## API Endpoints

### Authentication

All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

### Endpoints

#### 1. Create Deployment

```http
POST /api/deployments
Content-Type: application/json

{
  "project_name": "my-app",
  "clone_url": "https://github.com/user/repo.git",
  "description": "My awesome app",
  "package_manager": "npm",
  "envVars": [
    { "key": "NODE_ENV", "value": "production" },
    { "key": "API_KEY", "value": "secret123" }
  ],
  "run_script": "npm start",
  "build_script": "npm run build",
  "entry_file": "./src/index.js",
  "main_directory": "./"
}
```

#### 2. Get All Deployments

```http
GET /api/deployments?page=1&limit=10
```

#### 3. Get Single Deployment

```http
GET /api/deployments/:id
```

#### 4. Update Deployment

```http
PATCH /api/deployments/:id
Content-Type: application/json

{
  "description": "Updated description",
  "entry_file": "./src/server.js",
  "envVars": [
    { "key": "NODE_ENV", "value": "staging" }
  ]
}
```

#### 5. Redeploy Project

```http
POST /api/deployments/:id/redeploy
```

#### 6. Delete Deployment

```http
DELETE /api/deployments/:id
```

## Project Structure

```
src/
├── config/
│   └── database.ts          # MongoDB connection
├── controllers/
│   └── deploymentController.ts  # Business logic
├── middleware/
│   ├── auth.ts              # JWT authentication
│   └── errorHandler.ts      # Global error handling
├── models/
│   └── Deployment.ts        # Mongoose schema
├── routes/
│   └── deploymentRoutes.ts  # API routes
├── types/
│   └── index.ts             # TypeScript types
├── utils/
│   ├── ssh.ts               # SSH operations
│   └── validators.ts        # Input validation
└── index.ts                 # App entry point
```

## Deploy Script Requirements

The EC2 instance should have a deploy script at `/opt/deploy/deploy.sh` that accepts:

```bash
./deploy.sh <clone_url> <project_name> <env_vars> <package_manager> \
            <entry_file> <main_directory> <build_script> <run_script> <port>
```

## Security Considerations

- Store EC2 private key securely (use environment variables or secrets manager)
- Use strong JWT secrets
- Implement rate limiting (recommended: express-rate-limit)
- Validate and sanitize all inputs
- Use HTTPS in production
- Regularly rotate credentials

## Error Handling

The API returns consistent error responses:

```json
{
  "error": "Error message",
  "details": "Detailed error information"
}
```

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request
