import { describe, expect, it } from "vite-plus/test";
import { groupSidebarItemsByDevice } from "./projectGrouping.ts";

describe("sidebar device groups", () => {
  it("keeps branches of the same repository on different devices separate without changing each device's order", () => {
    const rows = [
      { key: "remote-new", environment: "remote", branch: "main" },
      { key: "local", environment: "local", branch: "main" },
      { key: "remote-old", environment: "remote", branch: "feature" },
    ];
    const groups = groupSidebarItemsByDevice(
      rows,
      (row) => row.environment,
      new Map([
        ["remote", "Codebox"],
        ["local", "MacBook"],
      ]),
    );
    expect(groups.map((group) => [group.label, group.items.map((row) => row.key)])).toEqual([
      ["Codebox", ["remote-new", "remote-old"]],
      ["MacBook", ["local"]],
    ]);
    expect(rows.map((row) => row.key)).toEqual(["remote-new", "local", "remote-old"]);
  });

  it("retains disconnected or unnamed devices and distinguishes duplicate labels", () => {
    const rows = [{ environment: "b" }, { environment: "missing" }, { environment: "a" }];
    expect(
      groupSidebarItemsByDevice(
        rows,
        (row) => row.environment,
        new Map([
          ["a", "Laptop"],
          ["b", "Laptop"],
        ]),
      ).map((group) => [group.environmentId, group.label]),
    ).toEqual([
      ["a", "Laptop"],
      ["b", "Laptop"],
      ["missing", "missing"],
    ]);
  });

  it("handles no threads and one device without duplicating threads", () => {
    expect(groupSidebarItemsByDevice([], () => "unused", new Map())).toEqual([]);
    const row = { environment: "only" };
    expect(
      groupSidebarItemsByDevice([row], (item) => item.environment, new Map())[0]?.items,
    ).toEqual([row]);
  });
});
