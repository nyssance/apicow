const repository = "https://github.com/nyssance/apicow";

export const productLinks = {
  repository,
  releases: `${repository}/releases`,
  download: `${repository}/releases/latest`,
  feedback: `${repository}/issues/new`,
};

export function releaseNotesUrl(version: string): string {
  const normalized = version.replace(/^v/, "");
  if (normalized === "0.0.0" || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(normalized)) {
    return productLinks.releases;
  }
  return `${productLinks.releases}/tag/v${normalized}`;
}

/** Applies to product/help navigation, not the user's API request destinations. */
export function isUpstreamProductUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    return (
      host === "yaak.run" ||
      host.endsWith(".yaak.run") ||
      host === "yaak.app" ||
      host.endsWith(".yaak.app") ||
      (host === "github.com" && /^\/(?:mountain-loop\/yaak|yaakapp)(?:\/|$)/i.test(url.pathname))
    );
  } catch {
    return false;
  }
}
