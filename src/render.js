// Renders Message[] into the DOM. Ports c9hub MessageBubble.svelte.

import { renderMarkdown } from './markdown.js';

const ROLE_LABEL = {
	User: 'You',
	Assistant: 'Claude',
	Thinking: 'Thinking',
	ToolUse: 'Tool',
	ToolResult: 'Result',
};

const ROLE_ICON = {
	User: '→',     // →
	Assistant: '◆', // ◆
	Thinking: '◇',  // ◇
	ToolUse: '⚙',   // ⚙
	ToolResult: '↩', // ↩
};

const TYPE_CLASS = {
	User: 'user',
	Assistant: 'assistant',
	Thinking: 'thinking',
	ToolUse: 'tool-use',
	ToolResult: 'tool-result',
};

export function renderMessages(container, messages) {
	const frag = document.createDocumentFragment();
	for (const m of messages) frag.appendChild(renderMessage(m));
	container.replaceChildren(frag);
}

function renderMessage(message) {
	const wrapper = document.createElement('div');
	wrapper.className = `message-bubble ${TYPE_CLASS[message.messageType] ?? ''}`;

	wrapper.appendChild(renderHeader(message));

	if (message.images?.length) {
		const imgs = document.createElement('div');
		imgs.className = 'message-images';
		for (const img of message.images) {
			const el = document.createElement('img');
			el.className = 'attached-image';
			el.loading = 'lazy';
			el.decoding = 'async';
			el.alt = 'Attached screenshot';
			el.src = `data:${img.mediaType};base64,${img.data}`;
			imgs.appendChild(el);
		}
		wrapper.appendChild(imgs);
	}

	if (message.content) {
		const body = document.createElement('div');
		body.className = 'message-content';
		const t = message.messageType;
		if (t === 'User' || t === 'Assistant') {
			body.innerHTML = renderMarkdown(message.content);
		} else {
			body.textContent = message.content;
		}
		wrapper.appendChild(body);
	}

	return wrapper;
}

function renderHeader(message) {
	const header = document.createElement('div');
	header.className = 'message-header';

	const icon = document.createElement('span');
	icon.className = 'message-icon';
	icon.textContent = ROLE_ICON[message.messageType] ?? '•';

	const role = document.createElement('span');
	role.className = 'message-role';
	role.textContent = ROLE_LABEL[message.messageType] ?? 'Unknown';

	const time = document.createElement('span');
	time.className = 'message-time';
	time.textContent = formatTime(message.timestamp);

	header.append(icon, role, time);
	return header;
}

function formatTime(iso) {
	if (!iso) return '';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return '';
	return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}
