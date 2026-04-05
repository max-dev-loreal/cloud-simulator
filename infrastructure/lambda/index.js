const {
  EC2Client,
  RunInstancesCommand,
  TerminateInstancesCommand,
  DescribeInstancesCommand,
} = require("@aws-sdk/client-ec2");
 
const client = new EC2Client({ region: process.env.AWS_REGION });
 
const {
  SECURITY_GROUP_ID,
  AMI_ID,
  INSTANCE_TYPE,
  PROJECT_NAME,
} = process.env;
 
exports.handler = async (event) => {
  const method = event.requestContext.http.method;
  const path   = event.requestContext.http.path;
 
  console.log(`${method} ${path}`);
 
  try {
    // ── GET /instances ───────────────────────────────────────────────────────
    if (method === "GET" && path === "/instances") {
      const data = await client.send(new DescribeInstancesCommand({
        Filters: [
          { Name: "tag:Project", Values: [PROJECT_NAME] },
          { Name: "instance-state-name", Values: ["pending", "running"] },
        ],
      }));
 
      const instances = data.Reservations.flatMap(r =>
        r.Instances.map(i => ({
          id:           i.InstanceId,
          state:        i.State.Name,
          type:         i.InstanceType,
          az:           i.Placement.AvailabilityZone,
          launchTime:   i.LaunchTime,
          publicIp:     i.PublicIpAddress || null,
        }))
      );
 
      return ok(instances);
    }
 
    // ── POST /instances ──────────────────────────────────────────────────────
    if (method === "POST" && path === "/instances") {
      const body = event.body ? JSON.parse(event.body) : {};
      const az   = body.az || null; // e.g. "us-east-1a"
 
      const params = {
        ImageId:      AMI_ID,
        InstanceType: INSTANCE_TYPE,
        MinCount:     1,
        MaxCount:     1,
        SecurityGroupIds: [SECURITY_GROUP_ID],
        TagSpecifications: [{
          ResourceType: "instance",
          Tags: [
            { Key: "Project", Value: PROJECT_NAME },
            { Key: "Name",    Value: `${PROJECT_NAME}-instance` },
          ],
        }],
      };
 
      if (az) {
        params.Placement = { AvailabilityZone: az };
      }
 
      const data = await client.send(new RunInstancesCommand(params));
      const inst = data.Instances[0];
 
      return ok({
        id:         inst.InstanceId,
        state:      inst.State.Name,
        type:       inst.InstanceType,
        az:         inst.Placement.AvailabilityZone,
        launchTime: inst.LaunchTime,
      }, 201);
    }
 
    // ── DELETE /instances/{id} ───────────────────────────────────────────────
    if (method === "DELETE" && path.startsWith("/instances/")) {
      const instanceId = event.pathParameters?.id;
 
      if (!instanceId) {
        return error("Instance ID is required", 400);
      }
 
      await client.send(new TerminateInstancesCommand({
        InstanceIds: [instanceId],
      }));
 
      return ok({ terminated: instanceId });
    }
 
    return error("Not found", 404);
 
  } catch (err) {
    console.error(err);
    return error(err.message, 500);
  }
};
 
function ok(body, status = 200) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}
 
function error(message, status = 500) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ error: message }),
  };
}