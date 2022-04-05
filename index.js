import { getInput, isDebug, setFailed, setOutput } from '@actions/core';
import { context } from '@actions/github';
import nodiff from './src/nodiff';

// NOTE(dabrady) This graceful failure eliminates stack traces and error context from this action's output, but that info
// is quite useful during debugging.
if (!isDebug()) {
  // NOTE(dabrady) Make sure that we fail gracefully on any uncaught error.
  process.on('uncaughtException', setFailed);
  process.on('unhandledRejection', setFailed);
}

// Safeguard against unsupported events.
if (context.eventName != 'pull_request') {
  throw new TypeError(`Sorry, this action isn't designed for '${context.eventName}' events.`);
}

// Do the thing.
nodiff({
  ...extractActionInputs(),
  baseGitRef: context.payload['pull_request'].base.ref,
  actionPayload: context.payload
}).then(function setOutputs(outputs) {
  if (!outputs) return;

  for (let key in outputs) {
    setOutput(key, outputs[key]);
  }
}).catch(setFailed);

// ********

/**
 * Extract the workflow inputs to this GitHub Action.
 * Inputs and their defaults (if any) are defined in the action schema, `action.yml`.
 */
function extractActionInputs() {
  try {
    var respondWith = JSON.parse(getInput('respond-with', {required: false}));
  } catch (syntaxError) {
    throw new SyntaxError('`respond-with` must be valid JSON, please correct your workflow config');
  }

  // NOTE(dabrady) `getInput` will return an empty string if the input is not provided, so operation chaining is null-safe here.
  var filesToJudge = getInput('files-to-judge', {required: false}).split('\n').join(' ');
  var githubToken = getInput('github-token', {
    // NOTE(dabrady) If review requests or leaving a comment are desired in response to meaningless changes, a GitHub token is required.
    required: (respondWith.requestReviewers || respondWith.comment)
  });

  return { respondWith, filesToJudge, githubToken };
}

