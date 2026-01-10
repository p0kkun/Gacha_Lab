# S3 CORS設定手順（詳細）

## 🔴 問題の状況

ブラウザからS3への直接アップロード時に以下のCORSエラーが発生：

```
Access to fetch at 'https://gacha-lab-test.s3.ap-northeast-1.amazonaws.com/...' 
from origin 'http://localhost:3000' has been blocked by CORS policy: 
Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## ✅ 解決策: S3バケットにCORS設定を追加

### ステップ1: AWS S3コンソールにアクセス

1. [AWS S3コンソール](https://s3.console.aws.amazon.com/)にアクセス
2. 対象のバケット（`gacha-lab-test`）をクリック

### ステップ2: CORS設定を追加

1. バケットの詳細ページで「アクセス許可」タブをクリック
2. 「クロスオリジンリソース共有（CORS）」セクションまでスクロール
3. 「編集」ボタンをクリック
4. 以下のJSONを貼り付けて保存：

```json
[
  {
    "AllowedHeaders": [
      "*"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE",
      "HEAD"
    ],
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://dev.d2zlbom9902v0u.amplifyapp.com",
      "https://*.amplifyapp.com"
    ],
    "ExposeHeaders": [
      "ETag",
      "x-amz-server-side-encryption",
      "x-amz-request-id",
      "x-amz-id-2",
      "x-amz-version-id"
    ],
    "MaxAgeSeconds": 3000
  }
]
```

### ステップ3: 設定の確認

**重要なポイント**:
- `AllowedOrigins`に`http://localhost:3000`が含まれていること（ローカル開発用）
- `AllowedOrigins`に`https://dev.d2zlbom9902v0u.amplifyapp.com`が含まれていること（DEV環境用）
- `AllowedMethods`に`PUT`が含まれていること（Presigned URLアップロードに必要）
- `AllowedHeaders`に`*`が設定されていること（すべてのヘッダーを許可）

### ステップ4: 設定の反映を確認

1. 設定を保存後、数秒待つ（設定の反映に時間がかかる場合がある）
2. ブラウザで再度動画アップロードを試行
3. ブラウザの開発者ツール（F12）でNetworkタブを確認
   - OPTIONSリクエスト（preflight）が200 OKを返すことを確認
   - PUTリクエストが成功することを確認

## 🔧 トラブルシューティング

### まだCORSエラーが発生する場合

1. **設定の反映を待つ**
   - S3のCORS設定は即座に反映されない場合がある
   - 数分待ってから再試行

2. **ブラウザのキャッシュをクリア**
   - ブラウザのキャッシュをクリアして再試行
   - シークレットモードで試行

3. **設定が正しいか再確認**
   - `AllowedOrigins`に正確なオリジンが含まれているか確認
   - 末尾のスラッシュ（`/`）がないか確認
   - プロトコル（`http://`または`https://`）が正しいか確認

4. **バケットポリシーを確認**
   - バケットポリシーがCORSをブロックしていないか確認

### 403 Forbiddenエラーが発生する場合

CORS設定は正しいが、403エラーが発生する場合：

1. **IAMユーザーの権限を確認**
   - `PutObject`権限があるか確認
   - バケットへのアクセス権限があるか確認

2. **Presigned URLの有効期限を確認**
   - URLが有効期限内か確認
   - 新しいPresigned URLを生成して再試行

3. **バケットポリシーを確認**
   - バケットポリシーが適切に設定されているか確認

## 📋 確認チェックリスト

- [ ] S3バケットにCORS設定が追加されている
- [ ] `AllowedOrigins`に`http://localhost:3000`が含まれている
- [ ] `AllowedOrigins`にDEV環境のURLが含まれている
- [ ] `AllowedMethods`に`PUT`が含まれている
- [ ] `AllowedHeaders`に`*`が設定されている
- [ ] 設定を保存した
- [ ] 数秒待ってから再試行した
- [ ] ブラウザのキャッシュをクリアした
- [ ] NetworkタブでOPTIONSリクエストが200 OKを返すことを確認した

## 🔗 関連ドキュメント

- [AWS S3 CORS設定](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html)
- [S3 Presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)
- [S3バケットポリシー修正手順](./S3バケットポリシー修正手順.md)




