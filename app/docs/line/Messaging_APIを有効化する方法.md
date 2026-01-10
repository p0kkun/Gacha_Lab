# LINE公式アカウントマネージャーでMessaging APIを有効化する方法

## 概要

2024年9月4日以降、LINE Developers Consoleから直接Messaging APIチャネルを作成することはできなくなりました。

今後は、LINE公式アカウントを作成した上で、**LINE Official Account Manager**でMessaging APIの利用を有効にする必要があります。

---

## 📋 手順

### ステップ1: LINE公式アカウントを作成（既に作成済みの場合はスキップ）

1. [LINE Official Account Manager](https://account.line.biz/) にアクセス
2. LINEアカウントでログイン
3. 「新規作成」をクリック
4. アカウント名を入力（例: `Gacha Lab`）
5. 「作成」をクリック

---

### ステップ2: Messaging APIを有効化

#### 現在の画面からアクセスする方法

現在、LINE Official Account Managerのリッチメニュー設定画面にいる場合：

1. **右上の「設定」アイコン（歯車アイコン）**をクリック
   - 画面右上に「設定」アイコンが表示されています
2. 設定メニューから「Messaging API」を選択
3. 「Messaging APIを利用する」を**有効化**
4. これにより、LINE Developers Consoleに**Messaging APIチャネルが自動的に作成**されます

#### 別の方法（ホーム画面から）

1. 左上の「ホーム」タブをクリック
2. 左側のメニューから「設定」を探す
3. 「設定」→「Messaging API」をクリック
4. 「Messaging APIを利用する」を**有効化**

---

### ステップ3: LINE Developers ConsoleでMessaging APIチャネルを確認

1. [LINE Developers Console](https://developers.line.biz/console/) にアクセス
2. 左側のプロバイダー一覧を確認
3. **新しく作成されたMessaging APIチャネル**を探す
   - チャネル名は、LINE公式アカウントの名前と同じになります
   - チャネルタイプが「Messaging API」と表示されます

---

### ステップ4: 「Messaging API」タブで設定

1. 作成されたMessaging APIチャネルをクリック
2. チャネル設定画面で、上部のタブを確認
3. **「Messaging API」タブ**が表示されているはずです
4. 「Messaging API」タブで以下を設定：
   - **チャネルアクセストークンの発行**
     - `LINE_CHANNEL_ACCESS_TOKEN` の値を取得
   - **チャネルシークレットの確認**
     - 「基本設定」タブで `LINE_CHANNEL_SECRET` を確認
   - **Webhook URLの設定**
     - `https://your-domain.amplifyapp.com/api/webhook/line` を設定

---

## 🔍 画面の見つけ方

### 現在の画面（リッチメニュー設定画面）から

1. **右上の「設定」アイコン（歯車アイコン）**をクリック
2. 設定メニューが表示されます
3. 「Messaging API」を選択

### ホーム画面から

1. 左上の「ホーム」タブをクリック
2. 左側のメニューを確認
3. 「設定」セクションを探す
4. 「Messaging API」を選択

---

## ⚠️ 重要な注意事項

### 2024年9月4日以降の変更点

- ❌ **LINE Developers Consoleから直接Messaging APIチャネルを作成することはできなくなりました**
- ✅ **LINE公式アカウントを作成してから、LINE Official Account ManagerでMessaging APIを有効化する必要があります**

### チャネルの種類

- **LINEミニアプリチャネル**: LIFFアプリ用（現在の「Gacha Lab テストアプリ」）
- **Messaging APIチャネル**: Webhook機能用（新規作成が必要）

これらは**別々のチャネル**です。

---

## 📝 設定後の確認

### Messaging APIチャネルが作成されているか確認

1. LINE Developers Consoleにアクセス
2. 左側のプロバイダー一覧を確認
3. チャネル一覧に以下が表示されているか確認：
   - **LINEミニアプリチャネル**: 「Gacha Lab テストアプリ」
   - **Messaging APIチャネル**: 「Gacha Lab」（またはLINE公式アカウントの名前）

### 「Messaging API」タブが表示されているか確認

1. Messaging APIチャネルをクリック
2. チャネル設定画面の上部タブを確認
3. 「Messaging API」タブが表示されているか確認

---

## 🛠️ トラブルシューティング

### Q: 右上の「設定」アイコンが見当たらない

**A**: 以下の点を確認してください：

1. 画面をスクロールして、右上を確認
2. ブラウザのウィンドウサイズを確認（小さすぎると表示されない場合があります）
3. 別のタブ（「ホーム」など）からアクセスしてみる

### Q: 「Messaging API」のメニューが見当たらない

**A**: 以下の点を確認してください：

1. LINE公式アカウントが作成されているか確認
2. 設定メニューをすべて展開して確認
3. アカウントの権限を確認（管理者権限が必要な場合があります）

### Q: Messaging APIを有効化したが、LINE Developers Consoleにチャネルが表示されない

**A**: 以下の点を確認してください：

1. 数分待ってから、LINE Developers Consoleを再読み込み
2. プロバイダーを切り替えて確認（左側のプロバイダー一覧）
3. LINE Official Account Managerで「Messaging APIを利用する」が有効になっているか再確認

---

## 📚 関連ドキュメント

- [Messaging APIタブの見つけ方](./Messaging_APIタブの見つけ方.md)
- [LINE公式アカウント設定](./LINE公式アカウント設定.md)
- [環境変数設定値の取得方法](../dev/環境変数設定値の取得方法.md)
- [LINE公式アカウント管理画面URL取得機能](./管理画面URL取得機能.md)

---

## 参考リンク

- [LINE Official Account Manager](https://account.line.biz/)
- [LINE Developers Console](https://developers.line.biz/console/)
- [Messaging API ドキュメント](https://developers.line.biz/ja/docs/messaging-api/)





