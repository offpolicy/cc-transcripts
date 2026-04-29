import { parseTranscript } from './parse.js';
import { renderMessages } from './render.js';

const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const viewer = document.getElementById('viewer');
const messagesEl = document.getElementById('messages');
const errorEl = document.getElementById('error');
const headerFile = document.getElementById('header-file');
const headerMeta = document.getElementById('header-meta');
const closeBtn = document.getElementById('close-btn');

function showError(msg) {
	errorEl.textContent = msg;
	errorEl.hidden = false;
}

function clearError() {
	errorEl.hidden = true;
	errorEl.textContent = '';
}

function showEmpty() {
	viewer.hidden = true;
	dropzone.hidden = false;
	messagesEl.replaceChildren();
	clearError();
}

function showViewer(filename, messages) {
	headerFile.textContent = filename;
	headerMeta.textContent = formatMeta(messages);
	renderMessages(messagesEl, messages);
	dropzone.hidden = true;
	viewer.hidden = false;
	clearError();
	window.scrollTo(0, 0);
}

function formatMeta(messages) {
	const n = messages.length;
	if (n === 0) return '0 messages';
	const first = messages[0].timestamp;
	const last = messages[n - 1].timestamp;
	const fmt = (iso) => {
		if (!iso) return '?';
		const d = new Date(iso);
		if (Number.isNaN(d.getTime())) return '?';
		return d.toLocaleString();
	};
	return `${n} messages · ${fmt(first)} → ${fmt(last)}`;
}

async function loadFile(file) {
	clearError();
	if (!file) return;
	if (!/\.jsonl$/i.test(file.name)) {
		showError(`Not a .jsonl file: ${file.name}`);
		return;
	}
	try {
		const text = await file.text();
		const messages = parseTranscript(text);
		if (messages.length === 0) {
			showError('No user/assistant messages found in this file.');
			return;
		}
		showViewer(file.name, messages);
	} catch (e) {
		showError(`Could not read file: ${e?.message ?? e}`);
	}
}

// ── File input ──────────────────────────────────────────────────
dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('keydown', (e) => {
	if (e.key === 'Enter' || e.key === ' ') {
		e.preventDefault();
		fileInput.click();
	}
});
fileInput.addEventListener('change', () => loadFile(fileInput.files?.[0]));

// ── Drag and drop on the whole window ───────────────────────────
let dragDepth = 0;
window.addEventListener('dragenter', (e) => {
	e.preventDefault();
	dragDepth++;
	document.body.classList.add('drag-over');
});
window.addEventListener('dragleave', (e) => {
	e.preventDefault();
	dragDepth = Math.max(0, dragDepth - 1);
	if (dragDepth === 0) document.body.classList.remove('drag-over');
});
window.addEventListener('dragover', (e) => {
	e.preventDefault();
	if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
});
window.addEventListener('drop', (e) => {
	e.preventDefault();
	dragDepth = 0;
	document.body.classList.remove('drag-over');
	const file = e.dataTransfer?.files?.[0];
	if (file) loadFile(file);
});

closeBtn.addEventListener('click', () => {
	fileInput.value = '';
	showEmpty();
});

showEmpty();
