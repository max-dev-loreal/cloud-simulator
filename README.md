Cloud System Simulator
Interactive visualization of a distributed cloud infrastructure — load balancing, health checks, auto scaling, and failover, running in real time in the browser.
Built as a frontend foundation for a future AWS-backed dashboard (Terraform + CloudWatch integration planned).

What it does

Live load balancing across EC2 instances with two algorithms: Least Load and Round Robin
Health system — instances degrade under load, recover automatically, get excluded from routing when unhealthy
Availability Zones — AZ-1 and AZ-2 containers with independent instance pools and failover
Auto scaling — spin up new instances into any AZ, with a booting state before going healthy
Traffic simulation — animated packets flowing from LB to instances, density reflects actual load
Incident simulation — DDoS attack mode, manual instance kill, full AZ takedown
Event log — real-time feed of system events


Architecture decisions
Simulation engine separated from UI
src/simulation/simulationEngine.js contains all business logic — routing, load decay, health transitions, scaling — as pure functions with no React dependencies.
UI (React) → reads state → renders
simulationEngine.js → tick(), sendPacket(), killInstance() → returns new state
This means the engine can be swapped for real AWS API calls without touching a single component. The shape of the state object stays the same; only the data source changes.
No Tailwind for dynamic styles
Tailwind v4 dropped support for dynamically constructed class names like `bg-${status}-500`. The CSS purger only picks up static strings — a dynamically built class string is invisible at build time and produces no output.
Wrong:
jsxconst color = status === 'healthy' ? 'emerald' : 'red';
<div className={`bg-${color}-500`} /> // class never exists in bundle
Right:
jsxconst STYLES = {
  healthy: { background: '#10b981' },
  unhealthy: { background: '#ef4444' },
};
<div style={STYLES[status]} />
All status-dependent visuals use inline styles with explicit values. This is also more performant — no class lookups, no specificity issues.
State as single source of truth
App.jsx owns one sim object. Every action — send packet, kill instance, scale up — is a pure function that takes the current state and returns a new one. React re-renders from that.
jssetSim(s => sendPacket(s));   // fire a request
setSim(s => killInstance(s, 'i-2'));  // terminate
setSim(s => tick(s));         // decay loop
No local state in child components for anything simulation-related. Components receive data as props and call handlers up.

Problems encountered and how they were solved
Problem 1: Components not re-rendering with updated load data
NetworkCanvas was importing initialNetwork directly instead of using the data prop passed from App. The parent was updating state correctly, but the child was reading stale static data on every render.
Root cause: importing module-level state bypasses React's reactivity entirely. The component never knew an update happened.
Fix: removed the direct import, destructured data from props, used that throughout.
jsx// before — broken
import { initialNetwork } from '../../data/network';
function NetworkCanvas({ activeTarget }) {
  const lb = initialNetwork.loadBalancer; // always stale
}

// after — correct
function NetworkCanvas({ activeTarget, data }) {
  const lb = data.loadBalancer; // live state from App
}
Problem 2: Tailwind v4 breaking change — @tailwind directives removed
After upgrading to Tailwind v4, the project failed with:
[postcss] It looks like you're trying to use `tailwindcss` directly as a PostCSS plugin.
The PostCSS plugin has moved to a separate package.
Tailwind v4 split the PostCSS integration into @tailwindcss/postcss. The @tailwind base/components/utilities directives were also replaced.
Fix:
bashnpm install -D @tailwindcss/postcss
js// postcss.config.js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
css/* index.css — before */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* index.css — after */
@import "tailwindcss";
Problem 3: CSS animation syntax error killing entire stylesheet
A line break inside the animation shorthand property caused PostCSS to silently drop the entire rule, which cascaded into all Tailwind utility classes also failing to apply.
css/* broken — line break splits the value */
.animate-status-pulse {
  animation: status-pulse 2s
  cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* fixed */
.animate-status-pulse {
  animation: status-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
The symptom was a completely unstyled page — no colors, no layout, no spacing. The actual error was a single misplaced newline.

Planned: AWS integration
The simulation engine is a placeholder for real infrastructure data. Planned replacement:
simulationEngine.js (mock)
        ↓
REST API (Node.js / Python)
        ↓
AWS SDK — ec2.describeInstances(), cloudwatch.getMetricData()
        ↓
Terraform state — real instance IDs, AZ assignments
The frontend state shape stays identical. Only the data source changes from generated numbers to CloudWatch metrics.

Stack

React 18 + Vite
Framer Motion — node animations, packet motion, load bar transitions
Tailwind CSS v4 — layout and base reset only
Pure inline styles — all status/load-dependent visuals


Run locally
bashnpm install
npm run dev