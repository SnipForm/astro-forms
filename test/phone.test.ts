import { afterEach, beforeAll, describe, expect, it } from "vite-plus/test";
import { parsePhoneNumberFromString } from "libphonenumber-js/max";
import cases from "./fixtures/phone-cases.json" with { type: "json" };
import { checkPhone, loadPhoneParser, phoneReady, setPhoneParser } from "../src/client/phone.ts";
import { parseRuleAttr, validateField } from "../src/client/rules.ts";

describe("checkPhone matches SnipForm's server", () => {
  it.each(cases.cases.map((c) => [c.param ?? "(none)", c.value, c.valid, c] as const))(
    "phone[%s] %s -> %s",
    (_param, value, valid, c) => {
      const values = ("values" in c ? c.values : undefined) ?? {};
      expect(checkPhone(parsePhoneNumberFromString, value, c.param, "phone", values)).toBe(valid);
    },
  );
});

describe("phone in validateField", () => {
  const rule = (attr: string, message = "") => {
    const parsed = parseRuleAttr(`sf-validate:${attr}`, message);
    if (!parsed) throw new Error(attr);
    return parsed;
  };

  afterEach(() => setPhoneParser(null));

  it("is left to the server until the parser has loaded", () => {
    setPhoneParser(null);
    expect(validateField("phone", "asdf", [rule("phone")], {})).toBeNull();
  });

  describe("once loaded", () => {
    beforeAll(() => setPhoneParser(parsePhoneNumberFromString));

    it("fails with the custom or default message", () => {
      setPhoneParser(parsePhoneNumberFromString);
      expect(
        validateField("phone", "0821234567", [rule("phone", "Add your country code")], {}),
      ).toBe("Add your country code");
      expect(validateField("mobile_phone", "asdf", [rule("phone")], {})).toBe(
        "The mobile phone field must be a valid phone number.",
      );
    });

    it("passes valid numbers and empty optional fields", () => {
      setPhoneParser(parsePhoneNumberFromString);
      expect(validateField("phone", "+27 82 123 4567", [rule("phone")], {})).toBeNull();
      expect(validateField("phone", "", [rule("phone")], {})).toBeNull();
      expect(validateField("phone", "082 123 4567", [rule("phone[za]")], {})).toBeNull();
    });

    it("reads the country from <field>_country", () => {
      setPhoneParser(parsePhoneNumberFromString);
      expect(
        validateField("phone", "020 7946 0958", [rule("phone")], { phone_country: "GB" }),
      ).toBeNull();
    });
  });
});

describe("loadPhoneParser", () => {
  it("loads libphonenumber-js on demand", async () => {
    setPhoneParser(null);
    expect(phoneReady()).toBe(false);
    expect(await loadPhoneParser()).toBeTypeOf("function");
    expect(phoneReady()).toBe(true);
  });
});
