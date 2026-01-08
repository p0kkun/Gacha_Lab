# CloudWatchログの確認方法

AWS AmplifyのログはCloudWatchに出力されます。動画アップロードエラーの原因を特定するために、CloudWatchでログを確認する方法を説明します。

## 📋 CloudWatchログの確認手順

### 方法1: AWS Amplifyコンソールから確認（簡単）

1. [AWS Amplifyコンソール](https://console.aws.amazon.com/amplify/)にアクセス
2. アプリを選択
3. 左メニューから「**モニタリング**」をクリック
4. 「**ログ**」タブをクリック
5. 最新のログを確認

### 方法2: CloudWatchコンソールから直接確認（詳細）

1. [AWS CloudWatchコンソール](https://console.aws.amazon.com/cloudwatch/)にアクセス
2. 左メニューから「**ログ**」→「**ロググループ**」をクリック
3. ロググループ一覧から以下を探す：
   - `/aws/amplify/[アプリ名]` または
   - `/aws/amplify/[アプリ名]/[ブランチ名]`
4. ロググループをクリック
5. 最新のログストリームを選択
6. ログイベントを確認

---

## 🔍 確認すべきログ

### 1. S3アップロード設定のログ

動画アップロード時に、以下のようなログが出力されます：

```
S3アップロード設定: {
  bucket: 'gacha-lab-test',
  region: 'ap-northeast-1',
  useLocalStack: false,
  hasAccessKey: true,
  hasSecretKey: true,
  cloudfrontDomain: 'd33hx1uob3y8zt.cloudfront.net',
  key: 'videos/rarity/first-prize/...',
  contentType: 'video/mp4'
}
```

**確認ポイント**:
- `hasAccessKey: true` になっているか
- `hasSecretKey: true` になっているか
- `bucket` が正しいか
- `region` が正しいか

### 2. S3アップロードエラーのログ

エラーが発生した場合、以下のようなログが出力されます：

```
S3アップロードエラー詳細: {
  name: 'AccessDenied',
  code: 403,
  message: 'Access Denied',
  bucket: 'gacha-lab-test',
  key: 'videos/rarity/first-prize/...',
  region: 'ap-northeast-1',
  useLocalStack: false,
  hasAccessKey: true,
  hasSecretKey: true
}
```

**確認ポイント**:
- `name`: エラーの種類（例: `AccessDenied`、`InvalidAccessKeyId`、`SignatureDoesNotMatch`）
- `code`: HTTPステータスコード（例: `403`、`401`）
- `message`: エラーメッセージ

### 3. 動画アップロードAPIのエラーログ

```
動画アップロードエラー: Error: S3アップロードエラー [AccessDenied: 403]: Access Denied
動画アップロードエラー詳細: {
  message: 'S3アップロードエラー [AccessDenied: 403]: Access Denied',
  details: 'Error: S3アップロードエラー [AccessDenied: 403]: Access Denied\n    at ...',
  errorType: 'Error'
}
```

---

## 🔎 ログの検索方法

### CloudWatch Logs Insightsを使用（推奨）

1. CloudWatchコンソール → 「ログ」→「ロググループ」
2. ロググループを選択
3. 「ログインサイトで開く」をクリック
4. クエリを入力：

```sql
fields @timestamp, @message
| filter @message like /S3アップロード/
| sort @timestamp desc
| limit 100
```

### 特定のエラーを検索

```sql
fields @timestamp, @message
| filter @message like /S3アップロードエラー/
| sort @timestamp desc
| limit 50
```

### 環境変数の設定状況を確認

```sql
fields @timestamp, @message
| filter @message like /S3アップロード設定/
| sort @timestamp desc
| limit 20
```

---

## 📊 よくあるエラーログと対処法

### エラー: `AccessDenied` または `403`

**ログ例**:
```
S3アップロードエラー詳細: {
  name: 'AccessDenied',
  code: 403,
  message: 'Access Denied'
}
```

**原因**: S3バケットポリシーにIAMユーザーのアクセス許可が不足  
**対処**: [S3バケットポリシー修正手順](./S3バケットポリシー修正手順.md)を参照

### エラー: `InvalidAccessKeyId` または `401`

**ログ例**:
```
S3アップロードエラー詳細: {
  name: 'InvalidAccessKeyId',
  code: 401,
  message: 'The AWS Access Key Id you provided does not exist in our records.'
}
```

**原因**: 環境変数`S3_ACCESS_KEY_ID`が間違っている、または設定されていない  
**対処**: Amplify Consoleで環境変数を確認・修正

### エラー: `SignatureDoesNotMatch`

**ログ例**:
```
S3アップロードエラー詳細: {
  name: 'SignatureDoesNotMatch',
  code: 403,
  message: 'The request signature we calculated does not match the signature you provided.'
}
```

**原因**: 環境変数`S3_SECRET_ACCESS_KEY`が間違っている  
**対処**: Amplify Consoleで環境変数を確認・修正

### エラー: `S3_BUCKET_NAME環境変数が設定されていません`

**ログ例**:
```
S3環境変数チェック: {
  S3_BUCKET_NAME: undefined,
  AWS_S3_BUCKET_NAME: undefined,
  BUCKET_NAME: ''
}
```

**原因**: 環境変数`S3_BUCKET_NAME`が設定されていない  
**対処**: Amplify Consoleで環境変数を追加

---

## 🧪 デバッグ用ログの確認

コードに追加したデバッグログがCloudWatchに出力されます。以下のログを探してください：

1. **`S3アップロード設定:`** - 環境変数の設定状況
2. **`S3アップロード成功:`** - アップロードが成功した場合
3. **`S3アップロードエラー:`** - エラーが発生した場合
4. **`S3アップロードエラー詳細:`** - エラーの詳細情報
5. **`動画アップロードエラー:`** - APIエンドポイントでのエラー
6. **`動画アップロードエラー詳細:`** - APIエンドポイントでのエラー詳細

---

## 📝 ログの保存期間

- **デフォルト**: ログは無期限に保存されます
- **ログの保持期間**: CloudWatch Logsの設定で変更可能
- **コスト**: ログの保存と検索にコストがかかります（通常は無料枠内）

---

## 🔗 関連ドキュメント

- [DEV環境でのS3アップロードエラー対処法](./DEV環境でのS3アップロードエラー対処法.md)
- [S3バケットポリシー修正手順](./S3バケットポリシー修正手順.md)
- [ローカルとDEV環境の違い](./ローカルとDEV環境の違い_なぜローカルでは成功するか.md)




