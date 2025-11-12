const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const content = document.getElementById('content');
const headerFileInfo = document.getElementById('headerFileInfo');
const xmlViewer = document.getElementById('xmlViewer');
const clearBtn = document.getElementById('clearBtn');
const printBtn = document.getElementById('printBtn');
const fileListPane = document.getElementById('fileListPane');

// ZIPファイルのパスまたはBase64データを保持
let currentZipPath = null;
let currentZipData = null;
let currentZipFileName = null;
let currentXMLFileList = null;

// ウィンドウサイズの定数
const INITIAL_WIDTH = 360;
const INITIAL_HEIGHT = 500;
const DISPLAY_WIDTH = 1400;
const DISPLAY_HEIGHT = 1000;
const LIST_WIDTH = 500;
const LIST_HEIGHT = 600;

// 起動時にウィンドウサイズを設定
window.addEventListener('DOMContentLoaded', () => {
	if (typeof resizeWindow !== 'undefined') {
		resizeWindow(INITIAL_WIDTH, INITIAL_HEIGHT);
	}
});

// body全体でドラッグ&ドロップを受け付ける
document.body.addEventListener('dragover', (e) => {
	e.preventDefault();
	e.stopPropagation();
	if (dropZone.style.display !== 'none') {
		dropZone.classList.add('dragover');
	}
});

document.body.addEventListener('dragleave', (e) => {
	e.preventDefault();
	e.stopPropagation();
	dropZone.classList.remove('dragover');
});

document.body.addEventListener('drop', (e) => {
	e.preventDefault();
	e.stopPropagation();
	dropZone.classList.remove('dragover');

	const files = Array.from(e.dataTransfer.files);

	// ファイルパスを取得してログ出力
	files.forEach(file => {
		console.log('File name:', file.name);
		console.log('File path:', file.path);
		console.log('File object:', file);
	});

	if (files.length > 0) {
		handleFiles(files);
	}
});

// クリックでファイル選択
dropZone.addEventListener('click', () => {
	fileInput.click();
});

fileInput.addEventListener('change', (e) => {
	const files = Array.from(e.target.files);
	if (files.length > 0) {
		handleFiles(files);
	}
});

// 複数ファイル処理
async function handleFiles(files) {
	// 最初にウィンドウサイズを初期サイズに戻す
	if (typeof resizeWindow !== 'undefined') {
		resizeWindow(INITIAL_WIDTH, INITIAL_HEIGHT);
	}

	// 既に表示されている場合はクリア
	if (content.classList.contains('show')) {
		xmlViewer.innerHTML = '';
		headerFileInfo.innerHTML = '';
	}

	let xmlFile = null;
	let xslFile = null;
	let zipFile = null;

	// XMLとXSLファイル、ZIPファイルを分類
	files.forEach(file => {
		const ext = file.name.toLowerCase();
		console.log('File detected:', file.name, 'path:', file.path);
		if (ext.endsWith('.xml')) {
			xmlFile = file;
		} else if (ext.endsWith('.xsl') || ext.endsWith('.xslt')) {
			xslFile = file;
		} else if (ext.endsWith('.zip')) {
			zipFile = file;
		}
	});

	// ZIPファイルの処理
	if (zipFile) {
		console.log('ZIP file detected:', zipFile.name);
		console.log('ZIP file path:', zipFile.path);

		// pathがある場合はパスを使用
		if (zipFile.path && typeof loadZIPFileList !== 'undefined') {
			currentZipPath = zipFile.path;
			currentZipData = null;
			console.log('Loading ZIP file from path:', currentZipPath);
			try {
				const resultJSON = await loadZIPFileList(currentZipPath);
				const result = JSON.parse(resultJSON);

				if (result.error) {
					alert(result.error);
					return;
				}

				displayXMLFileList(result.xmlFiles, zipFile.name);
				return;
			} catch (error) {
				console.error('Failed to load ZIP file:', error);
				alert('ZIPファイルの読み込みに失敗しました: ' + error.message);
				return;
			}
		}

		// pathがない場合はFileReaderでBase64に変換
		if (typeof loadZIPFileListFromData !== 'undefined') {
			console.log('Loading ZIP file as Base64 data');
			try {
				const base64Data = await readFileAsBase64(zipFile);
				currentZipPath = null;
				currentZipData = base64Data;

				const resultJSON = await loadZIPFileListFromData(base64Data);
				const result = JSON.parse(resultJSON);

				if (result.error) {
					alert(result.error);
					return;
				}

				displayXMLFileList(result.xmlFiles, zipFile.name);
				return;
			} catch (error) {
				console.error('Failed to load ZIP file as data:', error);
				alert('ZIPファイルの読み込みに失敗しました: ' + error.message);
				return;
			}
		}

		alert('ZIP読み込み機能が利用できません');
		return;
	}

	if (!xmlFile) {
		alert('XMLファイルまたはZIPファイルを選択してください');
		return;
	}

	// ファイルパスが取得できる場合はGo側で処理
	if (xmlFile.path && typeof loadXMLFile !== 'undefined') {
		console.log('Using Go-side file loading with path:', xmlFile.path);
		try {
			const resultJSON = await loadXMLFile(xmlFile.path);
			const result = JSON.parse(resultJSON);

			if (result.error) {
				console.error('Go side error:', result.error);
			}

			displayXMLWithXSL(result);
			return;
		} catch (error) {
			console.error('Failed to load file via Go:', error);
			// フォールバック: JavaScript側で処理
		}
	}

	// フォールバック: JavaScript側でファイル内容を読み込む
	console.log('Using JavaScript-side file reading');
	const xmlContent = await readFileAsText(xmlFile);
	let xslContent = null;

	if (xslFile) {
		xslContent = await readFileAsText(xslFile);
	}

	// 結果を表示
	const result = {
		xmlContent: xmlContent,
		xmlFile: xmlFile.name,
		xslContent: xslContent,
		xslFile: xslFile ? xslFile.name : null,
		error: null
	};

	displayXMLWithXSL(result);
}

// ファイルをテキストとして読み込む
function readFileAsText(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (e) => resolve(e.target.result);
		reader.onerror = (e) => reject(e);
		reader.readAsText(file);
	});
}

// ファイルをBase64として読み込む
function readFileAsBase64(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			// data:application/zip;base64,xxxxxxx という形式から base64部分のみを抽出
			const base64 = e.target.result.split(',')[1];
			resolve(base64);
		};
		reader.onerror = (e) => reject(e);
		reader.readAsDataURL(file);
	});
}

// ZIPファイル内のXMLファイルリストを表示
function displayXMLFileList(xmlFiles, zipFileName) {
	// ウィンドウサイズをリスト表示用に変更
	if (typeof resizeWindow !== 'undefined') {
		resizeWindow(LIST_WIDTH, LIST_HEIGHT);
	}

	// ZIPファイル名とファイルリストを保存
	currentZipFileName = zipFileName;
	currentXMLFileList = xmlFiles;

	// ヘッダーにZIPファイル情報を表示
	headerFileInfo.innerHTML = `
		<p><strong>ZIPファイル:</strong> ${zipFileName}</p>
		<p><strong>XMLファイル数:</strong> ${xmlFiles.length}件</p>
	`;
	clearBtn.textContent = 'クリア';
	clearBtn.style.background = '#dc3545'; // クリアボタンは赤色
	clearBtn.style.display = 'inline-block';

	// XMLファイルリストを生成
	const listHTML = generateFileListHTML(xmlFiles);

	// リストのみ表示（全幅）
	xmlViewer.innerHTML = listHTML;
	fileListPane.style.display = 'none';

	// 表示切り替え
	dropZone.style.display = 'none';
	content.classList.add('show');
	printBtn.style.display = 'none'; // リスト表示時は印刷ボタンを非表示
}

// XMLファイルリストHTMLを生成
function generateFileListHTML(xmlFiles) {
	let listHTML = '<div style="padding: 20px;">';
	listHTML += '<h3 style="margin-bottom: 20px;">XMLファイルを選択してください</h3>';
	listHTML += '<ul style="list-style: none; padding: 0;">';

	xmlFiles.forEach((fileName, index) => {
		// ファイル名のみを抽出（パスを含まない）
		const baseName = fileName.split('/').pop().split('\\').pop();

		listHTML += `
			<li style="margin-bottom: 10px;">
				<button
					onclick="loadXMLFromZIP('${fileName.replace(/'/g, "\\'")}')"
					style="
						width: 100%;
						padding: 15px;
						text-align: left;
						background: #f0f4ff;
						border: 2px solid #667eea;
						border-radius: 5px;
						cursor: pointer;
						font-size: 14px;
						transition: background-color 0.2s;
					"
					onmouseover="this.style.backgroundColor='#e0e8ff'"
					onmouseout="this.style.backgroundColor='#f0f4ff'"
				>
					${baseName}
				</button>
			</li>
		`;
	});

	listHTML += '</ul></div>';
	return listHTML;
}

// ZIPからXMLファイルを読み込む
async function loadXMLFromZIP(fileName) {
	try {
		let resultJSON;

		// pathがある場合
		if (currentZipPath && typeof loadFileFromZIP !== 'undefined') {
			console.log('Loading file from ZIP path:', currentZipPath, fileName);
			resultJSON = await loadFileFromZIP(currentZipPath, fileName);
		}
		// Base64データがある場合
		else if (currentZipData && typeof loadFileFromZIPData !== 'undefined') {
			console.log('Loading file from ZIP data:', fileName);
			resultJSON = await loadFileFromZIPData(currentZipData, fileName);
		}
		else {
			alert('ZIPファイルが読み込まれていません');
			return;
		}

		const result = JSON.parse(resultJSON);

		if (result.error) {
			alert(result.error);
			return;
		}

		displayXMLWithXSL(result, true); // 2ペイン表示フラグを渡す
	} catch (error) {
		console.error('Failed to load file from ZIP:', error);
		alert('ファイルの読み込みに失敗しました: ' + error.message);
	}
}

// Go側から取得したデータで表示（XSL付き）
function displayXMLWithXSL(result, showFileList = false) {
	// ウィンドウサイズを拡大
	if (typeof resizeWindow !== 'undefined') {
		resizeWindow(DISPLAY_WIDTH, DISPLAY_HEIGHT);
	}

	// ヘッダーにファイル情報を表示
	let headerInfoHTML = `
		<p><strong>XMLファイル:</strong> ${result.xmlFile}</p>
	`;

	if (result.error) {
		headerInfoHTML += `<p style="color: #ffeb3b;"><strong>警告:</strong> ${result.error}</p>`;
	}

	headerFileInfo.innerHTML = headerInfoHTML;
	clearBtn.textContent = 'クリア';
	clearBtn.style.background = '#dc3545'; // クリアボタンは赤色
	clearBtn.style.display = 'inline-block';

	// 2ペイン表示の場合、左側にファイルリストを表示
	if (showFileList && currentXMLFileList) {
		fileListPane.innerHTML = generateFileListHTML(currentXMLFileList);
		fileListPane.style.display = 'block';
		fileListPane.classList.remove('full-width');
	} else {
		fileListPane.style.display = 'none';
	}

	// XSL変換を試みる
	if (result.xslContent) {
		try {
			const transformedHTML = applyXSLT(result.xmlContent, result.xslContent);
			xmlViewer.innerHTML = transformedHTML;
		} catch (error) {
			xmlViewer.innerHTML = `
				<div style="color: red; padding: 20px;">
					<h3>XSLT変換エラー</h3>
					<p>${error.message}</p>
					<hr style="margin: 20px 0;">
					<h4>元のXML:</h4>
					<pre>${escapeHtml(formatXML(result.xmlContent))}</pre>
				</div>
			`;
		}
	} else {
		// XML内容を整形して表示
		const formattedXML = formatXML(result.xmlContent);
		xmlViewer.innerHTML = `<pre>${escapeHtml(formattedXML)}</pre>`;
	}

	// 表示切り替え
	dropZone.style.display = 'none';
	content.classList.add('show');
	printBtn.style.display = 'inline-block';
}

// ファイル内容のみで表示（フォールバック）
function displayXMLOnly(file, xmlContent) {
	// ウィンドウサイズを拡大
	if (typeof resizeWindow !== 'undefined') {
		resizeWindow(DISPLAY_WIDTH, DISPLAY_HEIGHT);
	}

	// ヘッダーにファイル情報を表示
	headerFileInfo.innerHTML = `
		<p><strong>XMLファイル:</strong> ${file.name}</p>
		<p><strong>サイズ:</strong> ${(file.size / 1024).toFixed(2)} KB</p>
		<p style="color: #ffeb3b;">※ XSLファイルは自動読み込みできませんでした</p>
	`;
	clearBtn.textContent = 'クリア';
	clearBtn.style.background = '#dc3545'; // クリアボタンは赤色
	clearBtn.style.display = 'inline-block';

	// XML内容を整形して表示
	const formattedXML = formatXML(xmlContent);
	xmlViewer.innerHTML = `<pre>${escapeHtml(formattedXML)}</pre>`;

	// 表示切り替え
	dropZone.style.display = 'none';
	content.classList.add('show');
	printBtn.style.display = 'inline-block';
}

// XSLT変換を適用
function applyXSLT(xmlString, xslString) {
	const parser = new DOMParser();
	const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
	const xslDoc = parser.parseFromString(xslString, 'text/xml');

	// XSLTプロセッサを作成
	const xsltProcessor = new XSLTProcessor();
	xsltProcessor.importStylesheet(xslDoc);

	// 変換を実行
	const resultDoc = xsltProcessor.transformToFragment(xmlDoc, document);

	// 結果をHTML文字列として取得
	const div = document.createElement('div');
	div.appendChild(resultDoc);
	return div.innerHTML;
}

// XMLを整形
function formatXML(xml) {
	const PADDING = '  ';
	const reg = /(>)(<)(\/*)/g;
	let formatted = xml.replace(reg, '$1\n$2$3');
	let pad = 0;

	return formatted.split('\n').map((node) => {
		let indent = 0;
		if (node.match(/.+<\/\w[^>]*>$/)) {
			indent = 0;
		} else if (node.match(/^<\/\w/)) {
			if (pad !== 0) {
				pad -= 1;
			}
		} else if (node.match(/^<\w[^>]*[^\/]>.*$/)) {
			indent = 1;
		}

		const padding = PADDING.repeat(pad);
		pad += indent;

		return padding + node;
	}).join('\n');
}

// HTMLエスケープ
function escapeHtml(text) {
	const map = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#039;'
	};
	return text.replace(/[&<>"']/g, (m) => map[m]);
}

// クリアボタン
clearBtn.addEventListener('click', () => {
	// 完全にクリア
	if (typeof resizeWindow !== 'undefined') {
		resizeWindow(INITIAL_WIDTH, INITIAL_HEIGHT);
	}

	dropZone.style.display = 'block';
	content.classList.remove('show');
	printBtn.style.display = 'none';
	clearBtn.style.display = 'none';
	fileInput.value = '';
	headerFileInfo.innerHTML = '';
	fileListPane.style.display = 'none'; // ファイルリストペインを非表示
	xmlViewer.innerHTML = ''; // XMLビューアをクリア
	currentZipPath = null; // ZIPパスをクリア
	currentZipData = null; // ZIPデータをクリア
	currentZipFileName = null; // ZIPファイル名をクリア
	currentXMLFileList = null; // XMLファイルリストをクリア
});

// 印刷ボタン
printBtn.addEventListener('click', () => {
	// コンテンツのサイズを取得して縦横を判定
	const contentWidth = xmlViewer.scrollWidth;
	const contentHeight = xmlViewer.scrollHeight;

	// 既存の印刷用スタイルを削除
	const existingStyle = document.getElementById('print-orientation-style');
	if (existingStyle) {
		existingStyle.remove();
	}

	// 横長の場合は landscape に設定
	const orientation = contentWidth > contentHeight ? 'landscape' : 'portrait';

	// A4サイズ（mm）を計算（5mm余白を考慮）
	const a4WidthMM = orientation === 'portrait' ? 210 - 10 : 297 - 10;
	const a4HeightMM = orientation === 'portrait' ? 297 - 10 : 210 - 10;

	// mmをpxに変換（96dpi想定: 1mm ≈ 3.7795px）
	const mmToPx = 3.7795;
	const a4WidthPx = a4WidthMM * mmToPx;
	const a4HeightPx = a4HeightMM * mmToPx;

	// スケール計算
	const scaleX = a4WidthPx / contentWidth;
	const scaleY = a4HeightPx / contentHeight;
	const scale = Math.min(scaleX, scaleY, 1); // 1以下に制限（拡大はしない）

	// 動的にスタイルタグを追加
	const style = document.createElement('style');
	style.id = 'print-orientation-style';
	style.textContent = `
		@media print {
			@page {
				size: A4 ${orientation};
				margin: 5mm;
			}
			.xml-viewer {
				transform: scale(${scale});
				transform-origin: top left;
				width: ${contentWidth}px;
				height: ${contentHeight}px;
			}
		}
	`;
	document.head.appendChild(style);

	// 印刷
	window.print();

	// 印刷後にスタイルタグを削除
	setTimeout(() => {
		if (style.parentNode) {
			style.remove();
		}
	}, 1000);
});
