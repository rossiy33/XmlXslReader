/**
 * Display and rendering functions
 */

import { escapeHtml, resizeWindowIfAvailable } from './utils.js';
import { applyXSLT } from './xslt.js';
import { WINDOW_SIZES } from './constants.js';
import { state } from './state.js';

/**
 * Generate HTML for file list
 * @param {Array<string>} xmlFiles - Array of XML file paths
 * @returns {string} HTML string for file list
 */
export function generateFileListHTML(xmlFiles) {
	// Group files by folder
	const folderMap = {};

	xmlFiles.forEach(fileName => {
		const parts = fileName.split('/');
		const baseName = parts.pop();
		const folderName = parts.length > 0 ? parts.join('/') : '(ルート)';

		if (!folderMap[folderName]) {
			folderMap[folderName] = [];
		}
		folderMap[folderName].push({ fullPath: fileName, baseName: baseName });
	});

	let listHTML = '<div style="padding: 10px; font-size: 13px; flex: 1; overflow-y: auto;">';
	listHTML += '<h3 style="margin: 0 0 15px 0; font-size: 14px;">XMLファイルを選択してください</h3>';

	// Display by folder
	Object.keys(folderMap).sort().forEach(folderName => {
		const files = folderMap[folderName];

		// Folder heading
		listHTML += `<div style="margin-bottom: 5px; margin-top: 10px; font-weight: bold; color: #667eea; font-size: 12px;">${folderName}</div>`;
		listHTML += '<ul style="list-style: none; padding: 0; margin: 0 0 10px 0;">';

		files.forEach(file => {
			listHTML += `<li style="margin-bottom: 5px;"><button onclick="loadXMLFromZIP('${file.fullPath.replace(/'/g, "\\'")}')" style="width: 100%; padding: 10px; text-align: left; background: #f0f4ff; border: 1px solid #667eea; border-radius: 3px; cursor: pointer; font-size: 12px; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#e0e8ff'" onmouseout="this.style.backgroundColor='#f0f4ff'">${file.baseName}</button></li>`;
		});

		listHTML += '</ul>';
	});

	listHTML += '</div>';
	return listHTML;
}

/**
 * Display XML file list from ZIP
 * @param {Array<string>} xmlFiles - Array of XML file paths
 * @param {string} zipFileName - Name of ZIP file
 * @param {Object} elements - DOM elements object
 */
export function displayXMLFileList(xmlFiles, zipFileName, elements) {
	// Resize window for list display (only on first file display)
	if (state.isFirstFileDisplay) {
		resizeWindowIfAvailable(WINDOW_SIZES.LIST_WIDTH, WINDOW_SIZES.LIST_HEIGHT);
		// Don't set isFirstFileDisplay = false here, so XML selection can still resize
	}

	// Create file list with header in xmlViewer
	const fileListHeader = `
		<div style="padding: 10px; border-bottom: 1px solid #ddd; background: #f9f9f9; flex-shrink: 0;">
			<p style="margin: 0 0 5px 0; font-size: 12px;"><strong>ZIPファイル:</strong> ${zipFileName}</p>
			<p style="margin: 5px 0; font-size: 12px;"><strong>XMLファイル数:</strong> ${xmlFiles.length}件</p>
		</div>
	`;

	// Create footer with close button
	const fileListFooter = `
		<div style="padding: 10px; border-top: 1px solid #ddd; background: #f9f9f9; flex-shrink: 0; text-align: center;">
			<button onclick="clearAll()" style="padding: 8px 16px; background: #ff9800; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; min-width: 120px;">zipを閉じる</button>
		</div>
	`;

	// Generate file list HTML
	const listHTML = generateFileListHTML(xmlFiles);

	// Display list with header and footer (using xmlViewer as container)
	elements.xmlViewer.innerHTML = fileListHeader + listHTML + fileListFooter;
	elements.xmlViewer.style.display = 'flex';
	elements.xmlViewer.style.flexDirection = 'column';
	elements.fileListPane.style.display = 'none';

	// Hide header file info and buttons
	elements.headerFileInfo.innerHTML = '';
	elements.clearBtn.style.display = 'none';
	elements.printBtn.style.display = 'none';

	// Toggle display
	elements.dropZone.style.display = 'none';
	elements.content.classList.add('show');
}

/**
 * Create iframe for content display
 * @param {string} contentHTML - HTML content to display
 * @returns {HTMLIFrameElement} Created iframe element
 */
export function createContentIframe(contentHTML) {
	const iframe = document.createElement('iframe');
	iframe.id = 'xml-content-frame';
	iframe.style.width = '100%';
	iframe.style.height = '100%';
	iframe.style.border = 'none';
	iframe.style.background = 'white';
	iframe.sandbox = 'allow-same-origin allow-modals';

	// Wrap content with styles to override user agent stylesheet
	const cssReset = `<style>
body {
  display: inline-block;
  margin: 0;
  padding: 0;
}
pre {
  white-space: pre-wrap !important;
  word-wrap: break-word !important;
  overflow-wrap: break-word !important;
}
</style>
`;

	iframe.srcdoc = `${cssReset} ${contentHTML}`;

	return iframe;
}

/**
 * Display XML with XSL transformation
 * @param {Object} result - Result object from file loading
 * @param {Object} elements - DOM elements object
 * @param {boolean} showFileList - Whether to show file list pane
 * @param {Array<string>} xmlFileList - List of XML files (for 2-pane view)
 */
export function displayXMLWithXSL(result, elements, showFileList = false, xmlFileList = null) {
	// Resize window for XML content display (only on first XML file display)
	if (state.isFirstFileDisplay) {
		resizeWindowIfAvailable(WINDOW_SIZES.DISPLAY_WIDTH, WINDOW_SIZES.DISPLAY_HEIGHT);
		state.isFirstFileDisplay = false;
	}

	// Update header with file info
	let headerInfoHTML = `<p><strong>XMLファイル:</strong> ${result.xmlFile}</p>`;

	if (result.error) {
		headerInfoHTML += `<p style="color: #ffeb3b;"><strong>警告:</strong> ${result.error}</p>`;
	}

	// Show file list in 2-pane view if requested
	if (showFileList && xmlFileList) {
		// Create file list pane with header
		const fileListHeader = `
			<div style="padding: 10px; border-bottom: 1px solid #ddd; background: #f9f9f9; flex-shrink: 0;">
				<p style="margin: 0 0 5px 0; font-size: 12px;"><strong>XMLファイル:</strong> ${result.xmlFile}</p>
				${result.error ? `<p style="margin: 5px 0; font-size: 12px; color: #ff9800;"><strong>警告:</strong> ${result.error}</p>` : ''}
			</div>
		`;
		// Create footer with close button
		const fileListFooter = `
			<div style="padding: 10px; border-top: 1px solid #ddd; background: #f9f9f9; flex-shrink: 0; text-align: center;">
				<button onclick="clearAll()" style="padding: 6px 12px; background: #ff9800; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 12px; min-width: 100px;">zipを閉じる</button>
			</div>
		`;
		elements.fileListPane.innerHTML = fileListHeader + generateFileListHTML(xmlFileList) + fileListFooter;
		elements.fileListPane.style.display = 'flex';
		elements.fileListPane.classList.remove('full-width');

		// Hide header file info and clear button
		elements.headerFileInfo.innerHTML = '';
		elements.clearBtn.style.display = 'none';
		elements.printBtn.style.display = 'inline-block';
	} else {
		// Show in header when no file list pane
		elements.headerFileInfo.innerHTML = headerInfoHTML;
		elements.clearBtn.textContent = 'zipを閉じる';
		elements.clearBtn.style.background = '#ff9800';
		elements.clearBtn.style.display = 'inline-block';
		elements.fileListPane.style.display = 'none';
		elements.printBtn.style.display = 'inline-block';
	}

	// Prepare content
	let contentHTML;

	// Try XSL transformation
	if (result.xslContent) {
		try {
			contentHTML = applyXSLT(result.xmlContent, result.xslContent);
		} catch (error) {
			contentHTML = `
				<div style="color: red; padding: 20px; font-family: 'Segoe UI', sans-serif;">
					<h3>XSLT変換エラー</h3>
					<p>${error.message}</p>
					<hr style="margin: 20px 0;">
					<h4>元のXML:</h4>
					<div style="background: #f5f5f5; padding: 10px; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word; font-family: 'Consolas', 'Monaco', monospace; font-size: 14px; line-height: 1.5;">${escapeHtml(result.xmlContent)}</div>
				</div>
			`;
		}
	} else {
		// Display XML as-is without formatting
		contentHTML = `<div style="white-space: pre-wrap; word-wrap: break-word; font-family: 'Consolas', 'Monaco', monospace; font-size: 14px; line-height: 1.5; padding: 20px;">${escapeHtml(result.xmlContent)}</div>`;
	}

	// Create iframe and display content
	const iframe = createContentIframe(contentHTML);
	elements.xmlViewer.innerHTML = '';
	elements.xmlViewer.style.display = 'block';
	elements.xmlViewer.style.flexDirection = '';
	elements.xmlViewer.appendChild(iframe);

	// Toggle display
	elements.dropZone.style.display = 'none';
	elements.content.classList.add('show');
}
