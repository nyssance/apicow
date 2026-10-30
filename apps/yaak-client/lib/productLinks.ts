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
