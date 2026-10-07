import { cookies } from "next/headers";
import { LOCALE_COOKIE, createTranslator, resolveLocale } from "./utils";

// For server components and route handlers; client components use `useLanguage()`.
export async function getServerTranslator() {
	return createTranslator(resolveLocale((await cookies()).get(LOCALE_COOKIE)?.value));
}
