import { describe, expect, test } from "vitest";
import { productLinks, releaseNotesUrl } from "./productLinks";

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
