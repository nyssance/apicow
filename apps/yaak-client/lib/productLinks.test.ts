import { describe, expect, test } from "vitest";
import { isUpstreamProductUrl, productLinks, releaseNotesUrl } from "./productLinks";

describe("ApiCow product navigation", () => {
  test.each(["0.1.5", "v0.1.5"])("opens the matching app release for %s", (version) => {
    expect(releaseNotesUrl(version)).toBe("https://github.com/nyssance/apicow/releases/tag/v0.1.5");
  });
  test("keeps update notes on the offered prerelease version", () => {
    expect(releaseNotesUrl("0.2.0-beta.1")).toBe(
      "https://github.com/nyssance/apicow/releases/tag/v0.2.0-beta.1",
    );
  });
  test.each(["0.0.0", "dev", "", "../releases"])(
    "uses the release list for an unpublished build: %s",
    (version) => {
      expect(releaseNotesUrl(version)).toBe(productLinks.releases);
    },
  );
  test("feedback and downloads belong to the independent repository", () => {
    expect(productLinks.feedback).toBe("https://github.com/nyssance/apicow/issues/new");
    expect(productLinks.download).toBe("https://github.com/nyssance/apicow/releases/latest");
  });
});

describe("retired product links supplied by plugins", () => {
  test.each([
    "https://yaak.run",
    "https://yaak.app/docs/cli",
    "https://feedback.yaak.app/topic",
    "https://oauth.yaak.app/redirect",
    "https://YAAK.APP./dashboard",
    "https://github.com/mountain-loop/yaak/tree/main/plugins/auth-basic",
    "https://github.com/yaakapp/example",
  ])("removes navigation to %s", (url) => expect(isUpstreamProductUrl(url)).toBe(true));
  test.each([
    productLinks.feedback,
    "https://example.com/?next=https://yaak.app",
    "https://yaak.app.example.com",
    "https://yaak.app@example.com",
    "https://github.com/mountain-loop/yaak-other",
    "invalid",
  ])("does not misclassify %s", (url) => expect(isUpstreamProductUrl(url)).toBe(false));
});
