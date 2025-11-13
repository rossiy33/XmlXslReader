/**
 * Utility functions for XML Viewer
 */

/**
 * Read file as text
 * @param {File} file - File object to read
 * @returns {Promise<string>} File content as text
 */
export function readFileAsText(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (e) => resolve(e.target.result);
		reader.onerror = (e) => reject(e);
		reader.readAsText(file);
	});
}

/**
 * Read file as Base64
 * @param {File} file - File object to read
 * @returns {Promise<string>} File content as Base64 string
 */
export function readFileAsBase64(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			// Extract base64 part from data:application/zip;base64,xxxxxxx
			const base64 = e.target.result.split(',')[1];
			resolve(base64);
		};
		reader.onerror = (e) => reject(e);
		reader.readAsDataURL(file);
	});
}

/**
 * Format XML with proper indentation
 * @param {string} xml - XML string to format
 * @returns {string} Formatted XML string
 */
export function formatXML(xml) {
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

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML string
 */
export function escapeHtml(text) {
	const map = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#039;'
	};
	return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Remove extra whitespace from HTML element
 * @param {HTMLElement} element - Element to process
 */
// export function removeExtraWhitespace(element) {
// 	const walk = document.createTreeWalker(
// 		element,
// 		NodeFilter.SHOW_TEXT,
// 		null,
// 		false
// 	);
//
// 	const nodesToModify = [];
// 	while (walk.nextNode()) {
// 		nodesToModify.push(walk.currentNode);
// 	}
//
// 	nodesToModify.forEach(node => {
// 		// Convert consecutive whitespace/newlines to single space
// 		// Exclude pre and textarea tags
// 		let parent = node.parentElement;
// 		let isPre = false;
// 		while (parent) {
// 			if (parent.tagName === 'PRE' || parent.tagName === 'TEXTAREA') {
// 				isPre = true;
// 				break;
// 			}
// 			parent = parent.parentElement;
// 		}
//
// 		if (!isPre) {
// 			// Convert consecutive whitespace/newlines/tabs to single space
// 			let text = node.nodeValue.replace(/[\s\n\r\t]+/g, ' ');
// 			// Trim leading/trailing spaces for first/last child
// 			if (node === node.parentElement.firstChild) {
// 				text = text.trimStart();
// 			}
// 			if (node === node.parentElement.lastChild) {
// 				text = text.trimEnd();
// 			}
// 			node.nodeValue = text;
// 		}
// 	});
// }

/**
 * Resize window (if function is available)
 * @param {number} width - Window width
 * @param {number} height - Window height
 */
export function resizeWindowIfAvailable(width, height) {
	if (typeof resizeWindow !== 'undefined') {
		resizeWindow(width, height);
	}
}
