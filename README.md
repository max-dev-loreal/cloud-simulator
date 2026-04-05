Cloud System Simulator
Interactive visualization of a distributed cloud infrastructure. Runs in two modes: local simulation with animated load balancing, and live AWS mode where buttons launch and terminate real EC2 instances.
Built as a learning project to understand distributed systems, IaC, and serverless architecture from first principles.

Demo
Simulation mode — open locally, no AWS needed:
bashnpm install
npm run dev
Live AWS mode — add .env with API URL after terraform apply:
VITE_API_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com

What it does

Two Availability Zones — AZ-1 and AZ-2 with independent instance pools
Load balancing — Least Load and Round Robin algorithms, switchable at runtime
Health system — instances degrade under load, recover automatically, get excluded from routing when unhealthy
Auto scaling — spin up instances into any AZ, booting state before going healthy
Traffic simulation — animated packets flowing from LB to instances
Live AWS mode — + AZ-1 launches a real t3.micro, clicking a node terminates it
On-demand infrastructure — terraform apply creates zero EC2 instances. Instances only exist when launched via the UI


Architecture
Browser (React)
     │
     ├── Simulation mode: simulationEngine.js (pure functions, no AWS)
     │
     └── Live mode: fetch() → API Gateway → Lambda → AWS EC2
Why simulation engine is separate from UI
src/simulation/simulationEngine.js contains all business logic as pure functions with no React dependencies. The UI only reads state and calls handlers.
This means swapping mock data for real AWS data required zero changes to components — only App.jsx gained a polling loop and the handlers gained API calls.
Infrastructure (Terraform)
terraform apply creates exactly these resources — nothing more:
ResourcePurposeaws_apigatewayv2_apiHTTP API endpoint with CORSaws_apigatewayv2_stage$default stage, auto-deployaws_apigatewayv2_integrationProxy all requests to Lambdaaws_apigatewayv2_route × 3GET/POST/DELETE /instancesaws_lambda_functionNode.js handler for EC2 operationsaws_iam_role + aws_iam_role_policyLeast-privilege permissions for Lambdaaws_security_groupFirewall for launched EC2 instancesaws_lambda_permissionAllow API Gateway to invoke Lambda
EC2 instances are not in Terraform state. They are created and destroyed on demand via the Lambda API.
Lambda API
GET    /instances        → list running instances (tagged Project: cloud-simulator)
POST   /instances        → launch t3.micro in specified AZ
DELETE /instances/{id}   → terminate instance by ID

Problems encountered
Tailwind v4 breaking change
After scaffolding with Vite, npx tailwindcss init -p failed silently and @tailwind directives broke PostCSS.
Root cause: Tailwind v4 moved the PostCSS plugin to a separate package and replaced @tailwind directives with a single import.
Fix:
bashnpm install -D @tailwindcss/postcss
js// postcss.config.js
export default { plugins: { '@tailwindcss/postcss': {}, autoprefixer: {} } }
css/* index.css */
@import "tailwindcss";
Dynamic Tailwind classes produce no output
Status-dependent styles like `bg-${status}-500` rendered as unstyled elements — nodes were invisible.
Root cause: Tailwind's build scanner only finds static class strings. A dynamically constructed string is invisible at build time and never included in the output CSS.
Fix: replaced all dynamic class construction with a static lookup object and inline styles:
js// wrong
const color = status === 'healthy' ? 'emerald' : 'red';
<div className={`bg-${color}-500`} />

// correct
const STYLES = { healthy: { background: '#10b981' }, unhealthy: { background: '#ef4444' } };
<div style={STYLES[status]} />
Component reading stale static data instead of React state
NetworkCanvas imported initialNetwork directly from the data file. The parent App was updating state correctly but the child always rendered the initial snapshot.
Root cause: a module-level import bypasses React's reactivity entirely. The component subscribed to nothing — it never knew an update happened.
Fix: removed the direct import, passed live state as a prop:
jsx// wrong — stale forever
import { initialNetwork } from '../../data/network';
function NetworkCanvas({ activeTarget }) {
  const lb = initialNetwork.loadBalancer;
}

// correct — re-renders on every state change
function NetworkCanvas({ activeTarget, data }) {
  const lb = data.loadBalancer;
}
CSS animation syntax error silently killed all styles
The page rendered completely unstyled — no colors, no layout, no spacing. The actual cause was a single line break inside an animation shorthand value.
css/* broken */
.animate-status-pulse {
  animation: status-pulse 2s
  cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* fixed */
.animate-status-pulse {
  animation: status-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
PostCSS failed to parse the split value and dropped the entire rule. Because this caused Tailwind to also fail loading, every utility class on the page stopped working.
t2.micro not eligible for Free Tier on new AWS accounts
POST /instances returned a 500. Lambda logs showed the EC2 API rejecting the instance type.
Root cause: AWS changed the Free Tier offering — new accounts get t3.micro, not t2.micro.
Fix: updated variables.tf:
hclvariable "instance_type" {
  default = "t3.micro"
}
AWS profile name mismatch between CLI and Terraform
terraform plan failed with failed to get shared config profile, cloud_simulator.
Root cause: the profile was created as cloud-simulator (hyphen) but Terraform was looking for cloud_simulator (underscore) because the profile attribute in the provider block used an underscore.
Fix: removed the profile attribute from provider "aws" and set the profile via environment variable instead:
bashset AWS_PROFILE=cloud-simulator
terraform plan

Stack

React 18 + Vite — UI and local dev
Framer Motion — node animations, packet motion, load bar transitions
Tailwind CSS v4 — layout and base reset only; all dynamic styles use inline CSS
Terraform — provisions API Gateway, Lambda, IAM, Security Group
AWS Lambda (Node.js 20) — serverless EC2 lifecycle manager
AWS API Gateway v2 — HTTP API with CORS
AWS EC2 — on-demand t3.micro instances
AWS IAM — dedicated deployer user, least-privilege Lambda role


Cost
Running cost when idle (no EC2 instances): $0
Lambda and API Gateway fall within the AWS Free Tier. EC2 instances cost money only while running — terminate them via the UI or terraform destroy when done.
To tear down all infrastructure:
bashcd infrastructure
terraform destroy