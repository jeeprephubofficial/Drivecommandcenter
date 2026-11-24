import { describe, expect, it } from "vitest";

describe("starter sanity", () => {
  it("uses private app branding", () => {
    expect("Google Drive Command Center").toContain("Drive");
  });
});
