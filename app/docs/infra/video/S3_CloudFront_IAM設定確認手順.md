# S3・CloudFront・IAM設定確認手順

このドキュメントでは、動画アップロード機能が正常に動作するために必要なAWS設定を順に確認していきます。

## 📋 確認項目

1. [S3バケットのポリシー確認](#1-s3バケットのポリシー確認)
2. [CloudFrontのオリジン設定確認](#2-cloudfrontのオリジン設定確認)
3. [IAMユーザーの権限確認](#3-iamユーザーの権限確認)

---

## 1. S3バケットのポリシー確認

### 1-1. S3バケットにアクセス

1. [AWS マネジメントコンソール](https://console.aws.amazon.com/)にログイン
2. 検索バーで「S3」と検索
3. 「S3」サービスを選択
4. バケット一覧から **`gacha-lab-test`** をクリック

### 1-2. バケットポリシーを確認

1. バケットの詳細ページで「アクセス許可」タブをクリック
2. 「バケットポリシー」セクションを確認

### 1-3. 正しいポリシーの確認

以下のポリシーが設定されていることを確認してください：

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
          "AWS:SourceArn": "arn:aws:cloudfront::YOUR_ACCOUNT_ID:distribution/YOUR_DISTRIBUTION_ID"
        }
      }
    },
    {
      "Sid": "AllowIAMUserAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::YOUR_ACCOUNT_ID:user/YOUR_IAM_USER_NAME"
      },
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::gacha-lab-test",
        "arn:aws:s3:::gacha-lab-test/*"
      ]
    }
  ]
}
```

### 1-4. 確認ポイント

- ✅ CloudFrontサービスプリンシパルが`GetObject`権限を持っている
- ✅ IAMユーザーが`PutObject`、`GetObject`、`DeleteObject`、`ListBucket`権限を持っている
- ✅ `YOUR_ACCOUNT_ID`、`YOUR_DISTRIBUTION_ID`、`YOUR_IAM_USER_NAME`が正しい値に置き換えられている

### 1-5. ポリシーが設定されていない場合

1. 「バケットポリシー」セクションで「編集」をクリック
2. 上記のポリシーをコピー＆ペースト
3. 以下の値を置き換え：
   - `YOUR_ACCOUNT_ID`: AWSアカウントID（右上のアカウント名をクリックして確認）
   - `YOUR_DISTRIBUTION_ID`: CloudFrontディストリビューションID（次のセクションで確認）
   - `YOUR_IAM_USER_NAME`: IAMユーザー名（3番目のセクションで確認）
4. 「変更を保存」をクリック

---

## 2. CloudFrontのオリジン設定確認

### 2-1. CloudFrontディストリビューションにアクセス

1. AWS マネジメントコンソールで「CloudFront」を検索
2. 「CloudFront」サービスを選択
3. ディストリビューション一覧から、ドメイン名が **`d33hx1uob3y8zt.cloudfront.net`** のものを探す
4. ディストリビューションIDをメモ（例: `E1234567890ABC`）

### 2-2. オリジン設定を確認

1. ディストリビューションを選択
2. 「オリジン」タブをクリック
3. オリジン一覧からS3バケットのオリジンを選択
4. 「編集」をクリック

### 2-3. 確認すべき設定項目

#### オリジンドメイン名
- ✅ `gacha-lab-test.s3.ap-northeast-1.amazonaws.com` または `gacha-lab-test.s3.amazonaws.com`

#### オリジンアクセス
- ✅ 「Origin access control settings (recommended)」が選択されている
- ✅ または「Origin access identity (legacy)」が選択されている

#### Origin access control (OAC) の設定
- ✅ OACが作成されている
- ✅ OACの名前をメモ（例: `gacha-lab-oac`）

### 2-4. キャッシュビヘイビアの確認

1. 「ビヘイビア」タブをクリック
2. デフォルトのビヘイビア（`*`）を選択
3. 「編集」をクリック

#### 確認すべき設定

- **パスパターン**: `*`（すべてのパス）
- **オリジンとオリジングループ**: S3バケットのオリジンが選択されている
- **ビューアープロトコルポリシー**: `Redirect HTTP to HTTPS` または `HTTPS only`
- **キャッシュキーとオリジンリクエスト**: デフォルト設定で問題なし

### 2-5. オリジンアクセス制御（OAC）の作成（未設定の場合）

1. CloudFrontコンソールで「Origin access」を選択
2. 「Create control setting」をクリック
3. 以下の設定を行う：
   - **Name**: `gacha-lab-oac`
   - **Signing behavior**: `Sign requests (recommended)`
   - **Origin type**: `S3`
4. 「Create」をクリック
5. 作成したOACをS3バケットのオリジンに適用

### 2-6. S3バケットポリシーの更新（OAC使用時）

OACを使用している場合、S3バケットポリシーに以下のステートメントを追加：

```json
{
  "Sid": "AllowCloudFrontOAC",
  "Effect": "Allow",
  "Principal": {
    "Service": "cloudfront.amazonaws.com"
  },
  "Action": "s3:GetObject",
  "Resource": "arn:aws:s3:::gacha-lab-test/*",
  "Condition": {
    "StringEquals": {
      "AWS:SourceArn": "arn:aws:cloudfront::YOUR_ACCOUNT_ID:distribution/YOUR_DISTRIBUTION_ID"
    }
  }
}
```

---

## 3. IAMユーザーの権限確認

### 3-1. IAMユーザーにアクセス

1. AWS マネジメントコンソールで「IAM」を検索
2. 「IAM」サービスを選択
3. 左メニューから「ユーザー」をクリック
4. アクセスキーID **`AKIAxxxxxxxxxxxxxxxx`** に対応するユーザーを探す

### 3-2. ユーザー名の確認

1. ユーザー一覧から該当ユーザーをクリック
2. ユーザー名をメモ（例: `gacha-lab-s3-user`）

### 3-3. 権限ポリシーの確認

1. 「アクセス権限」タブをクリック
2. アタッチされているポリシーを確認

### 3-4. 必要な権限

以下の権限が付与されている必要があります：

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
        "arn:aws:s3:::gacha-lab-test",
        "arn:aws:s3:::gacha-lab-test/*"
      ]
    }
  ]
}
```

### 3-5. カスタムポリシーの作成（必要な場合）

1. IAMコンソールで「ポリシー」をクリック
2. 「ポリシーを作成」をクリック
3. 「JSON」タブを選択
4. 上記のポリシーをコピー＆ペースト
5. バケット名を確認（`gacha-lab-test`）
6. 「次のステップ: タグ」をクリック
7. ポリシー名を入力（例: `GachaLabS3AccessPolicy`）
8. 「ポリシーを作成」をクリック

### 3-6. ポリシーをユーザーにアタッチ

1. ユーザーページに戻る
2. 「アクセス権限」タブで「アクセス権限の追加」をクリック
3. 「ポリシーを直接アタッチ」を選択
4. 作成したポリシー（`GachaLabS3AccessPolicy`）を検索して選択
5. 「次のステップ: 確認」をクリック
6. 「アクセス権限の追加」をクリック

### 3-7. アクセスキーの確認

1. 「セキュリティ認証情報」タブをクリック
2. 「アクセスキー」セクションで以下を確認：
   - ✅ アクセスキーID: `AKIAxxxxxxxxxxxxxxxx`
   - ✅ ステータス: `アクティブ`

---

## 🔍 動作確認

### テスト手順

1. **管理画面にアクセス**
   - URL: `https://dev.d2zlbom9902v0u.amplifyapp.com/admin`
   - ログイン

2. **動画管理ページを開く**
   - 左メニューから「動画管理」をクリック

3. **動画をアップロード**
   - 「動画をアップロード」ボタンをクリック
   - 動画ファイルを選択（MP4形式、100MB以下）
   - 動画タイプを選択（COMMON または RARITY）
   - アップロードを実行

4. **エラーの確認**
   - ブラウザの開発者ツール（F12）を開く
   - 「Console」タブでエラーを確認
   - 「Network」タブでAPIリクエストのステータスを確認

### よくあるエラーと対処法

#### エラー: `Access Denied`
- **原因**: IAMユーザーの権限不足、またはS3バケットポリシーの設定ミス
- **対処**: 上記の手順で権限を確認・修正

#### エラー: `The bucket you are attempting to access must be addressed using the specified endpoint`
- **原因**: リージョン設定の不一致
- **対処**: `S3_REGION`環境変数が`ap-northeast-1`に設定されているか確認

#### エラー: `InvalidAccessKeyId`
- **原因**: アクセスキーIDが間違っている、または無効
- **対処**: IAMユーザーのアクセスキーを確認

#### エラー: `SignatureDoesNotMatch`
- **原因**: シークレットアクセスキーが間違っている
- **対処**: `S3_SECRET_ACCESS_KEY`環境変数を確認

---

## 📝 チェックリスト

確認が完了したら、以下にチェックを入れましょう：

- [ ] S3バケットポリシーが正しく設定されている
- [ ] CloudFrontのオリジン設定が正しい
- [ ] CloudFrontのOAC/OAIが設定されている
- [ ] IAMユーザーに必要な権限が付与されている
- [ ] アクセスキーがアクティブである
- [ ] 環境変数が正しく設定されている
- [ ] 動画アップロードが正常に動作する

---

## 🔗 関連ドキュメント

- [AWS S3動画アップロード設定手順](./AWS_S3動画アップロード設定手順.md)
- [AWS CloudFront構築手順](./AWS_CloudFront構築手順.md)
- [環境変数チェックリスト](./環境変数チェックリスト.md)




