// Markdown renderer with custom code-block wrapper, ported from
// c9hub src/lib/utils/formatting.ts.

import { marked } from '../vendor/marked.js';
import DOMPurify from '../vendor/dompurify.js';

const renderer = new marked.Renderer();
renderer.code = function ({ text, lang }) {
	const language = lang || 'code';
	const safeLang = escapeAttr(language);
	const escaped = escapeHtml(text);
	return `
		<div class="code-block-wrapper">
			<div class="code-header">
				<span class="code-lang">${safeLang}</span>
				<div class="code-actions">
					<span class="code-dot"></span>
					<span class="code-dot"></span>
				</div>
			</div>
			<pre><code class="language-${safeLang}">${escaped}</code></pre>
		</div>
	`;
};

const cache = new Map();

export function renderMarkdown(content) {
	const cached = cache.get(content);
	if (cached !== undefined) return cached;

	const raw = marked.parse(content, {
		async: false,
		breaks: true,
		gfm: true,
		renderer,
	});
	const result = DOMPurify.sanitize(raw);

	if (cache.size > 2000) {
		const firstKey = cache.keys().next().value;
		if (firstKey !== undefined) cache.delete(firstKey);
	}
	cache.set(content, result);
	return result;
}

function escapeHtml(s) {
	return String(s)
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;');
}

function escapeAttr(s) {
	return escapeHtml(s).replaceAll('"', '&quot;');
}
