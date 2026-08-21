const CHALLENGE_PATTERN = /(?:captcha|verify you are human|checking your browser|access denied|request blocked|attention required|cloudflare ray id)/i;
const LOGIN_PATTERN = /(?:^|\b)(?:sign in|log in|login required|authentication required)(?:\b|$)/i;

function pageExtractionRuntime() {
    const source = document.querySelector("main, article, [role='main']") || document.body;
    if (!source) return {title: document.title || "", final_url: location.href, markdown: "", signals: {headings: 0, links: 0, tables: 0}};
    const root = source.cloneNode(true);
    root.querySelectorAll("script, style, noscript, template, nav, footer, aside, form, button, input, select, textarea, dialog, iframe, object, embed, canvas, svg").forEach(node => node.remove());
    const clean = value => String(value || "").replace(/\s+/g, " ").trim();
    const escapeText = value => clean(value).replace(/([\\`*_[\]<>])/g, "\\$1");
    const safeUrl = value => { try { const u = new URL(value, location.href); return /^https?:$/.test(u.protocol) ? u.href : null; } catch { return null; } };
    const renderTable = table => {
      const rows = [...table.querySelectorAll("tr")].map(row => [...row.querySelectorAll(":scope > th, :scope > td")].map(cell => clean(cell.textContent).replace(/\\/g, "\\\\").replace(/\|/g, "\\|")));
      if (!rows.length || !rows.some(row => row.length)) return "";
      const width = Math.max(...rows.map(row => row.length));
      const normalized = rows.map(row => [...row, ...Array(Math.max(0, width - row.length)).fill("")]);
      const header = normalized[0];
      return `| ${header.join(" | ")} |\n| ${header.map(() => "---").join(" | ")} |\n${normalized.slice(1).map(row => `| ${row.join(" | ")} |`).join("\n")}\n\n`;
    };
    const render = (node, depth = 0) => {
      if (node.nodeType === Node.TEXT_NODE) return escapeText(node.nodeValue);
      if (node.nodeType !== Node.ELEMENT_NODE) return "";
      const tag = node.tagName.toLowerCase();
      if (tag === "table") return renderTable(node);
      const children = () => [...node.childNodes].map(child => render(child, depth)).filter(Boolean).join(" ").replace(/\s+([,.;:!?])/g, "$1").trim();
      if (/^h[1-6]$/.test(tag)) return `${"#".repeat(Number(tag[1]))} ${children()}\n\n`;
      if (tag === "p") return `${children()}\n\n`;
      if (tag === "br") return "  \n";
      if (tag === "strong" || tag === "b") return `**${children()}**`;
      if (tag === "em" || tag === "i") return `*${children()}*`;
      if (tag === "code" && node.parentElement?.tagName.toLowerCase() !== "pre") return "`" + clean(node.textContent) + "`";
      if (tag === "pre") { const value = String(node.textContent || "").trim(); const longest = Math.max(0, ...[...value.matchAll(/`+/g)].map(match => match[0].length)); const fence = "`".repeat(Math.max(3, longest + 1)); return `${fence}\n${value}\n${fence}\n\n`; }
      if (tag === "blockquote") return `${clean(node.textContent).split(/\r?\n/).map(line => `> ${line}`).join("\n")}\n\n`;
      if (tag === "a") { const label = children() || clean(node.textContent); const href = safeUrl(node.getAttribute("href")); return href && label ? `[${label}](${href})` : label; }
      if (tag === "img") { const src = safeUrl(node.getAttribute("src")); const alt = escapeText(node.getAttribute("alt") || "image"); return src ? `![${alt}](${src})` : alt; }
      if (tag === "li") { const prefix = node.parentElement?.tagName.toLowerCase() === "ol" ? `${[...node.parentElement.children].indexOf(node) + 1}.` : "-"; return `${"  ".repeat(depth)}${prefix} ${[...node.childNodes].map(child => render(child, depth + 1)).join(" ").trim()}\n`; }
      if (tag === "ul" || tag === "ol") return `${[...node.children].map(child => render(child, depth)).join("")}\n`;
      const content = children();
      return new Set(["div", "section", "article", "main", "header", "figure", "figcaption", "dl", "dt", "dd", "hr"]).has(tag) ? `${content}\n\n` : content;
    };
    const markdown = render(root).replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    return {
      title: clean(document.title),
      final_url: location.href,
      markdown,
      signals: {
        headings: root.querySelectorAll("h1, h2, h3, h4, h5, h6").length,
        links: root.querySelectorAll("a[href]").length,
        tables: root.querySelectorAll("table").length,
        source_selector: source.matches("main") ? "main" : source.matches("article") ? "article" : source.matches("[role='main']") ? "role-main" : "body"
      }
    };
}

export function buildExtractionExpression() {
  return `(${pageExtractionRuntime.toString()})()`;
}

export function validateExtracted(extracted, status) {
  const errors = [];
  const warnings = [];
  const markdown = typeof extracted?.markdown === "string" ? extracted.markdown.trim() : "";
  const title = typeof extracted?.title === "string" ? extracted.title.trim() : "";
  if (!Number.isFinite(status) || status < 200 || status >= 400) errors.push(`document status is not successful (${status ?? "unknown"})`);
  if (markdown.length < 80) errors.push("extracted Markdown is empty or too short to establish meaningful content");
  if (CHALLENGE_PATTERN.test(`${title}\n${markdown.slice(0, 2000)}`)) errors.push("page appears to be a challenge or access-denied response");
  if (LOGIN_PATTERN.test(`${title}\n${markdown.slice(0, 1000)}`)) errors.push("page appears to require authentication");
  if (!title) warnings.push("page title is missing");
  if (!extracted?.signals?.headings) warnings.push("no headings were observed in the selected content root");
  return {
    valid: errors.length === 0,
    category: errors.some((item) => /challenge|authentication/.test(item)) ? "content-quality" : "extraction",
    errors,
    warnings,
    checks: {
      http_status: Number.isFinite(status) && status >= 200 && status < 400 ? "passed" : "failed",
      utf8_nonempty: markdown.length >= 80 ? "passed" : "failed",
      challenge_or_login: errors.some((item) => /challenge|authentication/.test(item)) ? "failed" : "passed",
      title: title ? "passed" : "warning",
      headings: extracted?.signals?.headings ? "passed" : "warning",
      links: Number(extracted?.signals?.links || 0),
      tables: Number(extracted?.signals?.tables || 0),
      source_selector: extracted?.signals?.source_selector || "unknown"
    }
  };
}
