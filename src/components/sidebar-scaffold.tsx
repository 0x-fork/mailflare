import type { SidebarScaffoldProps } from "./sidebar-state-types";
import { cn } from "@/lib/utils";

// Header and footer stay put; only the middle scrolls. The padding inside the scroller
// matches the mask's fade length, so nothing looks faded until content actually scrolls under it.
export function SidebarScaffold({ header, footer, children, className }: SidebarScaffoldProps) {
	return (
		<nav className={cn("flex h-full min-h-0 flex-col", className)}>
			<div className="shrink-0">{header}</div>
			<div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain py-3 [scrollbar-gutter:stable] [mask-image:linear-gradient(to_bottom,transparent,black_12px,black_calc(100%-12px),transparent)]">
				{children}
			</div>
			{footer && <div className="shrink-0">{footer}</div>}
		</nav>
	);
}
