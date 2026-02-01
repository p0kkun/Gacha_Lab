# AWS CloudFront 構築手順（S3 用）

## 📋 概要

このドキュメントでは、S3 バケットの動画・画像を配信するための CloudFront ディストリビューションの構築手順を説明します。

**CloudFront とは**: AWS の CDN（Content Delivery Network）サービスです。世界中のエッジロケーションからコンテンツを高速配信できます。

---

## 🎯 CloudFront を使用するメリット

- ✅ **高速配信**: ユーザーに最も近いエッジロケーションから配信
- ✅ **コスト削減**: S3 から CloudFront への転送は無料（同一リージョン内）
- ✅ **スケーラビリティ**: 大量のリクエストに対応
- ✅ **セキュリティ**: HTTPS 配信、オリジンアクセス制御

---

## 📦 前提条件

- S3 バケットが作成されていること
- S3 バケットに動画・画像ファイルがアップロードされていること（任意）

---

## 🚀 構築手順

### ステップ 1: CloudFront サービスを開く

1. [AWS マネジメントコンソール](https://console.aws.amazon.com/)にアクセス
2. 検索バーで「CloudFront」と検索
3. 「CloudFront」サービスを選択

---

### ステップ 2: ディストリビューションを作成

1. 「ディストリビューションを作成」ボタンをクリック

---

### ステップ 2-1: Get started（基本設定）

#### Distribution options（ディストリビューションオプション）

1. **Distribution name（ディストリビューション名）**

   - **推奨値**: `gacha-lab-videos` または `gacha-lab-media`
   - **説明**: この名前はタグとして保存されます。後で変更や追加のタグを設定できます
   - **注意**: わかりやすい名前を付けると管理しやすくなります
   - **例**:
     - 開発環境: `gacha-lab-videos-dev`
     - 本番環境: `gacha-lab-videos-prod`

2. **Description - optional（説明 - オプション）**

   - **推奨値**: `Gacha Lab 動画・画像配信用CloudFront` など
   - **説明**: 任意の説明文を入力できます
   - **注意**: 複数のディストリビューションがある場合、区別しやすくなります
   - **例**: `Gacha LabのS3バケット（動画・画像）を配信するためのCloudFrontディストリビューション`

3. **Distribution type（ディストリビューションタイプ）**
   - **推奨**: 「**Single website or app**」を選択
   - **理由**:
     - このプロジェクトでは 1 つの S3 バケット（動画・画像）を配信するため
     - シンプルな構成で十分
     - 各ウェブサイトやアプリケーションに固有の設定が必要な場合に適している
   - **Multi-tenant architecture**:
     - 複数のドメインで設定を共有する場合に使用
     - SaaS プロバイダー向けのアーキテクチャ
     - このプロジェクトでは使用しない

#### Domain（ドメイン）

1. **Route 53 managed domain - optional（Route 53 管理ドメイン - オプション）**
   - **推奨**: **空欄のまま**（スキップ）
   - **理由**:
     - カスタムドメインを使用しない場合、この設定は不要
     - CloudFront のデフォルトドメイン（`*.cloudfront.net`）を使用
     - 後でカスタムドメインを設定することも可能
   - **カスタムドメインを使用する場合**:
     - Route 53 で登録済みのドメインを入力（例: `videos.gacha-lab.com`）
     - 「Check domain」ボタンをクリックしてドメインを確認
     - CloudFront が自動的に TLS 証明書をプロビジョニング
   - **注意**:
     - 他の DNS プロバイダー（例: お名前.com、ムームードメイン）のドメインを使用する場合は、このステップをスキップして後で設定
     - カスタムドメインの設定は「ステップ 4: Get TLS certificate」で行います

#### Tags - optional（タグ - オプション）

1. **Key（キー）**

   - **推奨**: `Name` または `Project`
   - **説明**: タグのキーを入力
   - **例**: `Name`

2. **Value - optional（値 - オプション）**

   - **推奨**: `Gacha Lab` または `GachaLab-Videos`
   - **説明**: タグの値を入力
   - **例**: `Gacha Lab Videos`

3. **Add new tag（新しいタグを追加）**

   - 必要に応じて追加のタグを設定
   - 最大 49 個のタグを追加可能
   - **推奨タグ例**:
     - `Environment`: `dev` または `prod`
     - `Purpose`: `video-distribution`
     - `ManagedBy`: `manual` または `terraform`
     - `CostCenter`: `gacha-lab`

4. **「Next」ボタンをクリック**
   - 次のステップ（オリジンの設定）に進みます

---

### ステップ 3: オリジンの設定（Specify origin）

#### 3-1. Origin type（オリジンタイプ）

1. **Origin type**: 「**Amazon S3**」を選択
   - 静的アセット（ファイル、画像）を配信する場合に使用
   - 選択すると、S3 用の推奨設定が自動的に適用されます

#### 3-2. Origin（オリジン）

1. **S3 origin（S3 オリジン）**:

   - **方法 1**: 「Browse S3」ボタンをクリックして、S3 バケットを選択
   - **方法 2**: 手動で入力
     - 例: `gacha-lab-test.s3.ap-northeast-1.amazonaws.com`
     - 形式: `[バケット名].s3.[リージョン].amazonaws.com`
   - **注意**: バケット名が表示されない場合は、手動で入力してください

2. **Origin path - optional（オリジンパス - オプション）**:
   - **重要**: **空欄のまま**にしてください
   - 現在 `/path` などが入力されている場合は、**削除して空欄にしてください**
   - 理由: バケット全体を対象とするため（`videos/` や `images/` などの特定ディレクトリのみを配信する場合は、ここにパスを指定可能）

#### 3-3. Settings（設定）

1. **Allow private S3 bucket access to CloudFront（プライベート S3 バケットへの CloudFront アクセスを許可）**:

   - **推奨**: **チェックを入れる**（推奨）
   - **説明**: CloudFront が自動的に S3 バケットポリシーを更新し、CloudFront 経由でのみアクセスできるようにします
   - **注意**: このチェックを入れると、Origin access control（OAC）が自動的に作成・設定されます

2. **オリジン設定（Origin settings）**:

   - **推奨**: 「**Use recommended origin settings（推奨オリジン設定を使用）**」を選択
   - カスタマイズが必要な場合のみ「Customize origin settings」を選択

3. **Cache settings（キャッシュ設定）**:
   - **推奨**: 「**Use recommended cache settings tailored to serving S3 content（S3 コンテンツ配信用に調整された推奨キャッシュ設定を使用）**」を選択
   - カスタマイズが必要な場合のみ「Customize cache settings」を選択

#### 3-4. 設定の確認

- ✅ Origin type: `Amazon S3`
- ✅ S3 origin: `gacha-lab-test.s3.ap-northeast-1.amazonaws.com`（あなたのバケット名）
- ✅ Origin path: **空欄**
- ✅ Allow private S3 bucket access: **チェック済み**
- ✅ Origin settings: **Use recommended**
- ✅ Cache settings: **Use recommended**

#### 3-5. 次のステップ

「**Next**」ボタンをクリックして、次のステップ「Enable security（セキュリティの有効化）」に進みます

---

### ステップ 4: デフォルトのキャッシュビヘイビアの設定

#### 4-1. パスパターン

- **パスパターン**: `*`（すべてのパス、デフォルト）

#### 4-2. オリジンとオリジングループ

- **オリジンとオリジングループ**: ステップ 3 で設定したオリジンが選択されていることを確認

#### 4-3. ビューアープロトコルポリシー

- **ビューアープロトコルポリシー**: 「HTTPS のみ」を選択
  - セキュリティのため、HTTPS のみを許可

#### 4-4. 許可された HTTP メソッド

- **許可された HTTP メソッド**: 「GET、HEAD、OPTIONS」を選択
  - 動画・画像の配信には GET のみで十分

#### 4-5. キャッシュキーとオリジンリクエスト

- **キャッシュキーとオリジンリクエスト**: 「CachingOptimized」を選択
  - 動画・画像ファイルに最適化されたキャッシュポリシー

#### 4-6. キャッシュポリシー

- **キャッシュポリシー**: 「CachingOptimized」が選択されていることを確認

#### 4-7. オリジンリクエストポリシー

- **オリジンリクエストポリシー**: 「CORS-S3Origin」を選択（CORS が必要な場合）
  - または「なし（オリジンにすべてのビューアーリクエストを転送）」を選択

#### 4-8. レスポンスヘッダーポリシー

- **レスポンスヘッダーポリシー**: 「シンプルな CORS」を選択（CORS が必要な場合）
  - または「なし」を選択

#### 4-9. オブジェクトのキャッシュ

- **オブジェクトのキャッシュ**: 「キャッシュを無効にする」は**オフ**（チェックを外す）
  - 動画・画像は変更頻度が低いため、キャッシュを有効にする

#### 4-10. 圧縮オブジェクト

- **圧縮オブジェクト**: 「自動圧縮」を選択（オプション）
  - テキストファイルの圧縮に有効（動画・画像には影響なし）

---

### ステップ 5: 設定名とディストリビューションの作成

#### 5-1. 設定名

- **設定名**: 任意（例: `Gacha Lab Videos`）

#### 5-2. コメント

- **コメント**: 任意（例: "Gacha Lab の動画・画像配信用 CloudFront"）

#### 5-3. 価格クラス

- **価格クラス**: 「すべての CloudFront の場所を使用」を選択（デフォルト）
  - または、コスト削減のため「北米とヨーロッパのみ」などを選択

#### 5-4. 代替ドメイン名（CNAME）

- **代替ドメイン名（CNAME）**: 空欄のまま（カスタムドメインを使用しない場合）
  - カスタムドメインを使用する場合は、後で設定可能

#### 5-5. カスタム SSL 証明書

- **カスタム SSL 証明書**: デフォルトの CloudFront 証明書を使用（カスタムドメインを使用しない場合）

#### 5-6. 標準ログ記録

- **標準ログ記録**: オフ（デフォルト）
  - ログが必要な場合は、後で有効化可能

#### 5-7. ディストリビューションの作成

1. 「ディストリビューションを作成」ボタンをクリック
2. **注意**: ディストリビューションの作成には**5-15 分**かかります
3. ステータスが「Deployed」になるまで待機

---

### ステップ 6: ドメイン名の確認

1. ディストリビューションの一覧で、作成したディストリビューションを選択
2. **一般**タブで**ドメイン名**を確認
   - 例: `d1234567890abc.cloudfront.net`
3. **ドメイン名をコピー**して保存
   - これが `AWS_CLOUDFRONT_DOMAIN` の値になります

---

### ステップ 7: S3 バケットポリシーの更新

CloudFront から S3 バケットにアクセスできるように、S3 バケットポリシーを更新します。

#### 7-1. Origin access control の ARN を確認

1. CloudFront コンソールで、作成したディストリビューションを選択
2. **オリジン**タブを開く
3. オリジンを選択
4. **Origin access control**の ARN をコピー
   - 例: `arn:aws:cloudfront::123456789012:origin-access-control/e1234567890abc`

#### 7-2. ディストリビューション ID を確認

1. CloudFront コンソールで、作成したディストリビューションを選択
2. **一般**タブで**ディストリビューション ID**を確認
   - 例: `E1234567890ABC`

#### 7-3. AWS アカウント ID を確認

1. AWS コンソールの右上のアカウント名をクリック
2. **アカウント ID**をコピー
   - 例: `123456789012`

#### 7-4. S3 バケットポリシーを更新

1. **S3 コンソール**に移動
2. 作成した S3 バケットを選択
3. **アクセス許可**タブを開く
4. **バケットポリシー**セクションで「編集」をクリック
5. 以下のポリシーを貼り付け（`YOUR_BUCKET_NAME`、`YOUR_ACCOUNT_ID`、`YOUR_DISTRIBUTION_ID`、`YOUR_OAC_ARN`を実際の値に置き換え）：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipal",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::YOUR_ACCOUNT_ID:distribution/YOUR_DISTRIBUTION_ID"
        }
      }
    }
  ]
}
```

**置き換え例**:

- `YOUR_BUCKET_NAME`: `gacha-lab-test`
- `YOUR_ACCOUNT_ID`: `123456789012`
- `YOUR_DISTRIBUTION_ID`: `E1234567890ABC`

**完成例**:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipal",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::gacha-lab-test/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::123456789012:distribution/E1234567890ABC"
        }
      }
    }
  ]
}
```

6. 「変更を保存」をクリック

---

### ステップ 8: 環境変数の設定

`.env.local`ファイル（または AWS Amplify の環境変数）に以下を追加：

```env
AWS_CLOUDFRONT_DOMAIN=d1234567890abc.cloudfront.net
```

**注意**: `d1234567890abc.cloudfront.net` の部分を、ステップ 6 でコピーした実際のドメイン名に置き換えてください。

---

## ✅ 動作確認

### 1. ファイルにアクセス

アップロードしたファイルが CloudFront 経由でアクセスできることを確認：

```
https://d1234567890abc.cloudfront.net/videos/common/[ファイル名].mp4
```

### 2. ブラウザの開発者ツールで確認

1. ブラウザの開発者ツール（F12）を開く
2. **Network**タブを開く
3. ファイルにアクセス
4. レスポンスヘッダーに `X-Cache: Hit from cloudfront` または `X-Cache: Miss from cloudfront` が含まれていることを確認

### 3. CloudFront コンソールで確認

1. CloudFront コンソールでディストリビューションを選択
2. **メトリクス**タブでリクエスト数やデータ転送量を確認

---

## 🔧 トラブルシューティング

### エラー: "Access Denied"

**原因**: S3 バケットポリシーが正しく設定されていない

**解決方法**:

- S3 バケットポリシーを確認
- CloudFront のディストリビューション ID とアカウント ID が正しいか確認
- Origin access control が正しく設定されているか確認

### エラー: "403 Forbidden"

**原因**: CloudFront から S3 へのアクセスが拒否されている

**解決方法**:

- S3 バケットポリシーを確認
- Origin access control の設定を確認

### ファイルが表示されない

**原因**: ディストリビューションがまだデプロイされていない

**解決方法**:

- CloudFront コンソールでステータスが「Deployed」になっているか確認
- デプロイには 5-15 分かかります

### キャッシュが更新されない

**原因**: キャッシュが残っている

**解決方法**:

- CloudFront コンソールで「無効化を作成」を実行
- または、ファイル名を変更して新しいファイルとしてアップロード

---

## 📊 CloudFront の設定確認項目

- [ ] ディストリビューションが作成されている
- [ ] ステータスが「Deployed」になっている
- [ ] ドメイン名をコピーして保存した
- [ ] S3 バケットポリシーが更新されている
- [ ] 環境変数に `AWS_CLOUDFRONT_DOMAIN` が設定されている
- [ ] ファイルにアクセスできることを確認した

---

## 📚 参考リンク

- [AWS CloudFront ドキュメント](https://docs.aws.amazon.com/cloudfront/)
- [CloudFront と S3 の統合](https://docs.aws.amazon.com/cloudfront/latest/DeveloperGuide/DownloadDistS3AndCustomOrigin.html)
- [Origin Access Control](https://docs.aws.amazon.com/cloudfront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html)

---

## 💡 補足: キャッシュの無効化

動画・画像ファイルを更新した場合、CloudFront のキャッシュを無効化する必要があります。

### 方法 1: CloudFront コンソールから無効化

1. CloudFront コンソールでディストリビューションを選択
2. **無効化**タブを開く
3. 「無効化を作成」をクリック
4. **オブジェクトパス**に無効化したいパスを入力
   - 例: `/videos/common/*`（すべての共通動画を無効化）
   - 例: `/videos/common/1234567890_test.mp4`（特定のファイルを無効化）
5. 「無効化を作成」をクリック

### 方法 2: ファイル名を変更（推奨）

ファイルを更新する場合は、新しいファイル名を使用することで、キャッシュの問題を回避できます。

- タイムスタンプを含める: `1234567890_video.mp4`
- バージョン番号を含める: `video_v2.mp4`

現在の実装では、ファイル名にタイムスタンプが含まれているため、自動的に新しいファイルとして扱われます。
