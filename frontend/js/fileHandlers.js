/**
 * File handling functions
 */

import { readFileAsText, readFileAsBase64, resizeWindowIfAvailable } from './utils.js';
import { displayXMLFileList, displayXMLWithXSL } from './display.js';
import { WINDOW_SIZES } from './constants.js';
import { state } from './state.js';

// Re-export state for backward compatibility
export { state };

/**
 * Handle dropped or selected files
 * @param {Array<File>} files - Array of File objects
 * @param {Object} elements - DOM elements object
 */
export async function handleFiles(files, elements) {
	// Reset window size to initial (disabled - only first display will resize)
	// resizeWindowIfAvailable(WINDOW_SIZES.INITIAL_WIDTH, WINDOW_SIZES.INITIAL_HEIGHT);

	// Clear if already displaying
	if (elements.content.classList.contains('show')) {
		elements.xmlViewer.innerHTML = '';
		elements.headerFileInfo.innerHTML = '';
	}

	let xmlFile = null;
	let xslFile = null;
	let zipFile = null;

	// Classify files
	files.forEach(file => {
		const ext = file.name.toLowerCase();
		if (ext.endsWith('.xml')) {
			xmlFile = file;
		} else if (ext.endsWith('.xsl') || ext.endsWith('.xslt')) {
			xslFile = file;
		} else if (ext.endsWith('.zip')) {
			zipFile = file;
		}
	});

	// Handle ZIP file
	if (zipFile) {
		await handleZIPFile(zipFile, elements);
		return;
	}

	// Handle XML file
	if (!xmlFile) {
		alert('XMLファイルまたはZIPファイルを選択してください');
		return;
	}

	await handleXMLFile(xmlFile, xslFile, elements);
}

/**
 * Handle ZIP file
 * @param {File} zipFile - ZIP file object
 * @param {Object} elements - DOM elements object
 */
async function handleZIPFile(zipFile, elements) {
	// Use path if available
	if (zipFile.path && typeof loadZIPFileList !== 'undefined') {
		state.currentZipPath = zipFile.path;
		state.currentZipData = null;
		try {
			const resultJSON = await loadZIPFileList(state.currentZipPath);
			const result = JSON.parse(resultJSON);

			if (result.error) {
				alert(result.error);
				return;
			}

			state.currentZipFileName = zipFile.name;
			state.currentXMLFileList = result.xmlFiles;
			displayXMLFileList(result.xmlFiles, zipFile.name, elements);
			return;
		} catch (error) {
			console.error('Failed to load ZIP file:', error);
			alert('ZIPファイルの読み込みに失敗しました: ' + error.message);
			return;
		}
	}

	// Use Base64 data if path not available
	if (typeof loadZIPFileListFromData !== 'undefined') {
		try {
			const base64Data = await readFileAsBase64(zipFile);
			state.currentZipPath = null;
			state.currentZipData = base64Data;

			const resultJSON = await loadZIPFileListFromData(base64Data);
			const result = JSON.parse(resultJSON);

			if (result.error) {
				alert(result.error);
				return;
			}

			state.currentZipFileName = zipFile.name;
			state.currentXMLFileList = result.xmlFiles;
			displayXMLFileList(result.xmlFiles, zipFile.name, elements);
			return;
		} catch (error) {
			console.error('Failed to load ZIP file as data:', error);
			alert('ZIPファイルの読み込みに失敗しました: ' + error.message);
			return;
		}
	}

	alert('ZIP読み込み機能が利用できません');
}

/**
 * Handle XML file
 * @param {File} xmlFile - XML file object
 * @param {File|null} xslFile - XSL file object (optional)
 * @param {Object} elements - DOM elements object
 */
async function handleXMLFile(xmlFile, xslFile, elements) {
	// Try Go-side file loading if path available
	if (xmlFile.path && typeof loadXMLFile !== 'undefined') {
		try {
			const resultJSON = await loadXMLFile(xmlFile.path);
			const result = JSON.parse(resultJSON);

			if (result.error) {
				console.error('Go side error:', result.error);
			}

			state.currentXMLContent = result.xmlContent;
			displayXMLWithXSL(result, elements);
			return;
		} catch (error) {
			console.error('Failed to load file via Go:', error);
			// Fallback to JavaScript-side processing
		}
	}

	// Fallback: JavaScript-side file reading
	const xmlContent = await readFileAsText(xmlFile);
	let xslContent = null;

	if (xslFile) {
		xslContent = await readFileAsText(xslFile);
	}

	// Display result
	const result = {
		xmlContent: xmlContent,
		xmlFile: xmlFile.name,
		xslContent: xslContent,
		xslFile: xslFile ? xslFile.name : null,
		error: null
	};

	state.currentXMLContent = xmlContent;
	displayXMLWithXSL(result, elements);
}

/**
 * Load XML file from ZIP
 * @param {string} fileName - File name in ZIP
 * @param {Object} elements - DOM elements object
 */
export async function loadXMLFromZIP(fileName, elements) {
	try {
		let resultJSON;

		// Load from path
		if (state.currentZipPath && typeof loadFileFromZIP !== 'undefined') {
			resultJSON = await loadFileFromZIP(state.currentZipPath, fileName);
		}
		// Load from Base64 data
		else if (state.currentZipData && typeof loadFileFromZIPData !== 'undefined') {
			resultJSON = await loadFileFromZIPData(state.currentZipData, fileName);
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

		state.currentXMLContent = result.xmlContent;
		displayXMLWithXSL(result, elements, true, state.currentXMLFileList);
	} catch (error) {
		console.error('Failed to load file from ZIP:', error);
		alert('ファイルの読み込みに失敗しました: ' + error.message);
	}
}

/**
 * Clear all displayed content and reset state
 * @param {Object} elements - DOM elements object
 */
export function clearAll(elements) {
	resizeWindowIfAvailable(WINDOW_SIZES.LIST_WIDTH, WINDOW_SIZES.LIST_HEIGHT);

	elements.dropZone.style.display = 'block';
	elements.content.classList.remove('show');
	elements.printBtn.style.display = 'none';
	elements.clearBtn.style.display = 'none';
	elements.fileInput.value = '';
	elements.headerFileInfo.innerHTML = '';
	elements.fileListPane.style.display = 'none';
	elements.xmlViewer.innerHTML = '';

	// Reset state
	state.currentZipPath = null;
	state.currentZipData = null;
	state.currentZipFileName = null;
	state.currentXMLFileList = null;
	state.currentXMLContent = null;
	state.isFirstFileDisplay = true;

	// Remove scoped styles
	const existingScopedStyle = document.getElementById('xml-scoped-styles');
	if (existingScopedStyle) {
		existingScopedStyle.remove();
	}
}
