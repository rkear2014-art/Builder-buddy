import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { installPromptMode, isIosSafari } from "./install-prompt";

const iphoneSafari =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const iphoneChrome =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1";
const ipadSafari =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";
const androidChrome =
  "Mozilla/5.0 (Linux; Android 14; Pixel Tablet) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

describe("install prompt", () => {
  it("hides on customer sign-off links", () => {
    assert.equal(
      installPromptMode({
        pathname: "/sign/abc",
        standalone: false,
        hasDeferredPrompt: true,
        iosSafari: true,
      }),
      "hidden",
    );
    assert.equal(
      installPromptMode({
        pathname: "/sign/abc/print/",
        standalone: false,
        hasDeferredPrompt: false,
        iosSafari: true,
      }),
      "hidden",
    );
  });

  it("hides once the app is already on the home screen", () => {
    assert.equal(
      installPromptMode({ pathname: "/", standalone: true, hasDeferredPrompt: true, iosSafari: true }),
      "hidden",
    );
  });

  it("offers Install app when Chrome has deferred the prompt", () => {
    assert.equal(
      installPromptMode({ pathname: "/diary", standalone: false, hasDeferredPrompt: true, iosSafari: false }),
      "android",
    );
    assert.equal(
      installPromptMode({ pathname: "/", standalone: false, hasDeferredPrompt: true, iosSafari: true }),
      "android",
    );
  });

  it("shows the Share hint only for iOS Safari, and stays quiet otherwise", () => {
    assert.equal(
      installPromptMode({ pathname: "/login", standalone: false, hasDeferredPrompt: false, iosSafari: true }),
      "ios",
    );
    assert.equal(
      installPromptMode({ pathname: "/", standalone: false, hasDeferredPrompt: false, iosSafari: false }),
      "hidden",
    );
  });
});

describe("iOS Safari detection", () => {
  it("recognises iPhone and iPad Safari", () => {
    assert.equal(isIosSafari(iphoneSafari), true);
    assert.equal(isIosSafari(ipadSafari, { platform: "MacIntel", maxTouchPoints: 5 }), true);
  });

  it("ignores Chrome on iPhone, desktop Safari, and Android Chrome", () => {
    assert.equal(isIosSafari(iphoneChrome), false);
    assert.equal(isIosSafari(ipadSafari, { platform: "MacIntel", maxTouchPoints: 0 }), false);
    assert.equal(isIosSafari(androidChrome), false);
  });
});
