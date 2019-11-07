import { SIGINT, SIGKILL, SIGTERM, SIGQUIT } from "constants";
import makeDebug from "debug";
import EventEmitter from "events";

export const INITIATE_EXIT = "@@node-exit/initiate-exit";
export const COMPLETE_EXIT = "@@node-exit/complete-exit";

const debug = makeDebug("exit");

let knownEmitters: EventEmitter[] = [];
let processListenersBound = false;

export function exit(...emitters: EventEmitter[]) {
  const results: boolean[] = [];

  knownEmitters = knownEmitters.concat(emitters);

  let shutdownRequested = false;

  const handleExit = (code: number) => () => {
    if (shutdownRequested) {
      debug("kill requested");
      uncleanExit();
    } else {
      debug("shutdown requested");
      shutdownRequested = true;
    }

    try {
      knownEmitters.forEach(emitter => {
        emitter.on(COMPLETE_EXIT, () => {
          results.push(true);

          if (results.length === knownEmitters.length) {
            cleanExit(code);
          }
        });

        emitter.emit(INITIATE_EXIT);
      });
    } catch (error) {
      process.stderr.write(
        `@neezer/exit encountered an error shutting down: ${error}`
      );

      uncleanExit();
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

  if (!processListenersBound) {
    process.on("SIGINT", handleExit(SIGINT));
    process.on("SIGTERM", handleExit(SIGTERM));
    process.on("SIGQUIT", handleExit(SIGQUIT));

    processListenersBound = true;
  }
}
