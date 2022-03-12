import { getInput, setOutput, setFailed } from '@actions/core';
import { exec } from '@actions/exec';
import { context } from '@actions/github';

// NOTE(dabrady) Make sure that we fail gracefully on any uncaught error.
process.on('uncaughtException', setFailed);

export default async function nodiff() {
  if (context.eventName != 'pull_request') {
    throw new TypeError(`Sorry, this action isn't designed for '${context.eventName}' events.`);
  }
  var {
    base: { ref: baseRef }
  } = context.payload['pull_request']; // NOTE(dabrady) Guaranteed to be there for `pull_request` events
  var { doThisInResponse,  filesToJudge } = extractActionInputs();

  // Get the list of files that have been changed meaninglessly.
  var files = await meaninglessDiff(filesToJudge, baseRef);

  setOutput('files', files.join(' '));
  // Prepend the string "- " to the beginning of each line, which is a file path, resulting in a Markdown list of files.
  setOutput('filesAsMarkdownList', files.join('\n').replace(/^/gm, '- '));
}

/**
 * Extract the workflow inputs to this GitHub Action.
 * Inputs and their defaults (if any) are defined in the action schema, `action.yml`.
 */
function extractActionInputs() {
  try {
    var doThisInResponse = JSON.parse(getInput('do-this-in-response', {required: false}));
  } catch (syntaxError) {
    throw new SyntaxError('`do-this-in-response` must be valid JSON, please correct your config');
  }

  // NOTE(dabrady) `getInput` will return an empty string if the input is not provided, so operation chaining is null-safe here.
  var filesToJudge = getInput('files-to-judge', {required: false}).split('\n').join(' ');

  return {
    doThisInResponse,
    filesToJudge,
  };
}

/**
 * This function returns the set of files in this change set that have not been meaningfully changed.
 */
async function meaninglessDiff(filesToJudge, baseRef) {
  var meaningfulDiffCmd =
      `git diff --ignore-space-change --ignore-blank-lines --numstat origin/${baseRef} HEAD -- ${filesToJudge} | awk '{print $3}'`;
  var meaninglessDiffCmd = `comm -23 <(git diff --name-only origin/${baseRef} HEAD -- ${filesToJudge}) <(${meaningfulDiffCmd})`;
  var stdout = '';
  var stderr = '';
  var exitCode = await exec(
    '/bin/bash', ['-c', meaninglessDiffCmd],
    {
      listeners: {
        stdout: function saveStdout(data) {
          stdout += data.toString().trim();
        },
        stderr: function saveStderr(data) {
          stderr += data.toString();
        },
      }
    }
  );

  if (exitCode != 0) {
    throw new Error(`Something went wrong:\n${stderr}`);
  }

  var meaninglessChanges = stdout.trim().split('\n');
  return meaninglessChanges;
}
