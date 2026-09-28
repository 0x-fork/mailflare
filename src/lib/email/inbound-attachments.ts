import {
	MAX_ATTACHMENT_COUNT,
	MAX_ATTACHMENT_SIZE,
	MAX_TOTAL_ATTACHMENT_SIZE,
} from "@/lib/email/attachments";
import type { AttachmentContent } from "@/lib/email/attachment-types";

export function selectInboundAttachments(attachments: AttachmentContent[]): AttachmentContent[] {
	const selected: AttachmentContent[] = [];
	let totalSize = 0;
	for (const attachment of attachments) {
		const size = attachment.content.byteLength;
		if (selected.length >= MAX_ATTACHMENT_COUNT) break;
		if (size > MAX_ATTACHMENT_SIZE || totalSize + size > MAX_TOTAL_ATTACHMENT_SIZE) continue;
		selected.push(attachment);
		totalSize += size;
	}
	return selected;
}
