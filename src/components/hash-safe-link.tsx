import Link from "next/link";
import type { ComponentProps } from "react";

type HashSafeLinkProps = Omit<ComponentProps<"a">, "href"> & { href: string };

/**
 * Renders hrefs with a fragment ("#ofertas", "/#ofertas") as a native anchor
 * and every other href as a Next `<Link>`.
 *
 * Next 16.2's router stores the fragment in its route cache when it navigates
 * to a route it had not prefetched, and every later `<Link>` to that route
 * appends its own fragment to the cached one ("/#ofertas#ofertas"). A native
 * anchor scrolls within the page without going through the router, and from
 * another page it loads the target fresh.
 */
export function HashSafeLink({ href, ...props }: HashSafeLinkProps) {
	if (href.includes("#")) {
		return <a href={href} {...props} />;
	}
	return <Link href={href} {...props} />;
}
