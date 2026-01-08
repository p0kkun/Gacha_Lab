# AWS S3 動画アップロード設定手順

このドキュメントでは、ガチャ動画を S3 に保存し、管理画面からアップロードできるようにするための AWS 設定手順を説明します。

## 📋 前提条件

- AWS アカウントを持っていること
- AWS コンソールにログインできること

## 📌 バケット構成について

**推奨**: 動画と画像は**同じバケット内でディレクトリを分けて**保存します。

- ✅ 管理が簡単（1 つのバケットで一元管理）
- ✅ CloudFront 設定が 1 つで済む
- ✅ コスト効率が良い
- ✅ 既に実装済み（`videos/` と `images/` で自動的に分離）

詳細は [`S3バケット構成の比較.md`](./S3バケット構成の比較.md) を参照してください。

**環境別バケット設定**: 開発環境と本番環境で異なるバケット名を使用する場合は、[`S3環境別バケット設定.md`](./S3環境別バケット設定.md) を参照してください。

---

## ステップ 1: S3 バケットの作成

### 1-1. AWS コンソールにログイン

1. [AWS マネジメントコンソール](https://console.aws.amazon.com/)にアクセス
2. アカウントにログイン

### 1-2. S3 サービスを開く

1. 検索バーで「S3」と検索
2. 「S3」サービスを選択

### 1-3. バケットを作成

1. 「バケットを作成」ボタンをクリック
2. 以下の設定を行います：

   **基本設定**

   - **バケット名**: 一意の名前を入力
     - **開発環境**: `gacha-lab-test` または `gacha-lab-dev`
     - **本番環境**: `gacha-lab-prod` または `gacha-lab-production`
     - 注意: バケット名は全世界で一意である必要があります
     - 注意: 開発環境と本番環境で異なるバケット名を使用することを推奨します
   - **AWS リージョン**: `アジアパシフィック（東京）ap-northeast-1` を選択

   **オブジェクト所有権**

   - 「ACL は無効（推奨）」を選択

   **パブリックアクセス設定**

   - 「すべてのパブリックアクセスをブロック」を**チェック**（デフォルト）
     - 注意: CloudFront 経由でアクセスするため、パブリックアクセスは不要です

   **バケットのバージョニング**

   - 「バージョニングを有効にする」は**オフ**（デフォルト）

   **デフォルトの暗号化**

   - 「暗号化タイプ」: 「Amazon S3 マネージドキー（SSE-S3）」を選択（デフォルト）

   **高度な設定**

   - デフォルトのままで OK

3. 「バケットを作成」ボタンをクリック

### 1-4. バケットポリシーを設定（CloudFront 用）

1. 作成したバケットを選択
2. 「アクセス許可」タブを開く
3. 「バケットポリシー」セクションで「編集」をクリック
4. 以下のポリシーを貼り付け（`YOUR_BUCKET_NAME`を実際のバケット名に置き換え）：

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

**注意**: CloudFront を後で設定する場合は、このステップは後回しにしても OK です。

---

## ステップ 2: IAM ユーザーの作成とアクセスキーの取得

### 2-1. IAM サービスを開く

1. 検索バーで「IAM」と検索
2. 「IAM」サービスを選択

### 2-2. ユーザーを作成

1. 左メニューから「ユーザー」を選択
2. 「ユーザーを作成」ボタンをクリック

### 2-3. ユーザー名を設定

1. **ユーザー名**: `gacha-lab-s3-uploader` など、わかりやすい名前を入力
2. 「次へ」をクリック

### 2-4. アクセス権限を設定

1. 「ポリシーを直接アタッチ」タブを選択
2. 以下のポリシーを検索して選択：
   - `AmazonS3FullAccess` または
   - より制限的なカスタムポリシー（推奨）

**カスタムポリシー（推奨）の作成方法**:

1. 「ポリシーを作成」をクリック
2. 「JSON」タブを選択
3. 以下のポリシーを貼り付け（`YOUR_BUCKET_NAME`を実際のバケット名に置き換え）：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::YOUR_BUCKET_NAME",
        "arn:aws:s3:::YOUR_BUCKET_NAME/*"
      ]
    }
  ]
}
```

4. 「次へ」をクリック
5. ポリシー名を入力（例: `GachaLabS3UploadPolicy`）
6. 「ポリシーを作成」をクリック
7. ユーザー作成画面に戻り、作成したポリシーを選択

8. 「次へ」をクリック

### 2-5. ユーザーを作成

1. 確認画面で「ユーザーを作成」をクリック

### 2-6. アクセスキーを取得

1. 作成したユーザーを選択
2. 「セキュリティ認証情報」タブを開く
3. 「アクセスキー」セクションで「アクセスキーを作成」をクリック
4. **使用例**: 「アプリケーションコードを実行する」を選択
5. 「次へ」をクリック
6. 「説明タグの追加（オプション）」はスキップして「アクセスキーを作成」をクリック
7. **重要**: 以下の情報をコピーして安全な場所に保存：
   - **アクセスキー ID**
   - **シークレットアクセスキー**
     - 注意: シークレットアクセスキーはこの画面でしか表示されません

---

## ステップ 3: CloudFront ディストリビューションの作成（オプション、推奨）

CloudFront を使用すると、動画の配信速度が向上し、コストも削減できます。

**詳細な手順**: より詳細な手順は [`AWS_CloudFront構築手順.md`](./AWS_CloudFront構築手順.md) を参照してください。

### 3-1. CloudFront サービスを開く

1. 検索バーで「CloudFront」と検索
2. 「CloudFront」サービスを選択

### 3-2. ディストリビューションを作成

1. 「ディストリビューションを作成」ボタンをクリック

### 3-3. オリジンの設定

1. **オリジンドメイン**: 作成した S3 バケットを選択
   - 例: `gacha-lab-test.s3.ap-northeast-1.amazonaws.com`
2. **名前**: 自動入力されます
3. **オリジンアクセス**: 「Origin access control 設定（推奨）」を選択
4. 「Origin access control を作成」をクリック
   - **名前**: `gacha-lab-s3-oac` など
   - **説明**: 任意
   - **署名動作**: 「署名リクエストのみ（推奨）」を選択
   - 「作成」をクリック
5. 作成した Origin access control を選択

### 3-4. デフォルトのキャッシュビヘイビアの設定

1. **ビューアープロトコルポリシー**: 「HTTPS のみ」を選択
2. **許可された HTTP メソッド**: 「GET、HEAD、OPTIONS」を選択
3. **キャッシュキーとオリジンリクエスト**: 「CachingOptimized」を選択
4. **オブジェクトのキャッシュ**: 「キャッシュを無効にする」は**オフ**（チェックを外す）

### 3-5. 設定名とディストリビューションの作成

1. **設定名**: 任意（例: `Gacha Lab Videos`）
2. 「ディストリビューションを作成」をクリック
3. **注意**: ディストリビューションの作成には 5-15 分かかります
4. ステータスが「Deployed」になるまで待機

### 3-6. ドメイン名を確認

1. ディストリビューションの一覧で、作成したディストリビューションを選択
2. **一般**タブで**ドメイン名**をコピー（例: `d1234567890abc.cloudfront.net`）
   - これが `AWS_CLOUDFRONT_DOMAIN` の値になります

### 3-7. S3 バケットポリシーを更新

1. **Origin access control の ARN を確認**

   - CloudFront コンソール → ディストリビューション → オリジンタブ
   - Origin access control の ARN をコピー

2. **ディストリビューション ID を確認**

   - CloudFront コンソール → ディストリビューション → 一般タブ
   - ディストリビューション ID をコピー

3. **AWS アカウント ID を確認**

   - AWS コンソール右上のアカウント名をクリック
   - アカウント ID をコピー

4. **S3 バケットポリシーを更新**
   - S3 コンソール → バケット → アクセス許可タブ → バケットポリシーを編集
   - 以下のポリシーを貼り付け（`YOUR_BUCKET_NAME`、`YOUR_ACCOUNT_ID`、`YOUR_DISTRIBUTION_ID`を実際の値に置き換え）：

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

詳細な手順は [`AWS_CloudFront構築手順.md`](./AWS_CloudFront構築手順.md) の「ステップ 7」を参照してください。

---

## ステップ 4: 環境変数の設定

### 4-1. 環境別のバケット名について

**重要**: 開発環境と本番環境で異なるバケット名を使用することを推奨します。

- **開発環境**: `gacha-lab-test` または `gacha-lab-dev`
- **本番環境**: `gacha-lab-prod` または `gacha-lab-production`

環境変数でバケット名を切り替えることで、開発と本番を分離できます。

詳細は [`S3環境別バケット設定.md`](./S3環境別バケット設定.md) を参照してください。

### 4-2. `.env.local`ファイルを開く（ローカル開発用）

プロジェクトのルートディレクトリ（`Gacha_Lab/app/`）にある`.env.local`ファイルを開きます。

### 4-3. 環境変数を追加（ローカル開発用）

以下の環境変数を追加または更新します：

```env
# AWS S3設定（開発環境用）
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=AKIAxxxxxxxxxxxxxxxx  # ステップ2-6で取得したアクセスキーID（マスク済み）
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  # ステップ2-6で取得したシークレットアクセスキー（マスク済み）
AWS_S3_BUCKET_NAME=gacha-lab-test  # 開発環境のバケット名（ステップ1-3で作成したバケット名）
AWS_CLOUDFRONT_DOMAIN=d1234567890abc.cloudfront.net  # ステップ3-6で取得したCloudFrontドメイン（オプション）
```

**注意**:

- `AWS_ACCESS_KEY_ID`と`AWS_SECRET_ACCESS_KEY`は実際の値に置き換えてください
- `AWS_S3_BUCKET_NAME`は開発環境で作成したバケット名（例: `gacha-lab-test`）に置き換えてください
- `AWS_CLOUDFRONT_DOMAIN`は CloudFront を使用する場合のみ設定してください
  - CloudFront を使用しない場合は、この行を削除またはコメントアウトしてください

### 4-4. 本番環境用の環境変数設定

本番環境では、以下のいずれかの方法で環境変数を設定します：

#### 方法 1: AWS Amplify の環境変数設定（推奨）

1. AWS Amplify Console にアクセス
2. アプリを選択 → 「Environment variables」を開く
3. 以下の環境変数を追加：

```env
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=[本番環境用のアクセスキーID]
AWS_SECRET_ACCESS_KEY=[本番環境用のシークレットアクセスキー]
AWS_S3_BUCKET_NAME=gacha-lab-prod  # 本番環境のバケット名
AWS_CLOUDFRONT_DOMAIN=[本番環境のCloudFrontドメイン]  # オプション
```

#### 方法 2: `.env.production.local`ファイル（ローカルからビルドする場合）

プロジェクトのルートディレクトリに`.env.production.local`ファイルを作成：

```env
# AWS S3設定（本番環境用）
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=[本番環境用のアクセスキーID]
AWS_SECRET_ACCESS_KEY=[本番環境用のシークレットアクセスキー]
AWS_S3_BUCKET_NAME=gacha-lab-prod  # 本番環境のバケット名
AWS_CLOUDFRONT_DOMAIN=[本番環境のCloudFrontドメイン]  # オプション
```

**重要**: `.env.production.local`は`.gitignore`に含まれていることを確認してください。

### 4-5. ファイルを保存

`.env.local`ファイル（または`.env.production.local`ファイル）を保存します。

---

## ステップ 5: 動作確認

### 5-1. 開発サーバーを再起動

環境変数を変更した場合は、開発サーバーを再起動してください：

```bash
# 現在のサーバーを停止（Ctrl+C）
# 再度起動
npm run dev
```

### 5-2. 管理画面で動画をアップロード

1. 管理画面にログイン（`/admin`）
2. 「動画管理」メニューを選択
3. 「+ 動画をアップロード」ボタンをクリック
4. 動画タイプを選択（共通動画 or 等級別動画）
5. 動画ファイルを選択
6. 「アップロード」ボタンをクリック
7. アップロードが成功することを確認

### 5-3. 管理画面でガチャタイプのアイコン画像をアップロード

1. 管理画面にログイン（`/admin`）
2. 「ガチャ設定」メニューを選択
3. 編集したいガチャタイプの「編集」ボタンをクリック
4. 「アイコン画像」セクションで画像ファイルを選択
5. 画像が自動的にアップロードされ、プレビューが表示されます
6. 「保存」ボタンをクリックしてガチャタイプの設定を保存
7. ガチャ画面でアイコン画像が表示されることを確認

### 5-4. S3 バケットを確認

1. AWS コンソールで S3 バケットを開く
2. `videos/`フォルダが作成されていることを確認
3. アップロードした動画ファイルが存在することを確認

**ディレクトリ構造**:

S3 バケット内のファイルは以下のような構造で保存されます：

```
バケット名/
├── videos/
│   ├── common/          # 共通動画
│   │   └── [タイムスタンプ]_[ファイル名].mp4
│   └── rarity/          # 等級別動画
│       ├── first-prize/
│       ├── second-prize/
│       ├── third-prize/
│       ├── fourth-prize/
│       └── fifth-prize/
└── images/              # 画像ファイル
    ├── gacha-types/     # ガチャタイプのアイコン画像
    │   └── [ガチャタイプID]/
    │       └── [タイムスタンプ]_[ファイル名].png
    ├── common/          # 共通画像（将来的に使用）
    └── rarity/          # 等級別画像（将来的に使用）
        └── ...
```

**注意**:

- このバケットは動画だけでなく、画像ファイルも保存します
- ガチャタイプのアイコン画像は `images/gacha-types/[ガチャタイプID]/` に保存されます
- 将来的に画像ファイルも保存する場合は、`images/common/` や `images/rarity/` 配下に同様の構造で保存されます

---

## 🔒 セキュリティのベストプラクティス

1. **アクセスキーの管理**

   - アクセスキーは`.env.local`にのみ保存し、Git にコミットしない
   - `.env.local`は`.gitignore`に含まれていることを確認
   - 定期的にアクセスキーをローテーションする

2. **IAM ポリシーの最小権限**

   - 必要最小限の権限のみを付与する
   - カスタムポリシーを使用することを推奨

3. **S3 バケットのアクセス制御**
   - パブリックアクセスはブロックする
   - CloudFront 経由でのみアクセス可能にする

---

## ❓ トラブルシューティング

### エラー: "Access Denied"

- IAM ユーザーに適切な権限が付与されているか確認
- バケット名が正しいか確認
- アクセスキーが正しいか確認

### エラー: "Bucket not found"

- バケット名が正しいか確認
- リージョンが正しいか確認（`ap-northeast-1`）

### エラー: "Invalid credentials"

- アクセスキー ID とシークレットアクセスキーが正しいか確認
- アクセスキーが有効か確認（IAM ユーザーのセキュリティ認証情報で確認）

### 動画が表示されない

- CloudFront を使用している場合、ディストリビューションのステータスが「Deployed」になっているか確認
- S3 バケットポリシーが正しく設定されているか確認
- 動画 URL が正しいか確認（管理画面の動画一覧で確認）

---

## 📚 参考リンク

- [AWS S3 ドキュメント](https://docs.aws.amazon.com/s3/)
- [AWS IAM ドキュメント](https://docs.aws.amazon.com/iam/)
- [AWS CloudFront ドキュメント](https://docs.aws.amazon.com/cloudfront/)

---

## ✅ チェックリスト

設定が完了したら、以下を確認してください：

- [ ] S3 バケットが作成されている
- [ ] IAM ユーザーが作成されている
- [ ] アクセスキー ID とシークレットアクセスキーを取得している
- [ ] CloudFront ディストリビューションが作成されている（オプション）
- [ ] `.env.local`に環境変数が設定されている
- [ ] 開発サーバーを再起動した
- [ ] 管理画面から動画をアップロードできる
- [ ] S3 バケットに動画ファイルが保存されている
