# CloudFront 動画キャッシュ設定

## 概要

AWS CloudFront は動画コンテンツのキャッシュと配信に対応しています。AWS Amplify を使用している場合、CloudFront が自動的に設定されるため、動画ファイルもキャッシュされます。

## CloudFront で動画をキャッシュできる理由

### 1. 基本的なキャッシュ機能

- **エッジロケーション**: 世界中のエッジロケーションに動画をキャッシュ
- **オリジンサーバー負荷軽減**: オリジン（Amplify）へのリクエストを削減
- **高速配信**: ユーザーに最も近いエッジロケーションから配信

### 2. 動画ファイルのキャッシュ設定

CloudFront は以下の動画形式をサポート：

- MP4
- WebM
- MOV
- その他の一般的な動画形式

## 現在のプロジェクト構成

### 動画ファイルの配置

```
app/
└── public/
    └── videos/
        ├── item1.mp4
        ├── item2.mp4
        └── ...
```

### 動画 URL の構造

- **ローカル開発**: `/videos/item1.mp4`
- **本番環境（Amplify + CloudFront）**: `https://[domain].cloudfront.net/videos/item1.mp4`

## AWS Amplify での自動設定

AWS Amplify を使用している場合：

1. **自動 CloudFront 設定**: Amplify が自動的に CloudFront ディストリビューションを作成
2. **静的アセットのキャッシュ**: `public/`ディレクトリのファイルは自動的にキャッシュ対象
3. **キャッシュ TTL**: デフォルトで 24 時間（設定可能）

## 動画キャッシュの最適化設定

### 1. CloudFront キャッシュポリシーの設定

**推奨設定:**

```json
{
  "CachePolicy": {
    "Name": "VideoCachePolicy",
    "DefaultTTL": 86400, // 24時間（秒）
    "MaxTTL": 31536000, // 1年（秒）
    "MinTTL": 0,
    "ParametersInCacheKeyAndForwardedToOrigin": {
      "EnableAcceptEncodingGzip": true,
      "EnableAcceptEncodingBrotli": true
    }
  }
}
```

### 2. 動画ファイルの最適化

**ファイルサイズの最適化:**

- 動画の圧縮（H.264 エンコーディング）
- 解像度の最適化（必要に応じて）
- ビットレートの調整

**推奨設定:**

- 解像度: 720p または 1080p（用途に応じて）
- ビットレート: 2-5Mbps
- コーデック: H.264（MP4）

### 3. キャッシュヘッダーの設定

**Next.js の設定（`next.config.ts`）:**

```typescript
module.exports = {
  async headers() {
    return [
      {
        source: "/videos/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};
```

## 実装方法

### オプション 1: Amplify の自動設定を利用（現在）

**メリット:**

- 設定不要
- 自動的に CloudFront が設定される
- `public/`ディレクトリのファイルは自動的にキャッシュ

**デメリット:**

- キャッシュ TTL の細かい制御が難しい
- 動画専用の最適化設定ができない

### オプション 2: S3 + CloudFront を直接設定

**メリット:**

- 動画専用の最適化設定が可能
- キャッシュポリシーの細かい制御
- 大容量動画ファイルに適している

**デメリット:**

- 追加の設定が必要
- S3 のストレージコストが発生

**実装手順:**

1. **S3 バケットの作成**

   ```
   gacha-lab-videos
   ```

2. **CloudFront ディストリビューションの作成**

   - オリジン: S3 バケット
   - キャッシュポリシー: 動画最適化ポリシー
   - ビヘイビア: `/videos/*` パス

3. **動画 URL の更新**

   ```typescript
   // 環境変数でCloudFront URLを設定
   NEXT_PUBLIC_CLOUDFRONT_VIDEO_URL=https://[distribution-id].cloudfront.net

   // 動画URLの生成
   const videoUrl = `${process.env.NEXT_PUBLIC_CLOUDFRONT_VIDEO_URL}/videos/${item.videoUrl}`;
   ```

## キャッシュの確認方法

### 1. CloudFront のキャッシュヒット率を確認

AWS CloudFront コンソールで以下を確認：

- **キャッシュヒット率**: 通常 80-95%が目標
- **リクエスト数**: オリジンへのリクエスト数
- **データ転送量**: エッジからの転送量

### 2. ブラウザの開発者ツールで確認

```
Network タブ:
- Status: 200 (from disk cache) または (from memory cache)
- Response Headers: X-Cache: Hit from cloudfront
```

## コスト最適化

### 1. データ転送料金

- **CloudFront → ユーザー**: 有料（GB あたり）
- **S3 → CloudFront**: 無料（同一リージョン内）
- **Amplify → CloudFront**: 無料（自動設定の場合）

### 2. キャッシュヒット率の向上

- **キャッシュ TTL の延長**: 動画ファイルは変更頻度が低いため、長い TTL を設定
- **ファイル名のバージョニング**: 動画を更新する場合は、新しいファイル名を使用
  ```
  item1_v1.mp4 → item1_v2.mp4
  ```

## 推奨設定（現在のプロジェクト）

### 現状（Amplify 自動設定）

✅ **そのまま使用可能**

- `public/videos/`の動画ファイルは自動的に CloudFront でキャッシュ
- 追加設定は不要

### 将来的な最適化（必要に応じて）

1. **動画ファイルの最適化**

   - ファイルサイズの削減
   - エンコーディングの最適化

2. **S3 + CloudFront への移行**（大容量動画の場合）
   - 動画専用の CloudFront ディストリビューション
   - より細かいキャッシュ制御

## 注意事項

1. **動画ファイルの更新時**

   - ファイル名を変更するか、キャッシュを無効化（CloudFront Invalidation）
   - キャッシュ無効化にはコストがかかる（最初の 1000 件/月は無料）

2. **大容量動画ファイル**

   - ファイルサイズが大きい場合は、S3 + CloudFront の直接設定を検討
   - ストリーミング配信（HLS/DASH）の検討

3. **モバイル対応**
   - モバイル向けに低解像度版を用意することを検討
   - 適応的ビットレートストリーミング（ABR）の検討

## 参考資料

- [AWS CloudFront ドキュメント](https://docs.aws.amazon.com/ja_jp/AmazonCloudFront/latest/DeveloperGuide/)
- [CloudFront 動画配信ガイド](https://docs.aws.amazon.com/ja_jp/AmazonCloudFront/latest/DeveloperGuide/on-demand-video.html)
- [AWS Amplify ホスティング](https://docs.amplify.aws/react/build-a-backend/hosting/)

---

**結論**: CloudFront は動画もキャッシュできます。AWS Amplify を使用している場合、`public/videos/`の動画ファイルは自動的に CloudFront でキャッシュされ、高速配信されます。




