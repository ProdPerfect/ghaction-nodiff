import { isDebug, setFailed } from '@actions/core';
import nodiff from './src/nodiff';

// NOTE(dabrady) This graceful failure eliminates stack traces and error context from this action's output, but that info
// is quite useful during debugging.
if (!isDebug()) {
  // NOTE(dabrady) Make sure that we fail gracefully on any uncaught error.
  process.on('uncaughtException', setFailed);
}

// TODO(dabrady) pull up input & output mgmt
nodiff();
