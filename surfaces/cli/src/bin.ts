#!/usr/bin/env node
/**
 * thelocalbrainctl — a thin, read-only command-line surface over TheLocalBrain
 * Core. It holds no storage logic: it only translates CLI arguments into core
 * calls and formats the normalized results. See
 * `scaffold-proposals/03-interfaces.md`.
 */
import { open, discover, CoreError } from "@thelocalbrain/core";

const USAGE = `thelocalbrainctl — read-only access to a TheBrain brain

Usage:
  thelocalbrainctl discover <path>            Run discovery and print the report
  thelocalbrainctl thoughts <path>            List thoughts (guid + label)
  thelocalbrainctl thought  <path> <guid>     Show a thought with its context
  thelocalbrainctl note     <path> <guid>     Print a thought's note body
  thelocalbrainctl neighbors <path> <guid>    List a thought's graph neighbors

<path> is a .brz export, an unpacked export directory, or a SQLite brain folder.`;

function print(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function main(argv: string[]): Promise<number> {
  const [command, path, guid] = argv;

  if (command === undefined || command === "help" || command === "--help") {
    process.stdout.write(`${USAGE}\n`);
    return command === undefined ? 1 : 0;
  }
  if (path === undefined) {
    process.stderr.write("error: missing <path>\n");
    return 2;
  }

  if (command === "discover") {
    print(discover(path));
    return 0;
  }

  const needsGuid = command === "thought" || command === "note" || command === "neighbors";
  const isReadCommand = command === "thoughts" || needsGuid;

  if (!isReadCommand) {
    process.stderr.write(`error: unknown command '${command}'\n\n${USAGE}\n`);
    return 2;
  }
  if (needsGuid && guid === undefined) {
    process.stderr.write(`error: '${command}' requires <guid>\n`);
    return 2;
  }

  const brain = open(path);
    switch (command) {
      case "thoughts": {
        const data = await brain.read.data();
        print(data.thoughts.map((t) => ({ guid: t.guid, label: t.label, forgotten: t.forgotten })));
        return 0;
      }
      case "thought": {
        const ctx = await brain.read.thoughtContext(guid as string);
        if (ctx === undefined) {
          process.stderr.write("error: thought not found\n");
          return 4;
        }
        print(ctx);
        return 0;
      }
      case "note": {
        const note = await brain.read.note(guid as string);
        if (note === undefined) {
          process.stderr.write("error: no note for that thought\n");
          return 4;
        }
        process.stdout.write(`${note.body}\n`);
        return 0;
      }
      case "neighbors": {
        const neighbors = await brain.read.neighbors(guid as string);
        print(
          neighbors.map((n) => ({
            via: n.via,
            relation: n.link.relation,
            thoughtGuid: n.thoughtGuid,
          })),
        );
        return 0;
      }
      default:
        process.stderr.write(`error: unknown command '${command}'\n\n${USAGE}\n`);
        return 2;
    }
  } finally {
    brain.close();
  }
}

main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((err: unknown) => {
    if (err instanceof CoreError) {
      process.stderr.write(`refused (${err.category}): ${err.message}\n`);
      process.exit(3);
    }
    process.stderr.write(`error: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  });
