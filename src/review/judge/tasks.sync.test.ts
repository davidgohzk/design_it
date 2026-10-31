// tasks.json is the /api/assess contract. The backend owns it (design_it_backend/app/assess/
// tasks.json) and keeps an identical copy here. This side checks that the review's code is driven
// by that copy rather than by a list written out again; the backend's tests/test_tasks_contract.py
// compares the two copies byte for byte, the same split of duties as facts.json uses.
import { describe, expect, it } from "vitest";
import contract from "./tasks.json";
import type { AssessTask } from "./request";
import { ASSESS_TASKS, VERSIONED_TASKS } from "./request";

describe("the /api/assess task contract", () => {
  it("drives the task list the review sends, in issue order", () => {
    expect([...ASSESS_TASKS]).toEqual(contract.tasks.map((entry) => entry.task));
  });

  it("names the same tasks in the AssessTask union as in tasks.json", () => {
    // The union in request.ts cannot be derived from a JSON import, so it is written by hand. This
    // Record makes the compiler reject a missing or misspelled member, and the assertion below
    // rejects one that tasks.json does not have. Together they are the only thing stopping the
    // union and the contract from drifting apart — the check above cannot, since ASSESS_TASKS is
    // itself built from tasks.json.
    const named: Record<AssessTask, true> = {
      match: true,
      assertion: true,
      justify: true,
      fit: true,
      suggest: true,
      bano: true,
      turns: true,
      scenario_adequacy: true,
      iso: true,
      rationale: true,
    };
    expect(Object.keys(named).sort()).toEqual(contract.tasks.map((entry) => entry.task).sort());
  });

  it("names every task that reports a prompt version", () => {
    expect([...VERSIONED_TASKS]).toEqual(
      contract.tasks.filter((entry) => entry.promptVersion !== null).map((entry) => entry.task),
    );
  });

  it("gives every task exactly one section key", () => {
    for (const entry of contract.tasks) {
      expect(entry.section, entry.task).toMatch(/^[a-z]+$/);
    }
    expect(new Set(contract.tasks.map((entry) => entry.task)).size).toBe(contract.tasks.length);
  });

  it("carries the comment that says where it comes from", () => {
    // So an editor of this copy learns that the backend owns it before changing it.
    expect(contract._comment).toContain("design_it_frontend");
    expect(contract._comment).toContain("identical copy");
  });
});
