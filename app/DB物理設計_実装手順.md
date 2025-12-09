# DB物理設計 実装手順

## 概要

Layer 1（2月26日までに必須）のデータベース物理設計の実装手順です。

---

## 1. 前提条件

- Node.js 20以上がインストールされていること
- PostgreSQLがインストールされていること（またはクラウドサービスを利用）
- Prismaがインストールされていること（`npm install`で自動インストール）

---

## 2. 環境変数の設定

### 2.1 `.env.local`ファイルに追加

```env
# データベース接続URL
DATABASE_URL="postgresql://ユーザー名:パスワード@localhost:5432/データベース名?schema=public"
```

**例（ローカル開発環境）:**
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/gacha_lab?schema=public"
```

**例（クラウドサービス - Supabase等）:**
```env
DATABASE_URL="postgresql://postgres.xxxxx:password@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?schema=public"
```

---

## 3. Prismaクライアントの生成

### 3.1 Prismaクライアントを生成

```bash
cd Gacha_Lab/app
npm run db:generate
```

または

```bash
npx prisma generate
```

---

## 4. データベースマイグレーション

### 4.1 初回マイグレーション

```bash
npm run db:migrate
```

または

```bash
npx prisma migrate dev --name init_layer1
```

このコマンドで以下が実行されます：
1. マイグレーションファイルの生成
2. データベースへのスキーマ適用
3. Prismaクライアントの再生成

### 4.2 マイグレーションファイルの確認

マイグレーションファイルは `prisma/migrations/` ディレクトリに生成されます。

---

## 5. 初期データの投入

### 5.1 tsxのインストール（シードスクリプト実行用）

```bash
npm install -D tsx
```

### 5.2 シードデータの投入

```bash
npm run db:seed
```

または

```bash
npx tsx prisma/seed.ts
```

### 5.3 投入されるデータ

- **ガチャタイプ**: 通常ガチャ、プレミアムガチャ
- **ガチャアイテム**: 1等〜5等、ハズレ（サンプル）

---

## 6. データベースの確認

### 6.1 Prisma Studioで確認

```bash
npm run db:studio
```

または

```bash
npx prisma studio
```

ブラウザで `http://localhost:5555` が開き、データベースの内容を確認できます。

### 6.2 直接SQLで確認

PostgreSQLに接続して確認：

```sql
-- テーブル一覧
\dt

-- ガチャタイプの確認
SELECT * FROM gacha_types;

-- ガチャアイテムの確認
SELECT * FROM gacha_items;
```

---

## 7. Prismaクライアントの使用方法

### 7.1 クライアントのインポート

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
```

### 7.2 シングルトンパターン（推奨）

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

### 7.3 使用例

```typescript
// ガチャタイプを取得
const gachaTypes = await prisma.gachaType.findMany({
  where: { isActive: true },
});

// ガチャアイテムを取得
const items = await prisma.gachaItem.findMany({
  where: { 
    rarity: 'FIRST_PRIZE',
    isActive: true,
  },
});

// 抽選履歴を保存
const history = await prisma.gachaHistory.create({
  data: {
    userId: 'user123',
    gachaTypeId: 'normal',
    itemId: 1,
  },
});
```

---

## 8. トラブルシューティング

### 8.1 マイグレーションエラー

**エラー**: `Error: P1001: Can't reach database server`

**解決方法**:
- PostgreSQLが起動しているか確認
- `DATABASE_URL`が正しいか確認
- ファイアウォール設定を確認

### 8.2 スキーマの変更

スキーマを変更した場合：

```bash
# マイグレーションファイルを生成
npm run db:migrate

# Prismaクライアントを再生成
npm run db:generate
```

### 8.3 データベースのリセット（開発環境のみ）

```bash
npx prisma migrate reset
```

**注意**: このコマンドはデータベースを完全にリセットし、すべてのデータを削除します。

---

## 9. 確認項目

- [ ] `.env.local`に`DATABASE_URL`が設定されている
- [ ] Prismaクライアントが生成されている
- [ ] マイグレーションが正常に完了している
- [ ] すべてのテーブルが作成されている
- [ ] 初期データが投入されている
- [ ] Prisma Studioでデータが確認できる

---

## 10. 次のステップ

- [ ] ガチャ抽選APIのDB対応
- [ ] 抽選履歴の保存機能
- [ ] 友達紹介システムのDB連携
- [ ] 管理画面のDB連携

---

## 参考資料

- [Prisma Documentation](https://www.prisma.io/docs)
- [Prisma Migrate Guide](https://www.prisma.io/docs/guides/migrate)
- [DB物理設計_Layer1.md](./DB物理設計_Layer1.md)
- [DB_DESIGN.md](../DB_DESIGN.md)




