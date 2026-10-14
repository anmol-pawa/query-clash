/** The result window's tabs, as plain data so the menu logic is testable. */
export type ResultTab = "result" | "target" | "tutor" | "lens" | "plan";

export interface TabSpec {
  id: ResultTab;
  label: string;
  /** Red marker: the tutor has something to say about the last cast. */
  alert?: boolean;
}

/** Tabs in menu order. Versus hides Target (both players share one mission). */
export function resultTabs({ hideTarget, tutorAlert }: { hideTarget?: boolean; tutorAlert?: boolean }): TabSpec[] {
  return [
    { id: "result", label: "Result" },
    ...(hideTarget ? [] : [{ id: "target" as const, label: "Target" }]),
    { id: "tutor", label: "Tutor", alert: !!tutorAlert },
    { id: "lens", label: "Lens" },
    { id: "plan", label: "Plan" },
  ];
}

/** D-pad step through the tabs, wrapping at both ends like a handheld menu.
 *  A current tab that isn't in the list (e.g. Target in versus) starts at the first. */
export function stepTab(tabs: readonly TabSpec[], current: ResultTab, dir: 1 | -1): ResultTab {
  const i = tabs.findIndex((t) => t.id === current);
  if (i < 0) return tabs[0].id;
  return tabs[(i + dir + tabs.length) % tabs.length].id;
}
