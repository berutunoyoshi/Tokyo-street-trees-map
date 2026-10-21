# 東京23区 街路樹マップ

東京都が公開している23区内（都道）の街路樹データ **約14万4千本** を地図上で検索・閲覧できるWebアプリです。
サーバー不要の静的サイトなので、GitHub Pages でそのまま公開できます。

## 主な機能

| 機能 | 内容 |
| --- | --- |
| 地図表示 | 全樹木を点で表示。区分・樹種（上位10）・樹高・幹周で色分け、ヒートマップ（密度）表示 |
| 背景地図 | 地理院タイル（淡色・標準・航空写真）／OpenStreetMap を切替 |
| 検索・絞り込み | キーワード（樹種・路線名・通称道路名・区。ひらがな可）、樹種の複数選択、行政区、区分、道路種別、路線名、樹高・幹周の範囲、樹木ID（`#123`） |
| 属性の確認 | 点をクリックすると樹種・区分・樹高・枝張・幹周・行政区・種別・路線名・通称道路名・座標を表示 |
| 結果一覧 | 表示範囲内の該当樹木を地図の中心に近い順に表示。結果全体へのズーム、CSVダウンロード |
| 統計 | 本数・樹種数・平均樹高などと、樹種上位15・行政区別の棒グラフ（クリックで絞り込み） |
| マイメモ | 樹木ごとに状態・観察日・季節の様子（開花・紅葉など）・メモ・写真（最大4枚）・お気に入りを登録（ブラウザ内に保存） |
| 未登録の木を追加 | 画面中央の十字を木の位置に合わせて、データにない樹木の地点を登録 |
| 書き出し／読み込み | マイメモを JSON / GeoJSON / CSV で書き出し、JSON で読み込み（端末間の移行・バックアップ用） |
| みんなの報告 | 「GitHubで報告する」から公開 Issue を投稿（樹木ID・位置・状態などは自動入力）。投稿された報告は自動集計されて地図上に赤い輪で表示 |
| 共有 | URL に地図の位置と選択中の樹木が入るので、そのまま共有できる |
| 現在地 | 現在地の表示・追従、現在地から近い順の一覧、詳細画面に現在地からの距離 |
| スマートフォン対応 | 地図中心の画面＋ボトムシート、ダークモード対応 |

## ファイル構成

```
├── index.html                  アプリ本体（画面・デザイン・プログラム・設定をこの1ファイルに収録）
├── data/
│   ├── trees.json              変換済みの街路樹データ（アプリが読み込む）
│   └── reports.json            みんなの報告（公開時に GitHub Actions が自動生成）
├── raw/tokyo_gairoju.csv       元データ（Shift_JIS）
├── scripts/convert.py          CSV → trees.json の変換スクリプト
└── .github/
    ├── ISSUE_TEMPLATE/tree-report.yml   報告用の Issue フォーム
    ├── scripts/build-reports.js         Issue → reports.json の集計
    └── workflows/deploy.yml             GitHub Pages への自動デプロイ
```

**最低限必要なのは `index.html` と `data/trees.json` の2つ** です（`trees.json` を index.html と同じ階層に置いても動きます）。
設定（報告先リポジトリ・初期表示位置・出典表記・クイック検索の樹種）は `index.html` 内の `APP_CONFIG` で変更できます。

## 画面の構成

- **地図が全面**に表示され、上部に検索バーとよく見る樹種のボタン、右下に「表示設定」と「現在地」ボタンがあります。
- 下部メニュー（一覧・統計・マイメモ・報告・情報）や木をタップすると、**下からシートが開きます**。シートは上下にドラッグして大きさを変えたり閉じたりできます（PCでは左側のパネルになります）。
- **現在地ボタン**で現在地を表示・追従し、「一覧」で現在地から近い木の順に確認できます（位置情報の利用許可が必要。https で公開されている必要があります）。

## GitHub で公開する手順

1. **リポジトリを作成**
   GitHub で新しいリポジトリ（例：`tokyo-street-trees`、Public）を作成し、このフォルダの中身をすべてアップロード（または `git push`）します。
   ```bash
   git init
   git add .
   git commit -m "first commit"
   git branch -M main
   git remote add origin https://github.com/<ユーザー名>/tokyo-street-trees.git
   git push -u origin main
   ```
   ※ ブラウザからアップロードする場合、`.github` フォルダは隠しフォルダのため見落とさないようご注意ください。

2. **GitHub Pages を有効化**
   リポジトリの **Settings → Pages → Build and deployment → Source** で **「GitHub Actions」** を選択します。

3. **デプロイ**
   **Actions** タブで「Deploy to GitHub Pages」を実行（main への push でも自動実行）。完了すると
   `https://<ユーザー名>.github.io/tokyo-street-trees/` で公開されます。

4. **Issue（報告機能）の確認**
   Settings → General → Features で **Issues** が有効になっていることを確認してください。
   ラベル `tree-report` は最初の報告時に自動で付きます（事前に Issues → Labels で作成しておくと確実です）。

> GitHub Pages 以外（独自ドメインや社内サーバー等）で公開する場合は、`index.html` 内 `APP_CONFIG` の `githubRepo` に `"ユーザー名/リポジトリ名"` を設定してください。GitHub Pages では URL から自動判定します。

## 「みんなの報告」のしくみ

1. 利用者が樹木の詳細画面で **「GitHubで報告する」** を押すと、GitHub の Issue 投稿画面が開きます（樹木ID・樹種・位置・報告の種類・内容が入力済み。写真はその画面で添付）。
2. Issue が作成・編集・クローズされると GitHub Actions が動き、ラベル `tree-report` の Issue を集計して `data/reports.json` を作り直し、サイトを再デプロイします（数分で反映）。
3. 地図上では **受付中＝赤い輪、クローズ済み＝灰色の輪** で表示されます。

**管理のポイント**
- 対応が済んだ報告は Issue をクローズすると「対応済/終了」表示になります。
- 不適切な投稿は `invalid` / `spam` / `hidden` のいずれかのラベルを付けるか、「Close as not planned」でクローズすると地図から非表示になります。
- 投稿には GitHub アカウントが必要です。投稿内容は公開されるため、個人情報を含めないよう Issue フォームで注意喚起しています。

## データの更新

新しい CSV が公開されたら `raw/` に置き換えて変換し、push します。

```bash
python3 scripts/convert.py raw/tokyo_gairoju.csv data/trees.json
```

- 文字コード（Shift_JIS / UTF-8）は自動判別します。外部ライブラリは不要です。
- **樹木ID は CSV の行番号（0始まり）** です。データを差し替えると ID と樹木の対応が変わり、既存のマイメモや報告の紐付けがずれる可能性があります（マイメモ・報告には座標も保存されています）。

## ローカルで確認する

`fetch` でデータを読み込むため、`index.html` を直接開くのではなく簡易 Web サーバーを使います。

```bash
python3 -m http.server 8000
# → http://localhost:8000/ を開く
```

## 出典・ライセンス

- **街路樹データ**：東京都（東京都オープンデータカタログサイト）のデータを加工して作成しています。利用条件（クレジット表記など）は、データの掲載ページに記載のライセンス（通常は CC BY 4.0）に従ってください。出典表記は `index.html` 内 `APP_CONFIG` の `sourceText` で変更できます。
- **背景地図**：[地理院タイル](https://maps.gsi.go.jp/development/ichiran.html)（国土地理院）、© [OpenStreetMap contributors](https://www.openstreetmap.org/copyright)
- **地図ライブラリ**：[MapLibre GL JS](https://maplibre.org/)（BSD-3-Clause）
- **このアプリのソースコード**：MIT License（`LICENSE` を参照）

元データの樹高・幹周には入力誤りと思われる値（例：樹高60m、幹周1,427cm）が含まれます。データは公開時点のもので、現況と異なる場合があります。
