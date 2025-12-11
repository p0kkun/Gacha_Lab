# Terraform 手動インストール手順（Windows）

## 概要

管理者権限がない場合のTerraform手動インストール手順です。

---

## 手順

### 1. Terraformのダウンロード

1. [Terraform公式ダウンロードページ](https://www.terraform.io/downloads)にアクセス
2. 「Windows」を選択
3. 「64-bit」を選択
4. ZIPファイルをダウンロード

または、直接ダウンロード：
- https://releases.hashicorp.com/terraform/（最新版を選択）

### 2. 解凍と配置

1. ダウンロードしたZIPファイルを解凍
2. `terraform.exe`を任意のフォルダに配置
   - 例: `C:\Users\sato akihiro\terraform\`
   - または: `C:\terraform\`

### 3. 環境変数PATHに追加

#### 方法1: システムのプロパティから（推奨）

1. Windowsキーを押して「環境変数」と検索
2. 「環境変数を編集」を選択
3. 「ユーザー環境変数」の「Path」を選択
4. 「編集」をクリック
5. 「新規」をクリック
6. Terraformを配置したフォルダのパスを入力（例: `C:\Users\sato akihiro\terraform`）
7. 「OK」をクリックしてすべてのウィンドウを閉じる

#### 方法2: PowerShellから（一時的）

現在のセッションのみ有効：

```powershell
$env:Path += ";C:\Users\sato akihiro\terraform"
```

### 4. インストール確認

新しいPowerShellウィンドウを開いて：

```powershell
terraform --version
```

バージョンが表示されれば成功です。

---

## トラブルシューティング

### エラー: "terraform: The term 'terraform' is not recognized"

**原因**: PATHが正しく設定されていない、または新しいセッションを開いていない

**解決方法**:
1. PowerShellを再起動
2. PATHが正しく設定されているか確認：
   ```powershell
   $env:Path -split ';' | Select-String terraform
   ```
3. 手動でPATHに追加：
   ```powershell
   $env:Path += ";C:\Users\sato akihiro\terraform"
   ```

---

## 次のステップ

Terraformがインストールできたら、[AWS環境構築手順書](./15_AWS環境構築_手順書.md)に戻って続行してください。


