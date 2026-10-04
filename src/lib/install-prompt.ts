export type InstallPromptMode = "hidden" | "android" | "ios";

export function installPromptMode(input: {
  pathname: string;
  standalone: boolean;
  hasDeferredPrompt: boolean;
  iosSafari: boolean;
}): InstallPromptMode {
  const pathname =
    input.pathname.length > 1 && input.pathname.endsWith("/")
      ? input.pathname.slice(0, -1)
      : input.pathname;
  if (pathname === "/sign" || pathname.startsWith("/sign/")) return "hidden";
  if (input.standalone) return "hidden";
  if (input.hasDeferredPrompt) return "android";
  if (input.iosSafari) return "ios";
  return "hidden";
}

/**
 * Safari on iPhone, iPad, and iPadOS (which reports itself as a Mac with a touch screen).
 * Other browsers on those devices cannot add a home-screen app, so they get no hint.
 */
export function isIosSafari(
  userAgent: string,
  options?: { platform?: string; maxTouchPoints?: number },
): boolean {
  const touchMac = options?.platform === "MacIntel" && (options.maxTouchPoints ?? 0) > 1;
  const iosDevice = /iPhone|iPad|iPod/.test(userAgent) || touchMac;
  if (!iosDevice) return false;
  if (/CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Android|OPT\//.test(userAgent)) return false;
  return /Safari/.test(userAgent);
}
