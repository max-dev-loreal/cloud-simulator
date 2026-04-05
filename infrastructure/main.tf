terraform {
    required_providers {
      aws = {
        source = "hashicorp/aws"
        version = "~> 5.0"
      }
    }
}
provider "aws" {
  region = var.aws_region
}
# -- Lambda Role ---------------------------------------------------------------
resource "aws_iam_role" "lambda_role" {
 name = "${var.project_name}-lambda-role"

 assume_role_policy = jsondecode({
    Version = "2012-10-17"
    Statement = [{
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = { service = "lambda.amazonaws.com"}
    }]
 })
}
# -- /Lambda Role -----------------------------------------------------------


# -- IAM Policy -------------------------------------------------------------
resource "aws_iam_role_policy" "lambda_ec2_policy" {
  name = "${var.project_name}-ec2-policy"
  role = aws_iam_role.lambda_role.id

  policy = jsondecode({
    Version = "2012-10-17"
    Statement = [
        {
            Effect = "Allow"
            #allow lambda to mange ec2 instances
            Action = [
                "ec2:RunInstances", #run instance
                "ec2:TerminateInstances", #terminate instance
                "ec2:DescribeInstances", #describe instance
                "ec2:CreateTags", #create tags for instance
            ]
            Resource = "*"
        },
        {
            Effect = "Allow"
            # allow lambda to write logs to cloudwatch
            Action = [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
            ]
            Resource = "arn:aws:logs:*:*:*"
        }
    ]
  })
}
# -- /IAM Policy ------------------------------------------------------------

# -- Security Group ---------------------------------------------------------
resource "aws_security_group" "instance_sg" {
  name        = "${var.project_name}-instance-sg"
  description = "Firewall for on-demand EC2 instances"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "SSH"
}

    ingress {
        from_port = 80
        to_port = 80
        protocol = "tcp"
        cidr_blocks = ["0.0.0.0/0"]
        description = "HTTP"
}

    egress {
        from_port   = 0
        to_port     = 0
        protocol    = "-1"
        cidr_blocks = ["0.0.0.0/0"]
    }

    tags = {
        Project = var.project_name
    }
}
# -- /Security Group --------------------------------------------------------

# -- Lambda Function ---------------------------------------------------------
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_file  = "${path.module}/lambda/index.js"
  output_path = "${path.module}/lambda/function.zip"
}  
  resource "aws_lambda_function" "ec2_manager" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "${var.project_name}-ec2-manager"
  role             = aws_iam_role.lambda_role.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  timeout          = 30

  environment {
    variables = {
      SECURITY_GROUP_ID = aws_security_group.instance_sg.id
      AMI_ID            = var.ami_id
      INSTANCE_TYPE     = var.instance_type
      PROJECT_NAME      = var.project_name
    }
  }

  tags = {
    Project = var.project_name
  }
}
# -- /Lambda Function --------------------------------------------------------

# -- API Gateway ---------------------------------------------------------------
resource "aws_apigatewayv2_api" "api" {
  name = "${var.project_name}-api"
  protocol_type = "HTTP"
  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "DELETE", "OPTIONS"]
    allow_headers = ["Content-Type"]
  }
}
resource "aws_apigatewayv2_stage" "default" {
  api_id = aws_apigatewayv2_api.api.id
  name = "$default"
  auto_deploy = true
}
resource "aws_apigatewayv2_integration" "lambda" {
  api_id = aws_apigatewayv2_api.api.id
  integration_type = "AWS_PROXY"
  integration_uri = aws_lambda_function.ec2_manager.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "list" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "GET /instances"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "launch" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "POST /instances"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "terminate" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "DELETE /instances/{id}"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ec2_manager.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
}
# -- /API Gateway ---------------------------------------------------------------