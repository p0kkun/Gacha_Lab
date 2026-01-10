# S3 Presigned URLアップロードエラーの対処法

## 🔴 問題の状況

Presigned URLを取得した後、S3への直接アップロードで`Failed to fetch`エラーが発生します。

```
POST /api/admin/videos/presigned-url 200 in 2.7s
Failed to fetch
動画のアップロードに失敗
```

## 🎯 原因

S3への直接アップロードで`Failed to fetch`エラーが発生する主な原因：

1. **CORS設定の問題**
   - S3バケットにCORS設定がない、または不適切
   - ブラウザからの直接アップロードにはCORS設定が必須

2. **Presigned URLの形式が正しくない**
   - URLが正しく生成されていない
   - 有効期限が切れている

3. **リクエストヘッダーの問題**
   - `Content-Type`が正しく設定されていない
   - 不要なヘッダーが含まれている

4. **ブラウザのセキュリティポリシー**
   - 混合コンテンツ（HTTPS/HTTP）の問題
   - セキュリティポリシーによるブロック

## ✅ 解決策

### ステップ1: S3バケットのCORS設定を確認・設定

S3バケットに以下のCORS設定を追加してください：

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
      "https://dev.d2zlbom9902v0u.amplifyapp.com",
      "https://*.amplifyapp.com",
      "http://localhost:3000"
    ],
    "ExposeHeaders": [
      "ETag",
      "x-amz-server-side-encryption",
      "x-amz-request-id",
      "x-amz-id-2"
    ],
    "MaxAgeSeconds": 3000
  }
]
```

**設定手順**:
1. AWS S3コンソールにアクセス
2. 対象のバケット（`gacha-lab-test`）を選択
3. 「アクセス許可」タブを開く
4. 「クロスオリジンリソース共有（CORS）」セクションを開く
5. 上記のJSONを貼り付けて保存

### ステップ2: Presigned URLの生成を確認

`lib/s3-upload.ts`の`generatePresignedUploadUrl`関数を確認：

```typescript
export async function generatePresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  // ...
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
    CacheControl: 'max-age=31536000',
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn });
  return url;
}
```

### ステップ3: ブラウザのコンソールでエラーを確認

1. ブラウザの開発者ツール（F12）を開く
2. 「Console」タブでエラーメッセージを確認
3. 「Network」タブでS3へのリクエストを確認
   - ステータスコード（403、404、CORSエラーなど）
   - リクエストヘッダー
   - レスポンスヘッダー

### ステップ4: エラーハンドリングを改善

フロントエンドのエラーハンドリングを改善して、より詳細なエラー情報を取得：

```typescript
try {
  const uploadRes = await fetch(presignedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': uploadFile.type,
    },
    body: uploadFile,
  });

  if (!uploadRes.ok) {
    const errorText = await uploadRes.text();
    console.error('S3アップロードエラー:', {
      status: uploadRes.status,
      statusText: uploadRes.statusText,
      errorText,
    });
    throw new Error(`S3へのアップロードに失敗しました: ${uploadRes.status} ${uploadRes.statusText}`);
  }
} catch (fetchError) {
  console.error('S3アップロードエラー（fetch）:', fetchError);
  throw fetchError;
}
```

## 🔧 トラブルシューティング

### CORSエラーの場合

**症状**: ブラウザのコンソールに以下のようなエラーが表示される
```
Access to fetch at 'https://...' from origin 'https://...' has been blocked by CORS policy
```

**対処**:
1. S3バケットのCORS設定を確認
2. `AllowedOrigins`に現在のオリジンが含まれているか確認
3. `AllowedMethods`に`PUT`が含まれているか確認

### 403 Forbiddenエラーの場合

**症状**: ステータスコード403が返される

**対処**:
1. Presigned URLの有効期限を確認
2. IAMユーザーの権限を確認（`PutObject`権限があるか）
3. S3バケットポリシーを確認

### 404 Not Foundエラーの場合

**症状**: ステータスコード404が返される

**対処**:
1. Presigned URLが正しく生成されているか確認
2. S3キーが正しいか確認
3. バケット名が正しいか確認

## 📋 確認チェックリスト

- [ ] S3バケットにCORS設定が追加されている
- [ ] CORS設定の`AllowedOrigins`に現在のオリジンが含まれている
- [ ] CORS設定の`AllowedMethods`に`PUT`が含まれている
- [ ] Presigned URLが正しく生成されている
- [ ] ブラウザのコンソールでエラーメッセージを確認した
- [ ] NetworkタブでS3へのリクエストを確認した
- [ ] IAMユーザーに`PutObject`権限がある
- [ ] S3バケットポリシーが正しく設定されている

## 🔗 関連ドキュメント

- [AWS S3 CORS設定](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html)
- [S3 Presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)
- [S3バケットポリシー修正手順](./S3バケットポリシー修正手順.md)




