package main

import (
	"archive/zip"
	"bytes"
	"embed"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/jchv/go-webview2"
)

//go:embed frontend/* frontend/js/*
var frontendFS embed.FS

type FileContent struct {
	XMLContent string `json:"xmlContent"`
	XSLContent string `json:"xslContent"`
	XMLFile    string `json:"xmlFile"`
	XSLFile    string `json:"xslFile"`
	Error      string `json:"error"`
}

type ZIPFileListResult struct {
	XMLFiles []string `json:"xmlFiles"`
	ZIPPath  string   `json:"zipPath"`
	Error    string   `json:"error"`
}

func main() {
	// 埋め込みファイルシステムからHTTPサーバーを起動
	fsys, err := fs.Sub(frontendFS, "frontend")
	if err != nil {
		log.Fatal(err)
	}

	// 空いているポートを見つける
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		log.Fatal(err)
	}
	port := listener.Addr().(*net.TCPAddr).Port
	listener.Close()

	// HTTPサーバーを起動
	serverURL := fmt.Sprintf("http://127.0.0.1:%d", port)
	http.Handle("/", http.FileServer(http.FS(fsys)))

	go func() {
		if err := http.ListenAndServe(fmt.Sprintf("127.0.0.1:%d", port), nil); err != nil {
			log.Fatal(err)
		}
	}()

	w := webview2.New(true) // デバッグモードON
	defer w.Destroy()
	w.SetTitle("XML/XSL Reader - WebView2")
	w.SetSize(500, 600, webview2.HintFixed)

	// ウィンドウサイズを変更する関数をバインド
	w.Bind("resizeWindow", func(width, height int) {
		w.SetSize(width, height, webview2.HintNone)
	})

	// XMLファイルを読み込む関数をバインド
	w.Bind("loadXMLFile", func(filePath string) string {
		result := FileContent{}

		// XMLファイルを読み込む
		xmlContent, err := os.ReadFile(filePath)
		if err != nil {
			result.Error = "XMLファイルの読み込みに失敗しました: " + err.Error()
			jsonResult, _ := json.Marshal(result)
			return string(jsonResult)
		}

		result.XMLContent = string(xmlContent)
		result.XMLFile = filepath.Base(filePath)

		// xml-stylesheet処理命令からXSLファイル名を抽出
		xmlStr := string(xmlContent)
		xslFileName := extractStylesheetHref(xmlStr)

		if xslFileName != "" {
			// XMLと同じディレクトリのXSLファイルを読み込む
			xmlDir := filepath.Dir(filePath)
			xslPath := filepath.Join(xmlDir, xslFileName)

			xslContent, err := os.ReadFile(xslPath)
			if err != nil {
				result.Error = "XSLファイルの読み込みに失敗しました: " + err.Error()
			} else {
				result.XSLContent = string(xslContent)
				result.XSLFile = xslFileName
			}
		}

		jsonResult, _ := json.Marshal(result)
		return string(jsonResult)
	})

	// ZIPファイル内のXMLファイルリストを取得する関数をバインド
	w.Bind("loadZIPFileList", func(zipPath string) string {
		return getZIPFileList(zipPath)
	})

	// ZIP内の特定ファイルを読み込む関数をバインド
	w.Bind("loadFileFromZIP", func(zipPath, fileName string) string {
		return readFileFromZIP(zipPath, fileName)
	})

	// Base64エンコードされたZIPデータからXMLファイルリストを取得する関数をバインド
	w.Bind("loadZIPFileListFromData", func(base64Data string) string {
		return getZIPFileListFromData(base64Data)
	})

	// Base64エンコードされたZIPデータから特定ファイルを読み込む関数をバインド
	w.Bind("loadFileFromZIPData", func(base64Data, fileName string) string {
		return readFileFromZIPData(base64Data, fileName)
	})

	w.Navigate(serverURL)
	w.SetSize(500, 600, webview2.HintFixed)
	w.Run()
}

// xml-stylesheet処理命令からhref属性を抽出
func extractStylesheetHref(xmlContent string) string {
	start := 0
	for {
		idx := strings.Index(xmlContent[start:], "<?xml-stylesheet")
		if idx == -1 {
			break
		}
		start += idx

		endIdx := strings.Index(xmlContent[start:], "?>")
		if endIdx == -1 {
			break
		}

		instruction := xmlContent[start : start+endIdx+2]

		// href="..."を抽出
		hrefStart := strings.Index(instruction, `href="`)
		if hrefStart != -1 {
			hrefStart += 6
			hrefEnd := strings.Index(instruction[hrefStart:], `"`)
			if hrefEnd != -1 {
				return instruction[hrefStart : hrefStart+hrefEnd]
			}
		}

		start += endIdx + 2
	}
	return ""
}

// ZIPファイル内のXMLファイルリストを取得
func getZIPFileList(zipPath string) string {
	result := ZIPFileListResult{}

	// ZIPファイルを開く
	r, err := zip.OpenReader(zipPath)
	if err != nil {
		result.Error = "ZIPファイルの読み込みに失敗しました: " + err.Error()
		jsonResult, _ := json.Marshal(result)
		return string(jsonResult)
	}
	defer r.Close()

	// XMLファイルを抽出
	xmlFiles := []string{}
	for _, f := range r.File {
		if !f.FileInfo().IsDir() && strings.HasSuffix(strings.ToLower(f.Name), ".xml") {
			xmlFiles = append(xmlFiles, f.Name)
		}
	}

	result.XMLFiles = xmlFiles
	result.ZIPPath = zipPath
	jsonResult, _ := json.Marshal(result)
	return string(jsonResult)
}

// Base64エンコードされたZIPデータからXMLファイルリストを取得
func getZIPFileListFromData(base64Data string) string {
	result := ZIPFileListResult{}

	// Base64デコード
	zipData, err := base64.StdEncoding.DecodeString(base64Data)
	if err != nil {
		result.Error = "ZIPデータのデコードに失敗しました: " + err.Error()
		jsonResult, _ := json.Marshal(result)
		return string(jsonResult)
	}

	// バイトデータからZIPリーダーを作成
	r, err := zip.NewReader(bytes.NewReader(zipData), int64(len(zipData)))
	if err != nil {
		result.Error = "ZIPファイルの読み込みに失敗しました: " + err.Error()
		jsonResult, _ := json.Marshal(result)
		return string(jsonResult)
	}

	// XMLファイルを抽出
	xmlFiles := []string{}
	for _, f := range r.File {
		if !f.FileInfo().IsDir() && strings.HasSuffix(strings.ToLower(f.Name), ".xml") {
			xmlFiles = append(xmlFiles, f.Name)
		}
	}

	result.XMLFiles = xmlFiles
	jsonResult, _ := json.Marshal(result)
	return string(jsonResult)
}

// ZIP内の特定ファイルを読み込む
func readFileFromZIP(zipPath, fileName string) string {
	result := FileContent{}

	// ZIPファイルを開く
	r, err := zip.OpenReader(zipPath)
	if err != nil {
		result.Error = "ZIPファイルの読み込みに失敗しました: " + err.Error()
		jsonResult, _ := json.Marshal(result)
		return string(jsonResult)
	}
	defer r.Close()

	// XMLファイルを読み込む
	var xmlFile *zip.File
	for _, f := range r.File {
		if f.Name == fileName {
			xmlFile = f
			break
		}
	}

	if xmlFile == nil {
		result.Error = "XMLファイルが見つかりません: " + fileName
		jsonResult, _ := json.Marshal(result)
		return string(jsonResult)
	}

	// XMLファイルの内容を読み込む
	rc, err := xmlFile.Open()
	if err != nil {
		result.Error = "XMLファイルの読み込みに失敗しました: " + err.Error()
		jsonResult, _ := json.Marshal(result)
		return string(jsonResult)
	}
	defer rc.Close()

	xmlContent, err := io.ReadAll(rc)
	if err != nil {
		result.Error = "XMLファイルの読み込みに失敗しました: " + err.Error()
		jsonResult, _ := json.Marshal(result)
		return string(jsonResult)
	}

	result.XMLContent = string(xmlContent)
	result.XMLFile = filepath.Base(fileName)

	// xml-stylesheet処理命令からXSLファイル名を抽出
	xmlStr := string(xmlContent)
	xslFileName := extractStylesheetHref(xmlStr)

	if xslFileName != "" {
		// ZIP内のXSLファイルを読み込む
		// ZIP内のパスは常にスラッシュ(/)を使う
		xmlDir := strings.TrimSuffix(fileName, filepath.Base(fileName))
		xmlDir = strings.TrimSuffix(xmlDir, "/")
		xmlDir = strings.TrimSuffix(xmlDir, "\\")

		var xslPath string
		if xmlDir == "" {
			xslPath = xslFileName
		} else {
			// ZIP内ではスラッシュを使用
			xslPath = xmlDir + "/" + xslFileName
		}

		for _, f := range r.File {
			// 完全一致、またはファイル名のみ一致でチェック
			if strings.EqualFold(f.Name, xslPath) ||
				strings.EqualFold(f.Name, xslFileName) ||
				strings.EqualFold(filepath.Base(f.Name), xslFileName) {
				rc, err := f.Open()
				if err != nil {
					result.Error = "XSLファイルの読み込みに失敗しました: " + err.Error()
				} else {
					xslContent, err := io.ReadAll(rc)
					rc.Close()
					if err != nil {
						result.Error = "XSLファイルの読み込みに失敗しました: " + err.Error()
					} else {
						result.XSLContent = string(xslContent)
						result.XSLFile = xslFileName
					}
				}
				break
			}
		}
	}

	jsonResult, _ := json.Marshal(result)
	return string(jsonResult)
}

// Base64エンコードされたZIPデータから特定ファイルを読み込む
func readFileFromZIPData(base64Data, fileName string) string {
	result := FileContent{}

	// Base64デコード
	zipData, err := base64.StdEncoding.DecodeString(base64Data)
	if err != nil {
		result.Error = "ZIPデータのデコードに失敗しました: " + err.Error()
		jsonResult, _ := json.Marshal(result)
		return string(jsonResult)
	}

	// バイトデータからZIPリーダーを作成
	r, err := zip.NewReader(bytes.NewReader(zipData), int64(len(zipData)))
	if err != nil {
		result.Error = "ZIPファイルの読み込みに失敗しました: " + err.Error()
		jsonResult, _ := json.Marshal(result)
		return string(jsonResult)
	}

	// XMLファイルを読み込む
	var xmlFile *zip.File
	for _, f := range r.File {
		if f.Name == fileName {
			xmlFile = f
			break
		}
	}

	if xmlFile == nil {
		result.Error = "XMLファイルが見つかりません: " + fileName
		jsonResult, _ := json.Marshal(result)
		return string(jsonResult)
	}

	// XMLファイルの内容を読み込む
	rc, err := xmlFile.Open()
	if err != nil {
		result.Error = "XMLファイルの読み込みに失敗しました: " + err.Error()
		jsonResult, _ := json.Marshal(result)
		return string(jsonResult)
	}
	defer rc.Close()

	xmlContent, err := io.ReadAll(rc)
	if err != nil {
		result.Error = "XMLファイルの読み込みに失敗しました: " + err.Error()
		jsonResult, _ := json.Marshal(result)
		return string(jsonResult)
	}

	result.XMLContent = string(xmlContent)
	result.XMLFile = filepath.Base(fileName)

	// xml-stylesheet処理命令からXSLファイル名を抽出
	xmlStr := string(xmlContent)
	xslFileName := extractStylesheetHref(xmlStr)

	if xslFileName != "" {
		// ZIP内のXSLファイルを読み込む
		// ZIP内のパスは常にスラッシュ(/)を使う
		xmlDir := strings.TrimSuffix(fileName, filepath.Base(fileName))
		xmlDir = strings.TrimSuffix(xmlDir, "/")
		xmlDir = strings.TrimSuffix(xmlDir, "\\")

		var xslPath string
		if xmlDir == "" {
			xslPath = xslFileName
		} else {
			// ZIP内ではスラッシュを使用
			xslPath = xmlDir + "/" + xslFileName
		}

		for _, f := range r.File {
			// 完全一致、またはファイル名のみ一致でチェック
			if strings.EqualFold(f.Name, xslPath) ||
				strings.EqualFold(f.Name, xslFileName) ||
				strings.EqualFold(filepath.Base(f.Name), xslFileName) {
				rc, err := f.Open()
				if err != nil {
					result.Error = "XSLファイルの読み込みに失敗しました: " + err.Error()
				} else {
					xslContent, err := io.ReadAll(rc)
					rc.Close()
					if err != nil {
						result.Error = "XSLファイルの読み込みに失敗しました: " + err.Error()
					} else {
						result.XSLContent = string(xslContent)
						result.XSLFile = xslFileName
					}
				}
				break
			}
		}
	}

	jsonResult, _ := json.Marshal(result)
	return string(jsonResult)
}
