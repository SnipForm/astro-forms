// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { phoneSettled } from "../src/client/phone.ts";
import { initClientValidation } from "../src/client/runtime.ts";

/**
 * `phone` needs libphonenumber-js, which loads on demand. A submit that
 * arrives before it has loaded is held, then sent again once it has.
 * Its own file: the loaded parser is module state.
 */
function mountForm(fieldsHtml: string): HTMLFormElement {
  document.body.innerHTML = `<snip-form><form action="https://snipform.io">${fieldsHtml}</form></snip-form>`;
  const form = document.querySelector("form");
  if (!form) throw new Error("form not mounted");
  return form;
}

initClientValidation();

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("phone rule", () => {
  it("holds the first submit until the phone data has loaded, then checks it", async () => {
    expect(phoneSettled()).toBe(false);
    const form = mountForm(`
      <input name="phone" value="0821234567" sf-validate:phone="Add your country code" />
      <span if-error="phone" then-show-text else-hide style="display:none"></span>
    `);
    const snipformHandler = vi.fn((e: Event) => e.preventDefault());
    form.addEventListener("submit", snipformHandler, false);

    const event = new Event("submit", { bubbles: true, cancelable: true });
    form.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    await vi.waitFor(() =>
      expect(document.querySelector("span")?.textContent).toBe("Add your country code"),
    );
    expect(snipformHandler).not.toHaveBeenCalled();
  });

  it("lets a valid number through once loaded", () => {
    expect(phoneSettled()).toBe(true);
    const form = mountForm(`<input name="phone" value="+27 82 123 4567" sf-validate:phone />`);
    const snipformHandler = vi.fn((e: Event) => e.preventDefault());
    form.addEventListener("submit", snipformHandler, false);

    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    expect(snipformHandler).toHaveBeenCalledOnce();
  });

  it("checks a lowercased country parameter on blur", () => {
    mountForm(`<input name="phone" value="+44 20 7946 0958" sf-validate:phone[za] />`);
    const input = document.querySelector("input")!;
    input.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });
});
