# セキュリティ注意事項

## AWS認証情報の管理

### ⚠️ 重要: 認証情報の取り扱い

AWS認証情報（Access Key ID、Secret Access Key）は**機密情報**です。以下の点に注意してください：

### 1. Gitにコミットしない

- ✅ `.gitignore`に認証情報ファイルが含まれていることを確認
- ✅ 認証情報を含むファイルをコミットしない
- ✅ 誤ってコミットした場合は、すぐにキーを無効化

### 2. 認証情報の保存場所

**推奨**: AWS CLIのデフォルト設定を使用

```powershell
aws configure
```

認証情報は以下の場所に保存されます：
- Windows: `%USERPROFILE%\.aws\credentials`
- Linux/Mac: `~/.aws/credentials`

このファイルは自動的に`.gitignore`に含まれます。

### 3. IAMユーザーの権限

**最小権限の原則**に従い、必要最小限の権限のみを付与してください：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "rds:*",
        "ec2:DescribeVpcs",
        "ec2:DescribeSubnets",
        "ec2:DescribeSecurityGroups",
        "ec2:CreateSecurityGroup",
        "ec2:AuthorizeSecurityGroupIngress",
        "ec2:AuthorizeSecurityGroupEgress"
      ],
      "Resource": "*"
    }
  ]
}
```

### 4. 認証情報が漏洩した場合

1. **すぐにAWS IAMコンソールにアクセス**
2. **該当するアクセスキーを無効化**
3. **新しいアクセスキーを生成**
4. **すべての環境で認証情報を更新**

### 5. 定期的なローテーション

- 定期的にアクセスキーをローテーション（3-6ヶ月ごと推奨）
- 使用していないアクセスキーは削除

### 6. 環境変数での使用（オプション）

Terraformで環境変数を使用する場合：

```powershell
$env:AWS_ACCESS_KEY_ID = "YOUR_AWS_ACCESS_KEY_ID"
$env:AWS_SECRET_ACCESS_KEY = "YOUR_AWS_SECRET_ACCESS_KEY"
$env:AWS_DEFAULT_REGION = "ap-northeast-1"
```

**注意**: 環境変数は現在のセッションでのみ有効です。

---

## 参考資料

- [AWS IAM ベストプラクティス](https://docs.aws.amazon.com/ja_jp/IAM/latest/UserGuide/best-practices.html)
- [AWS CLI 設定](https://docs.aws.amazon.com/ja_jp/cli/latest/userguide/cli-configure-files.html)
- [Terraform AWS Provider 認証](https://registry.terraform.io/providers/hashicorp/aws/latest/docs#authentication)




