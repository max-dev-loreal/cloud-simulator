variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Prefix for all created resources"
  type        = string
  default     = "cloud-simulator"
}

variable "ami_id" {
  description = "AMI ID for EC2 instances (Amazon Linux 2023, us-east-1)"
  type        = string
  default     = "ami-0c02fb55956c7d316"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t2.micro"
}
