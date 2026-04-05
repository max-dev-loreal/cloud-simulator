output "api_url" {
  description = "Base URL — paste into frontend .env"
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "lambda_function_name" {
  description = "Lambda function name"
  value       = aws_lambda_function.ec2_manager.function_name
}

output "security_group_id" {
  description = "Security group ID for EC2 instances"
  value       = aws_security_group.instance_sg.id
}