# HOMEVISTA Media Asset Platform

不動産販売用メディア資産管理プラットフォーム。動画・静止画の一元管理、撮影チームアップロード、デベロッパー専用ポータル、地域サイト連携APIを提供します。

---

## 技術スタック

| 項目 | 技術 |
|------|------|
| フレームワーク | Next.js 16 + App Router + TypeScript |
| スタイル | Tailwind CSS v4 + shadcn/ui |
| ORM | Prisma + PostgreSQL |
| 認証 | Supabase Auth + サーバー側RBAC |
| ストレージ | Alibaba Cloud OSS（本番）/ Local（開発） |
| 動画処理 | FFmpeg抽象化 + Mock対応 |
| フォーム | React Hook Form + Zod |
| データ取得 | TanStack Query |

---

## セットアップ

### 1. 環境変数

```bash
cp .env.example .env
```

`.env` を編集して最低限以下を設定：

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/homevista"
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

### 2. パッケージインストール

```bash
npm install
```

### 3. データベースセットアップ

```bash
# マイグレーション実行
npm run db:migrate

# シードデータ投入
npm run db:seed
```

### 4. 開発サーバー起動

```bash
npm run dev
```

http://localhost:3000 にアクセス。

---

## テストアカウント

| メールアドレス | パスワード | ロール |
|--------------|-----------|-------|
| admin@homevista.jp | Password1! | SUPER_ADMIN |
| pm@homevista.jp | Password1! | PROJECT_MANAGER |
| uploader@shootteam.cn | Password1! | UPLOADER（撮影チーム） |
| client@developer.co.jp | Password1! | CLIENT_ADMIN（デベロッパー） |

---

## 画面一覧

| URL | 説明 |
|-----|------|
| `/login` | ログイン |
| `/dashboard` | ダッシュボード（管理者） |
| `/projects` | プロジェクト一覧 |
| `/shoots` | 撮影案件一覧 |
| `/assets` | 素材ライブラリ |
| `/review` | 確認・承認キュー |
| `/delivery` | 納品管理 |
| `/upload/{token}` | 撮影チーム用アップロード（認証不要） |
| `/client/dashboard` | デベロッパーポータル |
| `/client/projects/{id}` | デベロッパー：プロジェクト詳細 |

---

## API エンドポイント

### 認証
```
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

### プロジェクト・案件
```
GET/POST   /api/projects
GET/PATCH  /api/projects/{id}
GET/POST   /api/shoots
GET/PATCH  /api/shoots/{id}
GET/POST   /api/permissions
```

### 素材
```
GET/POST          /api/assets
GET/PATCH/DELETE  /api/assets/{id}
POST              /api/assets/{id}/approve
POST              /api/assets/{id}/reject
POST              /api/assets/{id}/download-url
```

### アップロード
```
POST /api/uploads/sessions
POST /api/uploads/{sessionId}/complete
GET  /api/uploads/{sessionId}/status
```

### デベロッパーポータル
```
GET /api/client/projects
GET /api/client/projects/{id}/assets
```

### 公開サイトAPI（Phase 2）
```
GET /api/public/sites/{siteCode}/assets
```

### ジョブ
```
POST /api/jobs/rights-check   # 権利期限バッチ
GET  /api/jobs/process        # 処理ジョブ実行（開発用）
```

### マスター
```
GET/POST /api/masters/tags
```

---

## ストレージ切替

```env
# 開発
STORAGE_PROVIDER="local"
LOCAL_STORAGE_PATH="./uploads"

# 本番
STORAGE_PROVIDER="oss"
OSS_REGION="oss-ap-northeast-1"
OSS_ACCESS_KEY_ID="..."
OSS_ACCESS_KEY_SECRET="..."
OSS_BUCKET_NAME="homevista-assets"
OSS_CDN_DOMAIN="cdn.homevista.jp"
OSS_STS_ROLE_ARN="acs:ram::..."
```

### Alibaba Cloud OSS 設定手順

1. OSS バケットを作成（ACL: Private）
2. RAM ユーザーを作成し、OSS権限を付与
3. STS ロールを作成（アップロード用一時認証）
4. バケットのCORSを設定（ブラウザ直接アップロード用）
5. ライフサイクルルールを設定（アーカイブ・削除）

---

## 動画処理切替

```env
# 開発（FFmpegなし）
VIDEO_PROCESSOR="mock"

# 本番（FFmpeg必須）
VIDEO_PROCESSOR="ffmpeg"
```

FFmpegプロセッサーは `src/lib/video/ffmpeg.ts` に実装してください（fluent-ffmpegを使用）。

---

## ロール権限一覧

| ロール | 説明 | 主な権限 |
|--------|------|---------|
| SUPER_ADMIN | 全権限 | 全操作 |
| ASSET_ADMIN | 素材管理者 | 承認・公開・タグ |
| PROJECT_MANAGER | PM | 案件・場所・許可登録 |
| UPLOADER | 撮影担当者 | 割当案件へのアップロードのみ |
| SALES | 営業 | 承認済み素材の閲覧・共有 |
| CLIENT_ADMIN | デベロッパー管理者 | 自社素材の閲覧・ユーザー管理 |
| CLIENT_USER | デベロッパー担当者 | 自社公開素材の閲覧・DL |

---

## テスト

```bash
npm test           # 単体テスト
npm run test:watch # ウォッチモード
```

---

## Phase 2・3 拡張設計

### Phase 2: Web配信
- `Site` テーブルに連携サイトを登録
- `AssetPublication` で公開管理
- `/api/public/sites/{siteCode}/assets` APIは実装済み
- 権利期限自動停止バッチ実装済み（`/api/jobs/rights-check`）

### Phase 3: AI・SNS
- `SceneSegment` テーブルのスキーマ準備済み
- `AssetTag.source = "AI"` でAIタグ候補を格納
- `ProcessingJob.jobType = "AI_TAG_SUGGEST"` でジョブ登録済み
- SNS投稿・広告出稿は `AssetPublication.channelType` で拡張

---

## 運用マニュアル

### 毎日の確認事項
1. ダッシュボードで処理エラー確認（`/dashboard`）
2. 許可期限アラート確認
3. 確認待ち素材の承認（`/review`）

### 権利期限バッチ
Cron または管理画面から実行：
```bash
curl -X POST https://your-domain/api/jobs/rights-check \
  -H "x-cron-secret: YOUR_SECRET"
```

### 障害時対応
- **アップロード失敗**: `/admin/jobs` でProcessingJobのステータス確認
- **権利切れ誤検知**: PermissionRecordの`status`を手動更新
- **OSSアクセス不可**: `STORAGE_PROVIDER=local`に切替で緊急対応
- **DBバックアップ**: Supabase管理画面からPoint-in-time recovery

---

## ディレクトリ構成

```
src/
├── app/
│   ├── (auth)/login/          # ログイン画面
│   ├── (dashboard)/           # 管理者画面
│   │   ├── dashboard/         # ダッシュボード
│   │   ├── assets/            # 素材ライブラリ
│   │   ├── projects/          # プロジェクト
│   │   ├── shoots/            # 撮影案件
│   │   └── review/            # 確認・承認
│   ├── (client)/client/       # デベロッパーポータル
│   ├── upload/[token]/        # 撮影チーム用アップロード
│   └── api/                   # Route Handlers
│       ├── auth/
│       ├── assets/
│       ├── projects/
│       ├── shoots/
│       ├── permissions/
│       ├── uploads/
│       ├── masters/
│       ├── client/
│       ├── public/
│       └── jobs/
├── components/
│   ├── layout/
│   ├── assets/
│   └── shoots/
├── lib/
│   ├── auth/       # Session, RBAC, API handler
│   ├── db/         # Prisma client
│   ├── storage/    # StorageProvider (OSS/Local)
│   ├── video/      # VideoProcessor (FFmpeg/Mock)
│   ├── jobs/       # ProcessingJob, RightsExpiry
│   └── utils/
└── tests/
```
