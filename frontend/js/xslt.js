/**
 * XSLT transformation functions
 */

/**
 * Apply XSLT transformation to XML
 * @param {string} xmlString - XML content as string
 * @param {string} xslString - XSL content as string
 * @returns {string} Transformed HTML string
 */
export function applyXSLT(xmlString, xslString) {
	const parser = new DOMParser();
	const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
	const xslDoc = parser.parseFromString(xslString, 'text/xml');

	// Create XSLT processor
	const xsltProcessor = new XSLTProcessor();
	xsltProcessor.importStylesheet(xslDoc);

	// Execute transformation
	const resultDoc = xsltProcessor.transformToFragment(xmlDoc, document);

	// Get result as HTML string
	const div = document.createElement('div');
	div.appendChild(resultDoc);

	return div.innerHTML;
}

