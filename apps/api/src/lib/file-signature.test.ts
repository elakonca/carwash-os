import { describe, expect, it } from "vitest";
import { detectImage, hasDangerousExtension } from "./file-signature.js";

describe("file signatures", () => {
  it("accepts jpeg magic bytes and rejects a php payload", () => {
    expect(detectImage(Buffer.from([0xff, 0xd8, 0xff, 0x00]))).toEqual({
      ext: ".jpg",
      mime: "image/jpeg",
    });
    expect(detectImage(Buffer.from("<?php echo 1;"))).toBeNull();
  });

  it("rejects dangerous extensions even when they are hidden behind another suffix", () => {
    expect(hasDangerousExtension("photo.php.jpg")).toBe(true);
    expect(hasDangerousExtension("photo.jpg")).toBe(false);
  });
});
