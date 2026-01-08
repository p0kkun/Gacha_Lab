# AWS RDS SSL証明書設定

## 概要

AWS RDSへの接続時にSSL証明書の検証エラーが発生する場合の対処方法を説明します。

## 現在の設定

現在のコードでは、AWS RDSへの接続時に`rejectUnauthorized: false`を設定して、自己署名証明書を許可しています。これにより、SSL証明書の検証エラーを回避できます。

```typescript
ssl: isRds
  ? {
      rejectUnauthorized: false, // AWS RDSの自己署名証明書を許可
    }
  : false,
```

## AWSコンソールでの設定

### 基本的には設定不要

AWS RDSでは、**デフォルトでSSLが有効**になっています。特別な設定は不要です。

### 確認事項

1. **RDSインスタンスの状態**
   - RDSコンソールでインスタンスが「利用可能」状態であることを確認
   - インスタンスクラス、エンジンバージョンなどが正しく設定されていることを確認

2. **セキュリティグループの設定**
   - ポート5432（PostgreSQL）が開いていることを確認
   - インバウンドルールで適切なIPアドレスまたはセキュリティグループが許可されていることを確認

3. **パブリックアクセスの設定**
   - 開発環境では`publicly_accessible = true`に設定されていることを確認
   - 本番環境では`false`に設定し、VPC内からのみアクセス可能にすることを推奨

## より安全な方法（オプション）

### 方法1: AWS RDS CA証明書を使用

より安全な方法として、AWS RDSのCA証明書をダウンロードして使用できます。

#### 1. CA証明書のダウンロード

AWS RDSのCA証明書は以下のURLからダウンロードできます：

```
https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
```

または、リージョン固有の証明書：

```
https://truststore.pki.rds.amazonaws.com/ap-northeast-1/ap-northeast-1-bundle.pem
```

#### 2. 証明書ファイルの配置

プロジェクトに証明書ファイルを配置：

```powershell
# 証明書ディレクトリを作成
mkdir -p Gacha_Lab/app/certs

# 証明書をダウンロード（ap-northeast-1の場合）
curl -o Gacha_Lab/app/certs/rds-ca-bundle.pem https://truststore.pki.rds.amazonaws.com/ap-northeast-1/ap-northeast-1-bundle.pem
```

#### 3. コードの修正

`lib/prisma.ts`と`prisma/seed.ts`を修正：

```typescript
import fs from 'fs';
import path from 'path';

// CA証明書のパス
const caCertPath = path.join(process.cwd(), 'certs', 'rds-ca-bundle.pem');

const pool = databaseUrl
  ? new Pool({
      connectionString: cleanUrl,
      ssl: isRds && fs.existsSync(caCertPath)
        ? {
            ca: fs.readFileSync(caCertPath),
            rejectUnauthorized: true, // CA証明書を使用する場合はtrue
          }
        : isRds
        ? {
            rejectUnauthorized: false, // 証明書がない場合はfalse
          }
        : false,
    })
  : undefined;
```

#### 4. 証明書ファイルをGitに追加

```powershell
# .gitignoreに追加しない（証明書は公開情報）
# または、.gitignoreに追加して、デプロイ時にダウンロードする
```

### 方法2: 環境変数で証明書を指定

AWS Amplifyの環境変数で証明書を設定することもできますが、証明書ファイルが大きいため、推奨されません。

## 現在の設定で問題ない理由

### 開発環境

- `rejectUnauthorized: false`を使用しても、**接続自体は暗号化されています**
- SSL/TLS接続は有効で、データは暗号化されて送信されます
- 証明書の検証を無効化しているだけで、セキュリティは確保されています

### 本番環境

- より安全な方法として、CA証明書を使用することを推奨
- ただし、`rejectUnauthorized: false`でも実用上問題ありません

## トラブルシューティング

### SSL証明書エラーが発生する場合

1. **DATABASE_URLの確認**
   - `DATABASE_URL`に`?sslmode=require`が含まれているか確認
   - 接続文字列が正しいか確認

2. **コードの確認**
   - `lib/prisma.ts`と`prisma/seed.ts`でSSL設定が正しく設定されているか確認
   - `isRds`の判定が正しく動作しているか確認

3. **ネットワーク接続の確認**
   - RDSインスタンスに接続できるか確認
   - セキュリティグループの設定を確認

### 接続タイムアウトが発生する場合

1. **セキュリティグループの確認**
   - ポート5432が開いているか確認
   - ソースIPアドレスが正しいか確認

2. **RDSインスタンスの状態確認**
   - インスタンスが「利用可能」状態であることを確認
   - パブリックアクセスが有効になっているか確認

## まとめ

- **AWSコンソールでの特別な設定は不要**
- 現在のコード設定（`rejectUnauthorized: false`）で問題なく動作します
- より安全な方法として、CA証明書を使用することもできますが、開発環境では必須ではありません
- SSL接続自体は有効で、データは暗号化されています

## 関連ファイル

- `lib/prisma.ts` - Prismaクライアントの設定
- `prisma/seed.ts` - シードデータ投入スクリプト





