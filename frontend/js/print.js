/**
 * Print functionality
 */

import { PRINT_CONFIG } from './constants.js';

/**
 * Handle print for iframe content
 * @param {string} currentXMLContent - Current XML content
 * @param {Object} elements - DOM elements object
 */
export function handlePrint(currentXMLContent, elements) {
	// Try iframe printing first
	const iframe = document.getElementById('xml-content-frame');
	if (iframe) {
		// Wait a bit to ensure iframe is fully loaded
		setTimeout(() => {
			try {
				if (iframe.contentWindow) {
					printIframeContent(iframe, currentXMLContent);
				} else {
					throw new Error('iframe contentWindow not available');
				}
			} catch (error) {
				// Fallback to normal print
				alert('印刷機能でエラーが発生しました。通常の印刷を試行します。');
				printNormalContent(currentXMLContent, elements);
			}
		}, 100);
		return;
	}

	// Fallback: Normal print for non-iframe content
	printNormalContent(currentXMLContent, elements);
}

/**
 * Print iframe content
 * @param {HTMLIFrameElement} iframe - Iframe element
 * @param {string} currentXMLContent - Current XML content
 */
function printIframeContent(iframe, currentXMLContent) {
	// Check for DOC VERSION tag
	const hasDocVersion = currentXMLContent && currentXMLContent.includes(PRINT_CONFIG.DOC_VERSION_TAG);

	// Get iframe content size
	const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

	// Check if we can access iframe content
	if (!iframeDoc || !iframeDoc.body) {
		throw new Error('Cannot access iframe content');
	}

	// Get actual content size (body is inline-block, so it wraps content size)
	const contentWidth = iframeDoc.body.scrollWidth;
	const contentHeight = iframeDoc.body.scrollHeight;

	// Determine orientation: DOC VERSION files are always portrait, others depend on aspect ratio
	const orientation = hasDocVersion ? 'portrait' : (contentWidth > contentHeight ? 'landscape' : 'portrait');

	// Add print style to iframe
	const existingStyle = iframeDoc.getElementById('print-orientation-style');
	if (existingStyle) {
		existingStyle.remove();
	}

	const style = iframeDoc.createElement('style');
	style.id = 'print-orientation-style';

	if (hasDocVersion) {
		// DOC VERSION files: A4 portrait with margins, no scaling, no centering
		style.textContent = `
			@media print {
				@page {
					size: A4 portrait;
					margin: ${PRINT_CONFIG.MARGIN_MM}mm;
				}
				html, body {
					margin: 0;
					padding: 0;
				}
			}
		`;
	} else {
		// Other files: calculate scale and center
		const marginMM = 0;
		const a4WidthMM = orientation === 'portrait'
			? PRINT_CONFIG.A4_WIDTH_MM - marginMM
			: PRINT_CONFIG.A4_HEIGHT_MM - marginMM;
		const a4HeightMM = orientation === 'portrait'
			? PRINT_CONFIG.A4_HEIGHT_MM - marginMM
			: PRINT_CONFIG.A4_WIDTH_MM - marginMM;

		// Convert mm to px
		const a4WidthPx = a4WidthMM * PRINT_CONFIG.MM_TO_PX;
		const a4HeightPx = a4HeightMM * PRINT_CONFIG.MM_TO_PX;

		// Calculate scale
		const scaleX = a4WidthPx / contentWidth;
		const scaleY = a4HeightPx / contentHeight;
		const scale = Math.min(scaleX, scaleY, 1); // Max 1 (no upscaling)

		style.textContent = `
			@media print {
				@page {
					size: A4 ${orientation};
					margin: 0;
				}
				html, body {
					margin: 0;
					padding: 0;
					width: 100%;
					height: 100%;
					overflow: hidden;
					display: flex;
					justify-content: center;
					align-items: center;
				}
				body > *:first-child {
					transform: scale(${scale});
					transform-origin: center center;
					width: ${contentWidth}px;
					height: ${contentHeight}px;
					flex-shrink: 0;
				}
			}
		`;
	}
	iframeDoc.head.appendChild(style);

	// Show print dialog
	iframe.contentWindow.print();

	// Remove style after printing
	setTimeout(() => {
		if (style.parentNode) {
			style.remove();
		}
	}, 1000);
}

/**
 * Print normal content (fallback)
 * @param {string} currentXMLContent - Current XML content
 * @param {Object} elements - DOM elements object
 */
function printNormalContent(currentXMLContent, elements) {
	const hasDocVersion = currentXMLContent && currentXMLContent.includes(PRINT_CONFIG.DOC_VERSION_TAG);

	// Get actual content size from iframe's body
	let contentWidth, contentHeight;
	const iframe = document.getElementById('xml-content-frame');
	if (iframe && iframe.contentDocument) {
		const iframeBody = iframe.contentDocument.body;
		contentWidth = iframeBody.scrollWidth;
		contentHeight = iframeBody.scrollHeight;
	} else {
		// Fallback for non-iframe content
		contentWidth = elements.xmlViewer.scrollWidth;
		contentHeight = elements.xmlViewer.scrollHeight;
	}

	// Remove existing print style
	const existingStyle = document.getElementById('print-orientation-style');
	if (existingStyle) {
		existingStyle.remove();
	}

	// Determine orientation: DOC VERSION files are always portrait, others depend on aspect ratio
	const orientation = hasDocVersion ? 'portrait' : (contentWidth > contentHeight ? 'landscape' : 'portrait');

	// Add print style
	const style = document.createElement('style');
	style.id = 'print-orientation-style';

	if (hasDocVersion) {
		// DOC VERSION files: A4 portrait with margins, no scaling, no centering
		style.textContent = `
			@media print {
				@page {
					size: A4 portrait;
					margin: ${PRINT_CONFIG.MARGIN_MM}mm;
				}
			}
		`;
	} else {
		// Other files: calculate scale and center
		const marginMM = 0;
		const a4WidthMM = orientation === 'portrait'
			? PRINT_CONFIG.A4_WIDTH_MM - marginMM
			: PRINT_CONFIG.A4_HEIGHT_MM - marginMM;
		const a4HeightMM = orientation === 'portrait'
			? PRINT_CONFIG.A4_HEIGHT_MM - marginMM
			: PRINT_CONFIG.A4_WIDTH_MM - marginMM;

		// Convert to px
		const a4WidthPx = a4WidthMM * PRINT_CONFIG.MM_TO_PX;
		const a4HeightPx = a4HeightMM * PRINT_CONFIG.MM_TO_PX;

		// Calculate scale
		const scaleX = a4WidthPx / contentWidth;
		const scaleY = a4HeightPx / contentHeight;
		const scale = Math.min(scaleX, scaleY, 1);

		style.textContent = `
			@media print {
				@page {
					size: A4 ${orientation};
					margin: 0;
				}
				.xml-viewer {
					display: flex !important;
					justify-content: center;
					align-items: center;
					width: 100%;
					height: 100%;
				}
				.xml-viewer > *:first-child {
					transform: scale(${scale});
					transform-origin: center center;
					width: ${contentWidth}px;
					height: ${contentHeight}px;
					flex-shrink: 0;
				}
			}
		`;
	}
	document.head.appendChild(style);

	// Print
	window.print();

	// Remove style after printing
	setTimeout(() => {
		if (style.parentNode) {
			style.remove();
		}
	}, 1000);
}
