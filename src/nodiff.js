import { getInput, setOutput, setFailed } from '@actions/core';
import { exec } from '@actions/exec';
import { context, getOctokit } from '@actions/github';

// NOTE(dabrady) Make sure that we fail gracefully on any uncaught error.
process.on('uncaughtException', setFailed);

const FAILURE_MESSAGE = `You made meaningless changes to:\n`;

export default async function nodiff() {
  if (context.eventName != 'pull_request') {
    throw new TypeError(`Sorry, this action isn't designed for '${context.eventName}' events.`);
  }
  var {
    base: { ref: baseRef }
  } = context.payload['pull_request']; // NOTE(dabrady) Guaranteed to be there for `pull_request` events
  var { doThisInResponse, filesToJudge, githubToken } = extractActionInputs();

  // Get the list of files that have been changed meaninglessly.
  var files = await meaninglessDiff(filesToJudge, baseRef);
  if (files.length <= 0) {
    // Hurray, no meaningless changes.
    return;
  }

  var filesAsSpaceSeparatedList = files.join(' ');
  // Prepend the string "- " to the beginning of each line, which is a file path, resulting in a Markdown list of files.
  var filesAsMarkdownList = files.join('\n').replace(/^/gm, '- ');

  // Set the outputs.
  setOutput('files', filesAsSpaceSeparatedList);
  setOutput('filesAsMarkdownList', filesAsMarkdownList);

  // Respond as directed. Any or all of these may be provided.
  var { alert: githubHandles, comment, fail } = doThisInResponse;
  if (fail) {
    setFailed(FAILURE_MESSAGE + filesAsMarkdownList);
  }
  if (githubHandles) {
    // TODO(dabrady) does this need to be awaited?
    requestReviews(githubHandles, githubToken);
  }
  if (comment) {
    // TODO handle comment
  }
}

// *********

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

  // NOTE(dabrady) If an alert or comment is desired in response to meaningless changes, a GitHub token is required.
  var githubToken = getInput('github-token', {required: (doThisInResponse.alert || doThisInResponse.comment)});

  return {
    doThisInResponse,
    filesToJudge,
    githubToken,
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

  var meaninglessChanges = stdout ? stdout.split('\n') : [];
  return meaninglessChanges;
}

async function requestReviews(githubHandles, githubToken) {
  var octokit = getOctokit(githubToken);
  var {
    pull_request: { number },
    repository: { full_name: fullName }
  } = context.payload;
  console.log(number, fullName);
  console.log(context.payload.pull_request.owner);
  // await octokit.rest.pulls.requestReviewers({

  // })
}
