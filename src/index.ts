import { SIGINT, SIGKILL, SIGTERM } from "constants";
import makeDebug from "debug";
import EventEmitter from "events";

const debug = makeDebug("@neezer/exit");

type TriggerEvent = string;
type ReturnEvent = string;
type ExitTuple = [EventEmitter, TriggerEvent, ReturnEvent];

export function exit(tuples: ExitTuple[]) {
  const results: boolean[] = [];

  let shutdownRequested = false;

  const handleExit = (code: number, programaticExit: boolean = false) => () => {
    if (shutdownRequested && !programaticExit) {
      debug("kill requested");
      uncleanExit();
    } else {
      debug("shutdown requested");
      shutdownRequested = true;
    }

    try {
      tuples.forEach(tuple => {
        const [emitter, source, target] = tuple;

        emitter.on(target, () => {
          results.push(true);

          if (results.length === tuples.length && !programaticExit) {
            cleanExit(code);
          }
        });

        emitter.emit(source);
      });
    } catch (error) {
      process.stderr.write(
        `@neezer/exit encountered an error shutting down: ${error}`
      );

      if (!programaticExit) {
        uncleanExit();
      }
    }
  };

  const cleanExit = (code: number) => {
    debug("cleanly shutdown");
    process.exit(code);
  };

  const uncleanExit = () => {
    debug("forced shutdown");
    process.exit(SIGKILL);
  };

  process.on("SIGINT", handleExit(SIGINT));
  process.on("SIGTERM", handleExit(SIGTERM));

  return {
    sigint: handleExit(SIGINT, true),
    sigterm: handleExit(SIGTERM, true)
  };
}
