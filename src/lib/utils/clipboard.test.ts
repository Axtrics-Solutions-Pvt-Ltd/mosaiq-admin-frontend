import { afterEach, describe, expect, it, vi } from "vitest";

import { copyText } from "./clipboard";

const originalClipboard = Object.getOwnPropertyDescriptor(
  navigator,
  "clipboard",
);

function setClipboard(value: unknown) {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value,
  });
}

function mockExecCommand(result: boolean) {
  const execCommand = vi.fn(() => result);
  Object.defineProperty(document, "execCommand", {
    configurable: true,
    value: execCommand,
  });
  return execCommand;
}

afterEach(() => {
  if (originalClipboard)
    Object.defineProperty(navigator, "clipboard", originalClipboard);
  else Reflect.deleteProperty(navigator, "clipboard");
  Reflect.deleteProperty(document, "execCommand");
});

describe("copyText", () => {
  it("uses the async clipboard API when it is available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });
    const execCommand = mockExecCommand(true);
    await expect(copyText("https://portal.example.test/a")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("https://portal.example.test/a");
    expect(execCommand).not.toHaveBeenCalled();
  });

  it("falls back to a temporary textarea when the API is refused", async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error("denied")) });
    let copied = "";
    const execCommand = mockExecCommand(true);
    execCommand.mockImplementation(() => {
      copied = (document.activeElement as HTMLTextAreaElement).value;
      return true;
    });
    await expect(copyText("fallback text")).resolves.toBe(true);
    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(copied).toBe("fallback text");
    expect(document.querySelector("textarea")).toBeNull();
  });

  it("falls back when the API is missing and reports a failed copy", async () => {
    setClipboard(undefined);
    mockExecCommand(false);
    await expect(copyText("text")).resolves.toBe(false);
  });
});
