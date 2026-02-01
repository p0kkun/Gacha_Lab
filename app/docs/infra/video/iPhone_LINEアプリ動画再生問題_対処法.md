# iPhone LINEアプリでの動画再生問題 対処法

## 🔴 問題の状況

- PCのブラウザでは動画が再生される
- iPhoneのLINEアプリ内では動画が再生されない
- 開発者ツールが使用できない

## 🎯 考えられる原因

1. **LINEアプリ内ブラウザの制限**: iPhoneのLINEアプリ内ブラウザは特殊な動作をする
2. **動画ファイルの形式**: iPhoneでサポートされていないコーデックや形式
3. **Content-Typeヘッダー**: 動画ファイルのContent-Typeが正しく設定されていない
4. **Rangeリクエスト**: ストリーミング再生に必要なRangeリクエストが正しく処理されていない
5. **CORSヘッダー**: LINEアプリの特殊なオリジン（`line://`）が正しく処理されていない

## ✅ 対処法

### ステップ1: PCのブラウザでレスポンスヘッダーを確認

iPhoneでは開発者ツールが使えないため、PCのブラウザで確認します。

1. PCのブラウザで動画URLにアクセス:
   ```
   https://d33hx1uob3y8zt.cloudfront.net/videos/common/1767110912427_20251230_2312_01kdps1skefhbtnbxzdzx2ggjm.mp4
   ```

2. 開発者ツール（F12）を開く
3. **Network**タブで動画ファイルのリクエストを選択
4. **Headers**タブでレスポンスヘッダーを確認

**確認すべきヘッダー**:
- ✅ `Access-Control-Allow-Origin: *`
- ✅ `Access-Control-Allow-Methods: GET, HEAD, OPTIONS`
- ✅ `Content-Type: video/mp4`
- ✅ `Accept-Ranges: bytes`
- ✅ `Content-Length: [ファイルサイズ]`

### ステップ2: 動画ファイルの形式を確認

iPhoneのLINEアプリ内ブラウザで再生可能な動画形式を確認します。

**推奨形式**:
- **コンテナ**: MP4
- **ビデオコーデック**: H.264（AVC）
- **オーディオコーデック**: AAC
- **プロファイル**: Baseline Profile または Main Profile
- **レベル**: 3.1以下（推奨）
- **解像度**: 1080p以下
- **ビットレート**: 5Mbps以下

**確認方法**:
1. S3コンソールで動画ファイルを選択
2. 「プロパティ」タブを開く
3. メタデータで`Content-Type`が`video/mp4`であることを確認

### ステップ3: S3オブジェクトのContent-Typeを確認・修正

動画ファイルのContent-Typeが正しく設定されているか確認します。

1. S3コンソールで動画ファイルを選択
2. 「プロパティ」タブを開く
3. 「メタデータ」セクションで`Content-Type`を確認
4. `video/mp4`でない場合は修正:

**AWS CLIで修正**:
```bash
aws s3 cp s3://gacha-lab-test/videos/common/1767110912427_20251230_2312_01kdps1skefhbtnbxzdzx2ggjm.mp4 s3://gacha-lab-test/videos/common/1767110912427_20251230_2312_01kdps1skefhbtnbxzdzx2ggjm.mp4 --content-type video/mp4 --metadata-directive REPLACE
```

**S3コンソールから修正**:
1. ファイルを選択
2. 「アクション」→「メタデータの編集」をクリック
3. `Content-Type`を`video/mp4`に設定
4. 「変更を保存」をクリック

### ステップ4: CloudFrontのキャッシュを再度無効化

Content-Typeを修正した場合、CloudFrontのキャッシュを再度無効化します。

1. CloudFrontコンソールでディストリビューションを選択
2. 「キャッシュ削除」タブを開く
3. 「無効化を作成」をクリック
4. オブジェクトパスに`/*`を入力
5. 「無効化を作成」をクリック
6. 完了まで待機（通常5-15分）

### ステップ5: 動画ファイルの再エンコード（必要に応じて）

動画ファイルがiPhoneでサポートされていない形式の場合、再エンコードが必要です。

**推奨エンコード設定**:
```bash
ffmpeg -i input.mp4 \
  -c:v libx264 \
  -profile:v baseline \
  -level 3.1 \
  -preset slow \
  -crf 23 \
  -c:a aac \
  -b:a 128k \
  -movflags +faststart \
  output.mp4
```

**重要なオプション**:
- `-profile:v baseline`: iPhone互換性のため
- `-level 3.1`: 互換性のため
- `-movflags +faststart`: ストリーミング再生を最適化

### ステップ6: LINEアプリの設定を確認

LIFFアプリの設定で、CloudFrontドメインが許可されているか確認します。

1. [LINE Developersコンソール](https://developers.line.biz/)にアクセス
2. 対象のLIFFアプリを選択
3. 「設定」タブを開く
4. 「Content Security Policy」セクションを確認
5. CloudFrontドメイン（`https://*.cloudfront.net`）が許可されているか確認

## 🔧 トラブルシューティング

### 問題1: 動画が読み込まれない

**症状**: 動画が表示されない、またはエラーが発生する

**対処法**:
1. PCのブラウザで動画URLに直接アクセスして、動画が再生できるか確認
2. 動画ファイルのContent-Typeが`video/mp4`であることを確認
3. CloudFrontのキャッシュを無効化

### 問題2: 動画が途中で止まる

**症状**: 動画が途中で再生が止まる

**対処法**:
1. 動画ファイルの形式を確認（H.264/AAC推奨）
2. 動画ファイルのサイズを確認（大きすぎる場合は分割を検討）
3. Rangeリクエストがサポートされているか確認（CloudFrontの`Managed-CachingOptimized`ポリシーを使用）

### 問題3: 動画が再生されない（CORSエラー）

**症状**: ブラウザのコンソールにCORSエラーが表示される

**対処法**:
1. PCのブラウザでレスポンスヘッダーを確認
2. `Access-Control-Allow-Origin: *`が含まれているか確認
3. CloudFrontのレスポンスヘッダーポリシーが正しく適用されているか確認

## 📋 確認チェックリスト

- [ ] PCのブラウザで動画が再生できる
- [ ] レスポンスヘッダーに`Access-Control-Allow-Origin: *`が含まれている
- [ ] レスポンスヘッダーに`Content-Type: video/mp4`が含まれている
- [ ] 動画ファイルのContent-Typeが`video/mp4`に設定されている
- [ ] 動画ファイルがH.264/AAC形式である
- [ ] CloudFrontのキャッシュが無効化されている
- [ ] LIFFアプリのContent-Security-PolicyでCloudFrontドメインが許可されている

## 💡 補足: iPhone LINEアプリの制限

iPhoneのLINEアプリ内ブラウザには以下の制限があります：

1. **自動再生の制限**: ユーザー操作なしでは自動再生できない場合がある
2. **動画形式の制限**: サポートされていないコーデックや形式は再生できない
3. **ネットワーク制限**: モバイルネットワークでの制限がある場合がある

これらの制限を考慮して、動画ファイルの形式と設定を最適化する必要があります。

## 📚 参考リンク

- [CloudFrontレスポンスヘッダーポリシー](https://docs.aws.amazon.com/cloudfront/latest/DeveloperGuide/response-headers-policies.html)
- [S3 CORS設定](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html)
- [LINE LIFF ドキュメント](https://developers.line.biz/ja/docs/liff/overview/)




