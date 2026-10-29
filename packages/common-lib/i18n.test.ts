import { describe, expect, test } from "vite-plus/test";
import { resolveLocale, translate } from "./i18n";
import zhCN from "./locales/zh-CN.json";

describe("ApiCow interface language", () => {
  test("respects the saved choice and otherwise follows the primary system language", () => {
    expect(resolveLocale("en", ["zh-CN"])).toBe("en");
    expect(resolveLocale("zh-CN", ["en-US"])).toBe("zh-CN");
    expect(resolveLocale(null, ["zh-TW", "en"])).toBe("zh-CN");
    expect(resolveLocale("invalid", ["en-US", "zh-CN"])).toBe("en");
    expect(resolveLocale(null, [])).toBe("en");
  });
  test("switches UI copy without changing unknown protocol or plugin text", () => {
    expect(translate("zh-CN", "Send Request")).toBe("发送请求");
    expect(translate("en", "Send Request")).toBe("Send Request");
    expect(translate("zh-CN", "Content-Type")).toBe("Content-Type");
    expect(translate("zh-CN", "custom plugin message")).toBe("custom plugin message");
  });
  test("preserves user supplied values, including interpolation-like content", () => {
    expect(translate("zh-CN", "Delete {{p0}}", { p0: "Name {{p1}} <用户>" })).toBe(
      "删除 Name {{p1}} <用户>",
    );
  });
  test("every translated message retains its interpolation arguments", () => {
    for (const [source, translated] of Object.entries(zhCN)) {
      const tokens = (value: string) => value.match(/\{\{\w+\}\}/g)?.sort() ?? [];
      expect(tokens(translated), source).toEqual(tokens(source));
      expect(translated.trim().length, source).toBeGreaterThan(0);
    }
  });
});
