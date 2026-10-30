/** Lay out the scenario's view left to right without changing the design document. */
export function scenarioDiagramCode(code: string): string {
  return code.replace(/^([ \t]*(?:flowchart|graph))(?:[ \t]+(?:TB|TD|BT|RL|LR))?([ \t]*;?)(?=\r?$)/im, "$1 LR$2");
}
