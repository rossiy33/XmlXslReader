# XML/XSL Reader

Windows用のXML/XSLビューアーアプリケーション。ZIPファイルからXMLとXSLを読み込み、XSLT変換して表示・印刷できます。

e-Govの書類を表示するためのツールです。

## 主な機能

- 📦 **ZIPファイル対応** - ドラッグ&ドロップで簡単読み込み
- 📁 **フォルダ別リスト表示** - ZIP内のXMLファイルを整理して表示
- 🎨 **XSLT変換** - XSLスタイルシートによる自動変換・整形
- 🖨️ **スマート印刷** - ファイル形式に応じた最適な印刷レイアウト
- 📝 **長文対応** - `<pre>` タグ内テキストの自動折り返し
- 🪟 **自動リサイズ** - コンテンツに応じたウィンドウサイズ調整

## スクショ
![top-page](https://raw.githubusercontent.com/rossiy33/XmlXslReader/images/image.png)

![view-page](https://raw.githubusercontent.com/rossiy33/XmlXslReader/images/image2f.png)

## 使い方

1. **アプリケーション起動** - `XmlXslReader.exe` を実行
2. **ZIPファイル選択** - ウィンドウにドラッグ&ドロップ
3. **XMLファイル選択** - リストから表示したいファイルをクリック
4. **印刷** - 印刷ボタンでプレビュー・印刷
5. **閉じる** - 「zipを閉じる」で初期画面に戻る

## インストール

### 実行に必要なもの

- Windows 10/11
- WebView2 Runtime（Windows 11は標準搭載）

### 実行方法

1. [Releases](../../releases)から最新版をダウンロード
2. `XmlXslReader.exe` を任意の場所に配置
3. ダブルクリックで起動

## 技術スタック

| 分類 | 技術 |
|------|------|
| 言語 | Go 1.16+ |
| UI | WebView2 (Microsoft Edge) |
| フロントエンド | HTML/CSS/JavaScript (ES6) |
| XSLT処理 | ブラウザネイティブ XSLTProcessor |

## プロジェクト構成

```
XmlXslReader/
├── main.go                    # Go メインアプリ
├── frontend/
│   ├── index.html            # UI
│   ├── style.css             # スタイル
│   └── js/
│       ├── app.js            # エントリーポイント
│       ├── constants.js      # 定数
│       ├── state.js          # 状態管理
│       ├── display.js        # 表示
│       ├── fileHandlers.js   # ファイル処理
│       ├── xslt.js           # XSLT変換
│       ├── print.js          # 印刷
│       └── utils.js          # ユーティリティ
├── build/
│   └── XmlXslReader.exe      # ビルド成果物
├── LICENSE                    # MIT License
└── README.md
```

## 開発者向け

### ビルド前提条件

- Go 1.16以上
- Windows 10/11
- WebView2 Runtime

### 依存関係のインストール

```bash
go get github.com/jchv/go-webview2
```

### 開発用ビルド

```bash
# デバッグモード有効（main.go: webview2.New(true)）
go build -ldflags="-H windowsgui" -o build/XmlXslReader.exe
```

### リリースビルド

```bash
# デバッグモード無効（main.go: webview2.New(false)）
go build -ldflags="-H windowsgui -s -w" -o build/XmlXslReader.exe

# または
build.bat
```

**ビルドフラグ:**
- `-H windowsgui` - コンソール非表示
- `-s` - シンボル削除
- `-w` - デバッグ情報削除

## 仕様

### ウィンドウサイズ

| タイミング | サイズ |
|-----------|--------|
| 起動時 | 500×600 |
| ZIPリスト表示 | 500×600 |
| 初回XML表示 | 1200×900 |
| 2回目以降 | 変更なし |
| zipを閉じる | 500×600 |

### 印刷設定

#### `<DOC VERSION="1.0">` ファイル
- 📄 用紙: **A4縦固定**
- 📏 マージン: **5mm**
- 🔍 スケーリング: **なし**（元サイズ）

#### その他のファイル
- 📄 用紙: **自動判断**（縦横比による）
- 📏 マージン: **0mm**
- 🔍 スケーリング: **A4収まるよう自動調整**
- 📍 配置: **水平垂直中央**

## ライセンス

MIT License - 詳細は [LICENSE](LICENSE) を参照

**MIT Licenseの特徴:**
- ✅ 商用利用可能
- ✅ 改変・再配布自由
- ✅ 無保証（作者は責任を負わない）

## 作者

**rossiy33**

---

<p align="center">Made with ❤️ using Go and WebView2</p>
