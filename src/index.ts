import { SIGINT, SIGKILL, SIGTERM } from "constants";
import makeDebug from "debug";
import EventEmitter from "events";

export const INITIATE_EXIT = "@@node-exit/initiate-exit";
export const COMPLETE_EXIT = "@@node-exit/complete-exit";

const debug = makeDebug("exit");

export function exit(...emitters: EventEmitter[]) {
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
      emitters.forEach(emitter => {
        emitter.on(INITIATE_EXIT, () => {
          results.push(true);

          if (results.length === emitters.length && !programaticExit) {
            cleanExit(code);
          }
        });

        emitter.emit(COMPLETE_EXIT);
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
