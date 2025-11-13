/**
 * XML Viewer - Main Application
 *
 * This is the main entry point for the XML Viewer application.
 * It handles DOM initialization and event listeners.
 */

import { WINDOW_SIZES } from './constants.js';
import { resizeWindowIfAvailable } from './utils.js';
import { handleFiles, loadXMLFromZIP, clearAll, state } from './fileHandlers.js';
import { handlePrint } from './print.js';

// DOM elements
const elements = {
	dropZone: document.getElementById('dropZone'),
	fileInput: document.getElementById('fileInput'),
	content: document.getElementById('content'),
	headerFileInfo: document.getElementById('headerFileInfo'),
	xmlViewer: document.getElementById('xmlViewer'),
	clearBtn: document.getElementById('clearBtn'),
	printBtn: document.getElementById('printBtn'),
	fileListPane: document.getElementById('fileListPane')
};

// Initialize window size on load
window.addEventListener('DOMContentLoaded', () => {
	resizeWindowIfAvailable(WINDOW_SIZES.LIST_WIDTH, WINDOW_SIZES.LIST_HEIGHT);
});

// Make functions available globally (for inline onclick handlers)
window.loadXMLFromZIP = (fileName) => {
	loadXMLFromZIP(fileName, elements);
};

window.clearAll = () => {
	clearAll(elements);
};

// ============================================================================
// Drag & Drop Event Handlers
// ============================================================================

// Prevent default drag behaviors on window
['dragenter', 'dragover', 'drop'].forEach(eventName => {
	window.addEventListener(eventName, (e) => {
		e.preventDefault();
	}, false);
});

// Handle dragenter
document.body.addEventListener('dragenter', (e) => {
	e.preventDefault();
	if (elements.dropZone.style.display !== 'none') {
		elements.dropZone.classList.add('dragover');
	}
});

// Handle dragover
document.body.addEventListener('dragover', (e) => {
	e.preventDefault();
	e.dataTransfer.dropEffect = 'copy';
	if (elements.dropZone.style.display !== 'none') {
		elements.dropZone.classList.add('dragover');
	}
});

// Handle dragleave
document.body.addEventListener('dragleave', (e) => {
	e.preventDefault();
	elements.dropZone.classList.remove('dragover');
});

// Handle drop
document.body.addEventListener('drop', (e) => {
	e.preventDefault();
	e.stopPropagation();
	elements.dropZone.classList.remove('dragover');

	const files = Array.from(e.dataTransfer.files);

	if (files.length > 0) {
		handleFiles(files, elements);
	}

	return false;
});

// ============================================================================
// File Input Event Handlers
// ============================================================================

elements.dropZone.addEventListener('click', () => {
	elements.fileInput.click();
});

elements.fileInput.addEventListener('change', (e) => {
	const files = Array.from(e.target.files);
	if (files.length > 0) {
		handleFiles(files, elements);
	}
});

// ============================================================================
// Button Event Handlers
// ============================================================================

// Clear button
elements.clearBtn.addEventListener('click', () => {
	clearAll(elements);
});

// Print button
elements.printBtn.addEventListener('click', () => {
	handlePrint(state.currentXMLContent, elements);
});
