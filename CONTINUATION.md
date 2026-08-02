# 北海道大学2026特別講義サイト — 引き継ぎメモ

新しい会話ページでこのプロジェクトを続ける際は、このファイルを読めば経緯が分かります。

## 基本情報

- **リポジトリ**: https://github.com/hurricanemino730-crypto/hokudai-ds-2026
- **ローカルパス**: `/Users/minorukadota/Library/Mobile Documents/com~apple~CloudDocs/github2/hokudai-ds-2026`
- **公開URL**: https://hurricanemino730-crypto.github.io/hokudai-ds-2026/
- **GitHub Pages設定**: legacy build_type、mainブランチ、ルート(`/`)から配信
- **手動リビルドコマンド**(push後、自動反映されない/急ぎたい時):
  ```bash
  gh api repos/hurricanemino730-crypto/hokudai-ds-2026/pages/builds -X POST
  ```

## サイト構成

```
index.html                     -- 単一ページのサイト本体(講義概要・日程・資料DL・最終課題フォーム)
materials/1st_day/             -- 1日目資料
materials/2nd_day/             -- 2日目資料
materials/3rd_day/             -- 3日目資料
assets/supabase-config.js      -- SupabaseのURL/anonキー設定
assets/submit.js               -- 最終課題提出フォームのロジック
supabase/setup.sql             -- Supabase側のテーブル/RLS/ストレージ設定SQL
```

## 講義内容と日程

8/5(水)・8/6(木)・8/7(金)の3日間、「データサイエンス入門」。日程・タイトル文言は index.html 内に直接記載(ユーザー指示で細かく文言調整済み)。

## アップロード済み資料

- **1日目**: 1st_Lecture.pdf、2nd_Lecture.pdf、演習session1(記述統計).xlsx
- **2日目**: 3rd_Lecture.pptx(未変換のまま)、3rd_Lecture(dis).pdf、3rd_Lecuture_problem.xlsx、4th_Lecture.pdf、4th_Lecture_problem.xlsx、5th_Lecture(MY_App).pdf
- **3日目**: 6th_Lecture.pdf(1限目)、tabelog_data.csv(演習4)、7th_Lecuture.pdf(2限目(1))、7(2)th_Lecture.pdf(2限目「音楽制作＆動画編集」)

### 未対応・今後の予定
- **3日目5限目「最終課題」の説明PDFが未追加**。ユーザーから届き次第、`materials/3rd_day/`に追加し、index.htmlの3日目資料セクションに項目を追加する。

## 最終課題提出フォーム(Supabase連携)— 現在の状況

サイト下部に、受講生が氏名・メール・成果物URL or ファイルを提出できるフォームを実装済み。ただし**現在Supabase側の障害で書き込み(INSERT)が失敗する状態**。

### 技術的な経緯(詳細な調査ログ)

1. 最初のSupabaseプロジェクト `Hokudai2026`(ref: `iudhdbmctvbjilrwvjsn`)を作成し、`supabase/setup.sql`を実行(テーブル`submissions`、RLSポリシー、ストレージバケット`submissions`を設定)。
2. テスト送信したところ `new row violates row-level security policy for table "submissions"` (エラーコード42501、HTTPステータス401)で失敗。
3. 徹底的に切り分け調査を実施:
   - `pg_policies`でポリシー定義を確認 → 正しい(`to anon`, `with check(true)`)
   - `relrowsecurity`/`relforcerowsecurity`確認 → 正常
   - RLSを一時的に無効化 → INSERT成功(テーブル・grant自体は正常と判明)
   - RLS再有効化・ポリシーを作り直しても再現
   - 全く新規のテーブル(`rls_test`)でも同じ現象 → プロジェクト固有・テーブル固有の問題ではない
   - `debug_whoami()`というSECURITY INVOKER関数を作成しRPC経由で呼び出し → `current_user`が確実に`anon`であることを確認済み
   - RPC経由のINSERT(`debug_insert_test`)でも同じRLSエラー → REST直接パスとRPCパスの違いでもない
   - プロジェクトを再起動しても改善せず
4. **新しいSupabaseプロジェクト `Hokudai2026-v2`(ref: `jzwununbvszffxlmktrb`、リージョン: ap-south-1 Mumbai)を作成し、同じsetup.sqlを実行 → 全く同じ現象が再現。**
5. Supabaseステータスページ(status.supabase.com)を確認したところ、2026年8月1日から **"Management API Performance Degradation"** という障害が進行中(Monitoring状態)、直前の7/31には **"DNS Creation Delays"**(新規/更新データベースに影響)という障害も解決済みとして報告されていた。タイミングが一致するため、**Supabase側のプラットフォーム障害が原因である可能性が高い**と結論。
6. ユーザーの了承のもと、数時間待ってから再テストする方針とした。

### 現在の接続先(index.htmlが向いている先)

`assets/supabase-config.js` は新プロジェクト `Hokudai2026-v2` を指すよう設定済み:
- URL: `https://jzwununbvszffxlmktrb.supabase.co`
- anon key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6d3VudW5idnN6ZmZ4bG1rdHJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NjE1NzEsImV4cCI6MjEwMTIzNzU3MX0.J8UkTTZX1tolbTTGD80p5NzV6eUyelqLzpvfonA7GLo`

旧プロジェクト `Hokudai2026`(ref: `iudhdbmctvbjilrwvjsn`)は削除しておらず残っているが、現在サイトからは使っていない。

### 再テスト手順(次にやること)

以下のcurlコマンドで直接INSERTを試す。成功(HTTP 201、データが返る)すればSupabase側の障害が解消したと判断できる:

```bash
curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST \
  "https://jzwununbvszffxlmktrb.supabase.co/rest/v1/submissions" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6d3VudW5idnN6ZmZ4bG1rdHJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NjE1NzEsImV4cCI6MjEwMTIzNzU3MX0.J8UkTTZX1tolbTTGD80p5NzV6eUyelqLzpvfonA7GLo" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6d3VudW5idnN6ZmZ4bG1rdHJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NjE1NzEsImV4cCI6MjEwMTIzNzU3MX0.J8UkTTZX1tolbTTGD80p5NzV6eUyelqLzpvfonA7GLo" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d '{"name":"再テスト","email":"retest@example.com"}'
```

もし成功したら:
1. サイトのフォームから実際にブラウザでも1件テスト送信して動作確認する
2. `debug_whoami`・`debug_insert_test`関数と`rls_test`テーブルは調査用に作った不要物なので、Supabase側のSQL Editorで削除してよい(任意)
   ```sql
   drop function if exists public.debug_whoami();
   drop function if exists public.debug_insert_test(text);
   drop table if exists public.rls_test;
   ```
3. 旧プロジェクト`Hokudai2026`は不要なら削除してよい(ユーザー確認の上で)

もし失敗する場合は、Supabaseサポートに問い合わせる方針(ユーザーに確認済み)。

## セキュリティ上の設計メモ

- 匿名キー(anon key)はブラウザに埋め込む前提の公開鍵。アクセス制御はRLSで行う。
- RLSポリシーは「新規提出(insert)」と「同じメールでの上書き再提出(update)」のみ許可。閲覧(select)・削除は不可。
- 再提出は`email`のUNIQUE制約 + upsert(`onConflict: 'email'`)で上書きする設計。
- ログイン機能なしの軽量設計のため、他人のメールアドレスを知っていれば理論上その人の提出を上書きできてしまう制約が残る(教室内の信頼関係前提)。厳密にしたい場合はSupabase Authのメールリンク認証を追加する案がある。
- ファイルは50MBまで(Supabase Storageバケット`submissions`、非公開、anonはinsert/updateのみ可)。
