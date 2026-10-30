import { isUpstreamProductUrl, productLinks } from "../../lib/productLinks";
import { t } from "@yaakapp-internal/lib/i18n";
import { Link as RouterLink } from "@tanstack/react-router";
import { platform } from "@yaakapp-internal/platform";
import classNames from "classnames";
import type { HTMLAttributes } from "react";
import { Icon } from "@yaakapp-internal/ui";

interface Props extends HTMLAttributes<HTMLAnchorElement> {
  href: string;
  noUnderline?: boolean;
}

export function Link({ href, children, noUnderline, className, ...other }: Props) {
  if (isUpstreamProductUrl(href)) return <span className={className}>{children}</span>;

  const isExternal = href.match(/^https?:\/\//);

  className = classNames(
    className,
    "relative",
    "inline-flex items-center hover:underline group",
    !noUnderline && "underline",
  );

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => {
          e.preventDefault();
          void platform.openUrl(href);
        }}
        className={className}
        {...other}
      >
        <span className="pr-5">{children}</span>
        <Icon
          className="inline absolute right-0.5 top-[0.3em] opacity-70 group-hover:opacity-100"
          size="xs"
          icon="external_link"
        />
      </a>
    );
  }

  return (
    <RouterLink to={href} className={className} {...other}>
      {children}
    </RouterLink>
  );
}

export function FeedbackLink() {
  return <Link href={productLinks.feedback}>{t("Feedback")}</Link>;
}
