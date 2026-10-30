// Turns session exports into a labelling sheet for the interview-mistake check, and scores the
// sheets two labellers send back (§9 of the spec).
//
//   pnpm bano:sheet sheet.tsv session-*.json
//   pnpm bano:sheet --score labeller-a.tsv labeller-b.tsv
//
// The work is in src/assessment/bano/labellingSheet.ts, which the tests cover; this file is argv,
// reading and writing only.
import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { importSessionExport } from "../src/assessment/sessionExport";
import { agreement, agreementReport, labellingSheet, readSheet } from "../src/assessment/bano/labellingSheet";
import type { SheetSession } from "../src/assessment/bano/labellingSheet";

const args = process.argv.slice(2);

function usage(problem: string): never {
  console.error(`${problem}

  bano:sheet <out.tsv> <session.json...>        build a sheet to label
  bano:sheet --score <a.tsv> <b.tsv>           score two labelled sheets`);
  process.exit(1);
}

if (args[0] === "--score") {
  const [, first, second] = args;
  if (!first || !second) usage("--score needs two labelled sheets.");
  const rows = agreement(readSheet(readFileSync(first, "utf8")), readSheet(readFileSync(second, "utf8")));
  process.stdout.write(agreementReport(rows));
} else {
  const [out, ...files] = args;
  if (!out || files.length === 0) usage("Give an output file and at least one session export.");
  const sessions: SheetSession[] = files.map((file) => {
    const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
    const session = importSessionExport(parsed);
    const report = session.assessment?.process.bano;
    if (!report) throw new Error(`${file} has no interview-mistake report. It predates the check, or the review never ran.`);
    const sessionId = basename(file, ".json");
    return { sessionId, caseId: session.caseDefinition.id, mode: session.mode, report };
  });
  writeFileSync(out, labellingSheet(sessions), "utf8");
  console.log(`${out}: ${sessions.length} session(s), ${sessions.length * 33} rows to label.`);
}
