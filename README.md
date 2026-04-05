# ☁️ Cloud System Simulator

Interactive visualization of a distributed cloud infrastructure.

A project to simulate and manage a distributed system in two modes:

- Local Simulation — animated load balancing and traffic flow (no AWS required)
- Live AWS Mode — control real infrastructure (launch/terminate EC2 instances from UI)

Built to explore:
- Distributed Systems
- Infrastructure as Code (Terraform)
- Serverless Architecture

------------------------------------------------------------

🚀 QUICK START

1. Local Simulation

npm install
npm run dev

------------------------------------------------------------

2. Live AWS Mode

Step 1 — Deploy infrastructure

cd infrastructure
terraform init
terraform apply

Step 2 — Configure environment

Create a .env file in the root directory:

VITE_API_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com

------------------------------------------------------------

✨ FEATURES

- Multi-AZ Architecture
  Two Availability Zones with independent instance pools

- Dynamic Load Balancing
  Round Robin / Least Load

- Health System
  Instances degrade under load and recover automatically

- Auto Scaling
  Launch instances in any AZ with visual "booting" state

- Traffic Simulation
  Animated packet flow from Load Balancer to instances

------------------------------------------------------------

🏗 ARCHITECTURE

заглушка 



------------------------------------------------------------

🧠 DESIGN

All business logic is isolated in:

src/simulation/simulationEngine.js

- Pure functions
- UI only reads state and triggers actions
- Easy transition from mock → real AWS

------------------------------------------------------------

🛠 INFRASTRUCTURE

aws_apigatewayv2_api     → HTTP API with CORS
aws_apigatewayv2_stage   → $default stage
aws_lambda_function      → EC2 handler
aws_iam_role             → IAM permissions
aws_security_group       → EC2 firewall

EC2 instances are created on-demand via Lambda.

------------------------------------------------------------

🔍 LESSONS LEARNED

Tailwind v4:
- init command failed
- fixed via @tailwindcss/postcss

Dynamic classes:
- bg-${status}-500 not working
- replaced with static object mapping

CSS Animation:
- line break broke styles
- PostCSS dropped rule

------------------------------------------------------------

💰 COST

Idle: $0 (Free Tier)
Active: Pay-as-you-go

------------------------------------------------------------

🧹 CLEANUP

cd infrastructure
terraform destroy

------------------------------------------------------------

⚡ NOTES

- Portfolio-grade project
- Inspired by real cloud systems
- Easily extendable (monitoring, chaos testing)
