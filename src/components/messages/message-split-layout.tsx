"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSidebar } from "@/components/sidebar-state";
import { useAssistantOpen } from "@/components/agent/assistant-open-state";
import { readColumnWidth, saveColumnWidth } from "@/components/column-width-preferences";
import { ResizeHandle } from "@/components/ui/resize-handle";
import { BulkMessageSelectionPane } from "./bulk-message-selection-pane";
import { MessageFolderPage } from "./message-folder-page";
import { MessageListVisibilityContext } from "./message-list-visibility";
import type { MessageSplitLayoutProps, SelectedMessage } from "./types";

export function MessageSplitLayout({
	children,
	config,
}: MessageSplitLayoutProps) {
	const pathname = usePathname();
	const [selectedMessages, setSelectedMessages] = useState<SelectedMessage[]>([]);
	const [listWidth, setListWidth] = useState(360);
	const [containerWidth, setContainerWidth] = useState(0);
	const [listVisibilityOverride, setListVisibilityOverride] = useState<{ assistantOpen: boolean; visible: boolean } | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const startWidth = useRef(listWidth);
	const resizedWidth = useRef(listWidth);
	const { userId, setForcedMinimal } = useSidebar();
	const assistantOpen = useAssistantOpen();
	const listVisible = listVisibilityOverride?.assistantOpen === assistantOpen ? listVisibilityOverride.visible : !assistantOpen;
	const detailPrefix = `${config.hrefPrefix}/`;
	const selectedMessageId = pathname.startsWith(detailPrefix)
		? pathname.slice(detailPrefix.length).split("/")[0]
		: undefined;
	const renderedListWidth = Math.max(250, Math.min(listWidth, (containerWidth || 1000) - 280));

	useEffect(() => {
		if (userId) setListWidth(readColumnWidth(userId, "message-list", 360, 250, 1200));
	}, [userId]);

	useEffect(() => {
		if (!selectedMessageId) {
			setForcedMinimal(false);
			return;
		}
		const container = containerRef.current;
		if (!container) return;
		const observer = new ResizeObserver(() => setContainerWidth(container.clientWidth));
		observer.observe(container);
		return () => observer.disconnect();
	}, [selectedMessageId, setForcedMinimal]);

	useEffect(() => () => setForcedMinimal(false), [setForcedMinimal]);
	useLayoutEffect(() => setListVisibilityOverride(null), [assistantOpen]);

	if (!selectedMessageId) return children;

	return (
		<div ref={containerRef} className="h-full min-h-0 overflow-hidden lg:grid lg:transition-[grid-template-columns] lg:duration-300 lg:ease-in-out motion-reduce:transition-none" style={{ gridTemplateColumns: `${listVisible ? renderedListWidth : 0}px minmax(0,1fr)` }}>
			<aside className={`relative hidden min-h-0 min-w-0 overflow-hidden bg-white lg:block ${listVisible ? "border-r border-neutral-200" : "pointer-events-none"}`} aria-hidden={!listVisible} inert={!listVisible}>
				<div className={`h-full overflow-hidden transition-transform duration-300 ease-in-out motion-reduce:transition-none ${listVisible ? "translate-x-0" : "-translate-x-full"}`} style={{ width: renderedListWidth }}>
				<MessageFolderPage
					config={config}
					compact
					selectedMessageId={selectedMessageId}
					selection={{ selectedMessages, setSelectedMessages }}
				/>
				</div>
				<ResizeHandle
					label="Resize message list"
					onResizeStart={() => { startWidth.current = listWidth; resizedWidth.current = listWidth; }}
					onResize={(delta) => {
						const requestedWidth = startWidth.current + delta;
						setForcedMinimal(requestedWidth < 250);
						resizedWidth.current = Math.max(250, Math.min(requestedWidth, Math.max(250, (containerRef.current?.clientWidth ?? 1000) - 280)));
						setListWidth(resizedWidth.current);
					}}
					onResizeEnd={() => saveColumnWidth(userId, "message-list", resizedWidth.current)}
				/>
			</aside>
			<MessageListVisibilityContext.Provider value={{ visible: listVisible, toggle: () => setListVisibilityOverride({ assistantOpen, visible: !listVisible }) }}>
			<section className="min-h-0 min-w-0 overflow-hidden bg-white">
				{selectedMessages.length > 0 ? (
					<BulkMessageSelectionPane
						selectedMessages={selectedMessages}
						onClearSelection={() => setSelectedMessages([])}
					/>
				) : (
					children
				)}
			</section>
			</MessageListVisibilityContext.Provider>
		</div>
	);
}
