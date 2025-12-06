# 動画ファイル配置ディレクトリ

このディレクトリにガチャの動画ファイルを配置してください。

## ファイル名の例
- item1.mp4
- item2.mp4
- item3.mp4
- item4.mp4
- item5.mp4

## 注意事項
- 動画ファイルは `app/api/gacha/route.ts` の `gachaItems` 配列で定義された `videoUrl` と一致させる必要があります
- 現在は `/videos/item1.mp4` のような形式で参照されています
- 管理画面から動画をアップロードする機能は後で実装予定です


