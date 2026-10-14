import { describe, expect, it } from "vitest";
import { resultTabs, stepTab } from "@/components/battle/tabs";

describe("result window tabs", () => {
  it("lists the tabs in menu order", () => {
    expect(resultTabs({}).map((t) => t.id)).toEqual(["result", "target", "tutor", "lens", "plan"]);
  });

  it("hides Target in versus", () => {
    expect(resultTabs({ hideTarget: true }).map((t) => t.id)).toEqual(["result", "tutor", "lens", "plan"]);
  });

  it("marks only the Tutor tab when it has something to say", () => {
    expect(resultTabs({}).some((t) => t.alert)).toBe(false);
    expect(resultTabs({ tutorAlert: true }).filter((t) => t.alert).map((t) => t.id)).toEqual(["tutor"]);
  });

  it("steps left and right like a D-pad, wrapping at both ends", () => {
    const tabs = resultTabs({});
    expect(stepTab(tabs, "result", 1)).toBe("target");
    expect(stepTab(tabs, "tutor", -1)).toBe("target");
    expect(stepTab(tabs, "plan", 1)).toBe("result");
    expect(stepTab(tabs, "result", -1)).toBe("plan");
  });

  it("walks every tab once in a full loop", () => {
    const tabs = resultTabs({ hideTarget: true });
    const seen = [];
    let t = tabs[0].id;
    for (let i = 0; i < tabs.length; i++) {
      seen.push(t);
      t = stepTab(tabs, t, 1);
    }
    expect(seen).toEqual(tabs.map((x) => x.id));
    expect(t).toBe(tabs[0].id);
  });

  it("starts from the first tab when the current one is hidden", () => {
    expect(stepTab(resultTabs({ hideTarget: true }), "target", 1)).toBe("result");
  });
});
