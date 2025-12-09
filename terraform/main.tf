# Terraform設定 - AWS RDS PostgreSQL（無料枠）

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# AWSプロバイダーの設定
provider "aws" {
  region = "ap-northeast-1" # 東京リージョン

  default_tags {
    tags = {
      Project     = "GachaLab"
      Environment = "development"
      ManagedBy   = "Terraform"
    }
  }
}

# データソース: デフォルトVPC
data "aws_vpc" "default" {
  default = true
}

# データソース: デフォルトVPCのサブネット
data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# データソース: 利用可能なAZ
data "aws_availability_zones" "available" {
  state = "available"
}

# セキュリティグループ: RDS用
resource "aws_security_group" "rds" {
  name        = "gacha-lab-rds-sg"
  description = "Security group for Gacha Lab RDS PostgreSQL"
  vpc_id      = data.aws_vpc.default.id

  # PostgreSQL用のインバウンドルール（開発環境用）
  ingress {
    description = "PostgreSQL from anywhere (dev only)"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # 本番環境では制限してください
  }

  # アウトバウンドルール（すべて許可）
  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "gacha-lab-rds-sg"
  }
}

# DBサブネットグループ
resource "aws_db_subnet_group" "main" {
  name       = "gacha-lab-db-subnet-group"
  subnet_ids = data.aws_subnets.default.ids

  tags = {
    Name = "gacha-lab-db-subnet-group"
  }
}

# RDS PostgreSQLインスタンス（無料枠）
resource "aws_db_instance" "postgres" {
  identifier = "gacha-lab-db"

  # エンジン設定
  engine         = "postgres"
  engine_version = "16" # 最新の安定版（マイナーバージョンは自動選択）
  instance_class = "db.t3.micro" # 無料枠

  # ストレージ設定（無料枠: 20GB）
  allocated_storage     = 20
  max_allocated_storage = 20 # 自動スケーリング無効（無料枠内）
  storage_type         = "gp3"
  storage_encrypted     = false # 無料枠では暗号化不要

  # データベース設定
  db_name  = "gacha_lab"
  username = "postgres"
  password = var.db_password # 変数から取得

  # ネットワーク設定
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = true # 開発環境用（本番ではfalse推奨）
  port                   = 5432

  # バックアップ設定
  backup_retention_period = 1 # 無料枠の最大値（1日）
  backup_window          = "03:00-04:00" # JST 12:00-13:00
  maintenance_window     = "mon:04:00-mon:05:00" # JST mon:13:00-mon:14:00

  # その他設定
  skip_final_snapshot       = true # 開発環境用（削除を簡単にするため）
  deletion_protection       = false # 開発環境用
  auto_minor_version_upgrade = true

  # パフォーマンスインサイト（無料枠では無効）
  performance_insights_enabled = false
  monitoring_interval         = 0

  tags = {
    Name = "gacha-lab-postgres"
  }
}

# 出力: エンドポイント
output "db_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.postgres.endpoint
}

# 出力: ポート
output "db_port" {
  description = "RDS instance port"
  value       = aws_db_instance.postgres.port
}

# 出力: データベース名
output "db_name" {
  description = "Database name"
  value       = aws_db_instance.postgres.db_name
}

# 出力: ユーザー名
output "db_username" {
  description = "Database master username"
  value       = aws_db_instance.postgres.username
  sensitive   = true
}

# 出力: 接続URL（DATABASE_URL形式）
output "database_url" {
  description = "Database connection URL"
  value       = "postgresql://${aws_db_instance.postgres.username}:${var.db_password}@${aws_db_instance.postgres.endpoint}:${aws_db_instance.postgres.port}/${aws_db_instance.postgres.db_name}?sslmode=require"
  sensitive   = true
}




