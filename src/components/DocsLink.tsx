import type { ComponentProps } from "react";

import { DOCS_VISIT_STORAGE_KEY } from "@/hooks/use-reload-home-after-docs-back";

type DocsLinkProps = Omit<ComponentProps<"a">, "href"> & {
  href?: string;
};

/**
 * Link to `/docs/` (Docusaurus). Uses a native `<a>` so Next.js does not
 * client-navigate — proxied/static docs are outside the App Router, and
 * `<Link>` breaks the back button (blank home after browser back).
 */
export function DocsLink({
  href = "/docs/",
  children,
  ...rest
}: DocsLinkProps) {
  return (
    <a
      href={href}
      {...rest}
      onClick={(event) => {
        rest.onClick?.(event);
        if (!event.defaultPrevented) {
          event.preventDefault();
          sessionStorage.setItem(DOCS_VISIT_STORAGE_KEY, "1");
          window.location.assign(href);
        }
      }}
    >
      {children}
    </a>
  );
}
