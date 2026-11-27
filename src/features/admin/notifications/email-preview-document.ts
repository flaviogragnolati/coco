// Parse outside the active document so resource elements never attach to the admin page.
export function buildEmailPreviewDocument(html: string) {
	const parsed = document.implementation.createHTMLDocument("");
	parsed.documentElement.innerHTML = html;
	const body =
		parsed.body?.localName === "body"
			? parsed.body
			: parsed.createElement("body");
	const tags = new Set(
		"body main header footer section div span p a strong b em i small h1 h2 h3 ul ol li br hr table thead tbody tfoot tr td th".split(
			" ",
		),
	);
	const attrs = new Set(
		"style role align valign width height cellpadding cellspacing colspan rowspan bgcolor dir lang".split(
			" ",
		),
	);
	for (const element of [body, ...body.querySelectorAll("*")]) {
		if (
			element.namespaceURI !== "http://www.w3.org/1999/xhtml" ||
			!tags.has(element.localName)
		) {
			element.remove();
			continue;
		}
		for (const name of element.getAttributeNames()) {
			if (!attrs.has(name)) element.removeAttribute(name);
		}
	}
	const policy =
		"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'";
	return `<!doctype html><html lang="es-AR"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${policy}"><meta name="viewport" content="width=device-width, initial-scale=1"></head>${body.outerHTML}</html>`;
}
