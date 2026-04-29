// Parse a Claude Code transcript JSONL file into a flat list of Messages.
// Ports c9hub server/src/session/parser.rs::extract_messages to JS.

/**
 * @typedef {{ mediaType: string, data: string }} ImageBlock
 * @typedef {'User'|'Assistant'|'Thinking'|'ToolUse'|'ToolResult'} MessageType
 * @typedef {{ timestamp: string, messageType: MessageType, content: string, images: ImageBlock[] }} Message
 */

export function parseTranscript(text) {
	const entries = [];
	for (const line of text.split('\n')) {
		const trimmed = line.trim();
		if (!trimmed) continue;
		try {
			entries.push(JSON.parse(trimmed));
		} catch {
			// Live-written transcripts can have a trailing partial line; ignore.
		}
	}
	return extractMessages(entries);
}

/** @returns {Message[]} */
function extractMessages(entries) {
	const out = [];
	for (const entry of entries) {
		if (entry?.isSidechain === true) continue;

		if (entry?.type === 'user' && entry.message) {
			const { content, isToolResult, images } = readUserContent(entry.message.content);
			out.push({
				timestamp: entry.timestamp ?? '',
				messageType: isToolResult ? 'ToolResult' : 'User',
				content,
				images: isToolResult ? [] : images,
			});
			continue;
		}

		if (entry?.type === 'assistant' && Array.isArray(entry.message?.content)) {
			for (const block of entry.message.content) {
				const msg = assistantBlockToMessage(block, entry.timestamp ?? '');
				if (msg) out.push(msg);
			}
			continue;
		}

		// system, progress, file-history-snapshot, custom-title, agent-name,
		// last-prompt, summary, unknown — skip silently.
	}
	return out;
}

function readUserContent(content) {
	if (typeof content === 'string') {
		return { content, isToolResult: false, images: [] };
	}
	if (!Array.isArray(content)) {
		return { content: '', isToolResult: false, images: [] };
	}

	const parts = [];
	const images = [];
	let hasToolResult = false;

	for (const item of content) {
		switch (item?.type) {
			case 'tool_result': {
				hasToolResult = true;
				const inner = item.content;
				if (typeof inner === 'string') {
					parts.push(inner);
				} else if (Array.isArray(inner)) {
					for (const b of inner) {
						if (typeof b?.text === 'string') parts.push(b.text);
					}
				}
				break;
			}
			case 'text': {
				if (typeof item.text === 'string') parts.push(item.text);
				break;
			}
			case 'image': {
				const src = item.source ?? {};
				if (typeof src.data === 'string') {
					images.push({
						mediaType: src.media_type ?? 'image/png',
						data: src.data,
					});
				}
				break;
			}
		}
	}

	let text;
	if (parts.length === 0 && !hasToolResult) text = '';
	else if (parts.length === 0) text = '[tool result]';
	else text = parts.join('\n');

	return { content: text, isToolResult: hasToolResult, images };
}

function assistantBlockToMessage(block, timestamp) {
	if (!block || typeof block !== 'object') return null;
	switch (block.type) {
		case 'text':
			return { timestamp, messageType: 'Assistant', content: block.text ?? '', images: [] };
		case 'thinking':
			return { timestamp, messageType: 'Thinking', content: block.thinking ?? '', images: [] };
		case 'tool_use': {
			const input = JSON.stringify(block.input ?? {}, null, 2);
			return {
				timestamp,
				messageType: 'ToolUse',
				content: `[${block.name ?? '?'}] ${block.id ?? '?'} - ${input}`,
				images: [],
			};
		}
		case 'tool_result': {
			const tag = block.is_error ? 'Error' : 'Result';
			return {
				timestamp,
				messageType: 'ToolResult',
				content: `[${tag}] ${block.tool_use_id ?? '?'}: ${block.content ?? ''}`,
				images: [],
			};
		}
		default:
			return null;
	}
}
