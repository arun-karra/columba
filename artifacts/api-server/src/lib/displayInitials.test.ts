import { describe, expect, it } from "vitest";
import {
  getDisplayInitials,
  getUserDisplayInitials,
  resolveUserDisplayName,
} from "../../../ios-app/utils/displayInitials";

describe("displayInitials", () => {
  it("uses first letter of first two words for multi-word names", () => {
    expect(getDisplayInitials("dev Test")).toBe("DT");
    expect(getDisplayInitials("John Q Public")).toBe("JQ");
  });

  it("uses first two letters for a single name", () => {
    expect(getDisplayInitials("Dev")).toBe("DE");
    expect(getDisplayInitials("A")).toBe("A");
  });

  it("resolves display name from user profile fields", () => {
    expect(
      getUserDisplayInitials({ displayName: "dev Test", email: "dev@columba.local" }),
    ).toBe("DT");
    expect(getUserDisplayInitials({ displayName: null, email: "dev@columba.local" })).toBe(
      "DE",
    );
    expect(resolveUserDisplayName({ displayName: "", email: "dev@columba.local" })).toBe("dev");
  });
});
