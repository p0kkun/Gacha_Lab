# Stripe 決済実装方法

## 概要

Stripe を使用した決済機能の実装方法です。**テストモード**を使用することで、実際の決済を行わずにシミュレーションが可能です。

---

## 1. Stripe テストモードについて

### 1.1 テストモードの特徴

- ✅ **実際の決済は発生しない**
- ✅ **テスト用の API キーを使用**
- ✅ **テストカード情報を使用可能**
- ✅ **本番環境と同じ API を使用**
- ✅ **ダッシュボードで取引を確認可能**

### 1.2 テストモードと本番モードの切り替え

- **テストモード**: 開発・デモ環境で使用
- **本番モード**: 実際のサービスで使用
- ダッシュボードで簡単に切り替え可能

---

## 2. Stripe アカウントのセットアップ

### 2.1 アカウント作成

1. [Stripe](https://stripe.com/jp) にアクセス
2. アカウントを作成（無料）
3. ダッシュボードにログイン

### 2.2 テストモードの有効化

1. Stripe ダッシュボードにログイン
2. 右上の「テストモード」トグルを ON にする
3. テスト用の API キーを取得

### 2.3 API キーの取得

1. 「開発者」→「API キー」に移動
2. **公開可能キー（Publishable key）**をコピー
3. **シークレットキー（Secret key）**をコピー

**注意**: シークレットキーは絶対に公開しないこと

---

## 3. 環境変数の設定

### 3.1 `.env.local`ファイルに追加

```env
# Stripe設定（テストモード）
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx

# 本番環境では以下を使用
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
# STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
```

### 3.2 環境変数の説明

- **NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY**: フロントエンドで使用（公開可能）
- **STRIPE_SECRET_KEY**: サーバー側でのみ使用（機密情報）

---

## 4. 必要なライブラリのインストール

```bash
npm install @stripe/stripe-js @stripe/react-stripe-js stripe
```

---

## 5. 実装方法

### 5.1 フロントエンド実装

#### Stripe Elements のセットアップ

```typescript
// components/StripePayment.tsx
"use client";

import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

export default function StripePayment({
  amount,
  onSuccess,
}: {
  amount: number;
  onSuccess: () => void;
}) {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm amount={amount} onSuccess={onSuccess} />
    </Elements>
  );
}

function CheckoutForm({
  amount,
  onSuccess,
}: {
  amount: number;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setLoading(true);

    try {
      // PaymentIntentを作成
      const response = await fetch("/api/payment/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });

      const { clientSecret } = await response.json();

      // 決済を確認
      const { error } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success`,
        },
      });

      if (error) {
        alert(`決済エラー: ${error.message}`);
      } else {
        onSuccess();
      }
    } catch (error) {
      console.error("決済エラー:", error);
      alert("決済に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full rounded-lg bg-blue-500 px-6 py-3 text-white hover:bg-blue-600 disabled:bg-gray-400"
      >
        {loading ? "処理中..." : `¥${amount.toLocaleString()} を支払う`}
      </button>
    </form>
  );
}
```

### 5.2 バックエンド実装

#### PaymentIntent 作成 API

```typescript
// app/api/payment/create-intent/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, userId, gachaTypeId } = body;

    // PaymentIntentを作成
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // 金額（円単位、例: 1000 = ¥1,000）
      currency: "jpy",
      metadata: {
        userId,
        gachaTypeId,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error: any) {
    console.error("PaymentIntent作成エラー:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

#### 決済完了 Webhook

```typescript
// app/api/payment/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error("Webhook署名検証エラー:", err.message);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  // 決済成功時の処理
  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const { userId, gachaTypeId } = paymentIntent.metadata;

    // ガチャ抽選を実行
    // TODO: ガチャ抽選APIを呼び出し
    console.log("決済成功:", { userId, gachaTypeId });
  }

  return NextResponse.json({ received: true });
}
```

---

## 6. テストカード情報

### 6.1 成功するテストカード

| カード番号          | 有効期限         | CVC         | 説明                         |
| ------------------- | ---------------- | ----------- | ---------------------------- |
| 4242 4242 4242 4242 | 任意の未来の日付 | 任意の 3 桁 | 成功するカード               |
| 5555 5555 5555 4444 | 任意の未来の日付 | 任意の 3 桁 | 成功するカード（Mastercard） |

### 6.2 エラーをシミュレートするテストカード

| カード番号          | 説明               |
| ------------------- | ------------------ |
| 4000 0000 0000 0002 | カードが拒否される |
| 4000 0000 0000 9995 | 資金不足           |
| 4000 0000 0000 0069 | 有効期限切れ       |

### 6.3 3D セキュアテスト

| カード番号          | 説明                  |
| ------------------- | --------------------- |
| 4000 0025 0000 3155 | 3D セキュア認証が必要 |

---

## 7. 決済フローの実装

### 7.1 ガチャ実行時の決済フロー

```typescript
// 1. ユーザーが「ガチャを引く」ボタンをクリック
// 2. 決済モーダルを表示
// 3. Stripe Elementsでカード情報を入力
// 4. PaymentIntentを作成
// 5. 決済を確認
// 6. 決済成功後、ガチャ抽選を実行
// 7. 結果を表示
```

### 7.2 実装例

```typescript
// components/GachaContent.tsx に追加
const handleDrawGacha = async () => {
  // 1. 決済モーダルを表示
  setShowPaymentModal(true);
};

const handlePaymentSuccess = async () => {
  // 2. 決済成功後、ガチャ抽選を実行
  const response = await fetch("/api/gacha", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId,
      gachaType: selectedGacha.id,
    }),
  });

  const result = await response.json();
  setResult(result);
  setShowVideo(true);
};
```

---

## 8. 無料ガチャの処理

### 8.1 友達紹介による無料ガチャ

```typescript
// 無料ガチャがあるかチェック
const checkFreeGacha = async (userId: string) => {
  const freeGacha = await prisma.freeGachaHistory.findFirst({
    where: {
      userId,
      isUsed: false,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  return freeGacha;
};

// 無料ガチャを使用
const useFreeGacha = async (freeGachaId: number) => {
  await prisma.freeGachaHistory.update({
    where: { id: freeGachaId },
    data: {
      isUsed: true,
      usedAt: new Date(),
    },
  });
};
```

---

## 9. 決済金額の設定

### 9.1 ガチャタイプ別の金額

```typescript
const GACHA_PRICES = {
  normal: 1000, // 通常ガチャ: ¥1,000
  premium: 3000, // プレミアムガチャ: ¥3,000
};
```

---

## 10. テストモードの確認

### 10.1 ダッシュボードでの確認

1. Stripe ダッシュボードにログイン
2. 「テストモード」が ON になっていることを確認
3. 「支払い」→「支払い」で取引履歴を確認
4. テスト決済が記録されていることを確認

### 10.2 ログの確認

- テストモードでは、すべての取引に「TEST MODE」のラベルが付きます
- 実際の資金移動は発生しません

---

## 11. 本番環境への移行

### 11.1 本番モードへの切り替え

1. Stripe ダッシュボードで「本番モード」に切り替え
2. 本番用の API キーを取得
3. 環境変数を本番用に更新
4. 動作確認

### 11.2 注意事項

- 本番環境では実際の決済が発生します
- テストモードと本番モードの API キーは異なります
- Webhook URL も本番環境の URL に設定する必要があります

---

## 12. セキュリティ考慮事項

### 12.1 API キーの管理

- シークレットキーはサーバー側でのみ使用
- 環境変数で管理（`.env.local`に追加、`.gitignore`に含める）
- 本番環境では環境変数やシークレット管理サービスを使用

### 12.2 Webhook 署名の検証

- Webhook リクエストの署名を検証
- 不正なリクエストを拒否

---

## 13. 実装チェックリスト

- [ ] Stripe アカウントを作成
- [ ] テストモードで API キーを取得
- [ ] 環境変数を設定
- [ ] 必要なライブラリをインストール
- [ ] PaymentIntent 作成 API を実装
- [ ] フロントエンドで Stripe Elements を実装
- [ ] 決済完了 Webhook を実装
- [ ] テストカードで動作確認
- [ ] 無料ガチャの処理を実装
- [ ] エラーハンドリングを実装

---

## 14. 参考資料

- [Stripe ドキュメント（日本語）](https://stripe.com/docs/jp)
- [Stripe テストカード](https://stripe.com/docs/testing)
- [Stripe Elements](https://stripe.com/docs/stripe-js/react)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)

---

## まとめ

Stripe のテストモードを使用することで：

1. ✅ **実際の決済を行わずにシミュレーション可能**
2. ✅ **テストカードで様々なシナリオをテスト可能**
3. ✅ **本番環境と同じ API を使用**
4. ✅ **ダッシュボードで取引を確認可能**

デモ環境ではテストモードを使用し、本番環境では本番モードに切り替えることで、安全に決済機能を実装・運用できます。




