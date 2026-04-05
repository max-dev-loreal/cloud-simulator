☁️ Cloud System SimulatorInteractive visualization of a distributed cloud infrastructure.This project allows you to simulate and manage a distributed system in two modes:Local Simulation: Animated load balancing and traffic flow without an AWS account.Live AWS Mode: Control real infrastructure. Launch and terminate EC2 instances directly from the UI.Built as a learning project to explore distributed systems, Infrastructure as Code (Terraform), and serverless architecture from first principles.🚀 Quick Start1. Simulation Mode (Local)No AWS credentials required.Bashnpm install
npm run dev
2. Live AWS ModeDeploy the infrastructure using Terraform (see Infrastructure).Create a .env file in the root directory.Add your API Gateway URL:Фрагмент кодаVITE_API_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com
✨ Key FeaturesDual Availability Zones: AZ-1 and AZ-2 with independent instance pools.Dynamic Load Balancing: Switch between Least Load and Round Robin algorithms at runtime.Health System: Instances degrade under high load and recover automatically. Unhealthy nodes are automatically excluded from routing.Auto Scaling: Spin up instances in any AZ; visual "booting" state before becoming healthy.Traffic Simulation: Animated packets flowing from the Load Balancer to active instances.On-Demand Infrastructure: Terraform sets up the "plumbing" (API, Lambda, IAM), but EC2 instances are only created when you click the + button.🏗️ ArchitectureФрагмент кодаgraph TD
    A[Browser - React] --> B{Mode}
    B -->|Local| C[simulationEngine.js]
    B -->|Live| D[API Gateway]
    D --> E[AWS Lambda]
    E --> F[AWS EC2]
Why the Simulation Engine is SeparateAll business logic resides in src/simulation/simulationEngine.js as pure functions. The UI only reads state and calls handlers.Benefit: Swapping mock data for real AWS data required zero changes to components.Implementation: Only App.jsx required a polling loop, and handlers were updated to include API calls.🛠 Infrastructure (Terraform)ResourcePurposeaws_apigatewayv2_apiHTTP API endpoint with CORS supportaws_apigatewayv2_stage$default stage with auto-deploy enabledaws_apigatewayv2_integrationProxy all requests to the Lambda functionaws_lambda_functionNode.js handler for EC2 lifecycle operationsaws_iam_roleLeast-privilege permissions for Lambdaaws_security_groupFirewall for launched EC2 instancesNote: EC2 instances are not managed in Terraform state. They are created/destroyed on-demand via the Lambda API to keep the environment dynamic.Lambda API EndpointsGET /instances — List running instances (filtered by Project: cloud-simulator tag).POST /instances — Launch a t3.micro in a specific AZ.DELETE /instances/{id} — Terminate a specific instance.🔍 Problems Encountered & Lessons Learned1. Tailwind v4 Breaking ChangesIssue: npx tailwindcss init -p failed and @tailwind directives didn't work.Root Cause: Tailwind v4 moved the PostCSS plugin to a separate package.Fix:Bashnpm install -D @tailwindcss/postcss
JavaScript// postcss.config.js
export default { 
  plugins: { 
    '@tailwindcss/postcss': {}, 
    autoprefixer: {} 
  } 
}
2. Dynamic Tailwind ClassesIssue: Classes like bg-${status}-500 didn't render styles.Root Cause: Tailwind's static scanner cannot "see" dynamically constructed strings at build time.Fix: Use a static lookup object for dynamic styles:JavaScriptconst STYLES = { 
  healthy: { background: '#10b981' }, 
  unhealthy: { background: '#ef4444' } 
};

<div style={STYLES[status]} />
3. React Reactivity vs. Module ImportsIssue: NetworkCanvas component showed stale data.Root Cause: Importing a static object (initial state) directly into a child component bypasses React's prop/state updates.Fix: Pass the live state down from the parent as a prop.4. CSS Animation SyntaxIssue: A single line break inside an animation shorthand killed all styles on the page.Root Cause: PostCSS failed to parse the split value and dropped the entire CSS rule, causing a cascade failure.💰 Cost & CleanupIdle Cost: $0 (Lambda and API Gateway stay within the Free Tier).Running Cost: You only pay for EC2 instances while they are active.To tear down all infrastructure:Bashcd infrastructure
terraform destroy