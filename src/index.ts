import { SIGINT, SIGKILL, SIGTERM } from "constants";
import makeDebug from "debug";
import EventEmitter from "events";

const debug = makeDebug("node-exit");

type TriggerEvent = string;
type ReturnEvent = string;
type ExitTuple = [EventEmitter, TriggerEvent, ReturnEvent];

export function exit(tuples: ExitTuple[]) {
  const results: boolean[] = [];

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
      tuples.forEach(tuple => {
        const [emitter, source, target] = tuple;

        emitter.on(target, () => {
          results.push(true);

          if (results.length === tuples.length) {
            cleanExit(code);
          }
        });

        emitter.emit(source);
      });
    } catch (error) {
      console.log("error exiting application", error);
      uncleanExit();
    }
  };

  const cleanExit = (code: number) => {
    process.exit(code);
  };

  const uncleanExit = () => {
    process.exit(SIGKILL);
  };

  process.on("SIGINT", handleExit(SIGINT));
  process.on("SIGTERM", handleExit(SIGTERM));
}
