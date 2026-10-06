import type { QuotedEmailToggleProps } from "./quoted-email-toggle-types";
import { EmailHtmlRenderer } from "./email-html-renderer";

export function QuotedEmailToggle({ html }: QuotedEmailToggleProps) {
	return (
		<details className="email-quote-toggle">
			<summary aria-label="Toggle quoted email" title="Show or hide quoted email" />
			<EmailHtmlRenderer html={html} preserveLeadingQuote />
		</details>
	);
}
