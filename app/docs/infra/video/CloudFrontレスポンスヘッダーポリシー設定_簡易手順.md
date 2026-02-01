# CloudFrontレスポンスヘッダーポリシー設定 簡易手順

## 🎯 目的

LINEアプリでCloudFront経由の動画を再生するため、CloudFrontのレスポンスヘッダーポリシーでCORSヘッダーを追加します。

## ⚠️ 重要

**S3のCORS設定だけでは不十分です！**

CloudFront経由で動画を配信する場合、CloudFrontのレスポンスヘッダーポリシーでCORSヘッダーを追加する必要があります。

## 📋 前提条件

- S3バケットのCORS設定が完了していること
- CloudFrontディストリビューション（`E2O1UP219WO08E`）が存在すること

## 🚀 設定手順

### ステップ1: レスポンスヘッダーポリシーを作成

1. [AWS CloudFrontコンソール](https://console.aws.amazon.com/cloudfront/)にアクセス
2. 左側のメニューから「**ポリシー**」→「**レスポンスヘッダーポリシー**」を選択
3. 「**レスポンスヘッダーポリシーを作成**」をクリック

### ステップ2: 基本設定

- **名前**: `LineAppVideoCORS`
- **説明**: `LINEアプリでの動画再生用CORS設定`（任意）

### ステップ3: CORS設定

**CORS設定**セクションで以下を設定：

1. **Access-Control-Allow-Origin**:
   - 「**カスタム値**」を選択
   - 以下のオリジンを追加（1つずつ追加）:
     - `line://`
     - `https://liff.line.me`
     - `http://localhost:3000`
     - `https://dev.d2zlbom9902v0u.amplifyapp.com`
     - `https://*.amplifyapp.com`

2. **Access-Control-Allow-Methods**:
   - `GET, HEAD, OPTIONS`

3. **Access-Control-Allow-Headers**:
   - `*`（すべてのヘッダーを許可）

4. **Access-Control-Expose-Headers**:
   - `Content-Length, Content-Type, Content-Range, Accept-Ranges, ETag`

5. **Access-Control-Max-Age**:
   - `3000`

### ステップ4: カスタムヘッダー

**カスタムヘッダー**セクションで：

- **Content-Type**: 「**オリジンから継承**」にチェックを入れる

### ステップ5: ポリシーを作成

1. 設定を確認
2. 「**作成**」をクリック

## 🔗 ディストリビューションに適用

### ステップ1: ビヘイビアを編集

1. CloudFrontコンソールで、対象のディストリビューション（`E2O1UP219WO08E`）を選択
2. 「**ビヘイビア**」タブを開く
3. デフォルトのビヘイビア（`*`）を選択
4. 「**編集**」をクリック

### ステップ2: レスポンスヘッダーポリシーを選択

1. 「**レスポンスヘッダーポリシー**」セクションまでスクロール
2. 「**レスポンスヘッダーポリシー**」ドロップダウンから、作成した`LineAppVideoCORS`を選択

### ステップ3: 変更を保存

1. 「**変更を保存**」をクリック
2. **重要**: 変更を反映するには、ディストリビューションのデプロイが必要です（5-15分かかります）

## 🗑️ キャッシュの無効化

設定変更後、CloudFrontのキャッシュを無効化します。

1. CloudFrontコンソールで、対象のディストリビューションを選択
2. 「**無効化**」タブを開く
3. 「**無効化を作成**」をクリック
4. **オブジェクトパス**に`/*`を入力
5. 「**無効化を作成**」をクリック
6. 無効化が完了するまで待機（通常5-15分）

## ✅ 動作確認

### 1. ブラウザで直接アクセス

PCのブラウザで動画URLに直接アクセス：

```
https://d33hx1uob3y8.cloudfront.net/videos/common/1767110912427_20251230_2312_01kdps1skefhbtnbxzdzx2ggjm.mp4
```

### 2. 開発者ツールで確認

1. 開発者ツール（F12）を開く
2. **Network**タブで動画ファイルのリクエストを選択
3. **Headers**タブでレスポンスヘッダーを確認

**確認すべきヘッダー**:
- ✅ `Access-Control-Allow-Origin: line://` または `*`
- ✅ `Access-Control-Allow-Methods: GET, HEAD, OPTIONS`
- ✅ `Content-Type: video/mp4`

### 3. LINEアプリで確認

LINEアプリ内で動画が再生できることを確認します。

## 🔧 トラブルシューティング

### まだ動画が再生されない場合

1. **CloudFrontのデプロイが完了しているか確認**
   - ディストリビューションのステータスが「Deployed」になっているか確認
   - デプロイには5-15分かかります

2. **キャッシュの無効化が完了しているか確認**
   - 無効化のステータスが「完了」になっているか確認

3. **レスポンスヘッダーポリシーが正しく適用されているか確認**
   - ビヘイビアの設定で、作成したポリシーが選択されているか確認

4. **ブラウザのキャッシュをクリア**
   - ブラウザのキャッシュをクリアして再試行
   - シークレットモードで試行

## 📚 参考

- [CloudFrontレスポンスヘッダーポリシー](https://docs.aws.amazon.com/cloudfront/latest/DeveloperGuide/response-headers-policies.html)
- [CORS設定](https://docs.aws.amazon.com/cloudfront/latest/DeveloperGuide/header-caching.html)




