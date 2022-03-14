import { getInput, info, isDebug, setFailed, setNeutral, setOutput } from '@actions/core';
import { exec } from '@actions/exec';
import { context, getOctokit } from '@actions/github';

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

  // Process the results.
  var filesAsSpaceSeparatedList = files.join(' ');
  // Prepend the string "- " to the beginning of each line, which is a file path, resulting in a Markdown list of files.
  var filesAsMarkdownList = files.join('\n').replace(/^/gm, '- ');

  // Respond as directed. Any or all of these may be provided.
  var { requestReviewers: githubHandles, comment, fail } = doThisInResponse;
  if (githubHandles) {
    await requestReviewers(githubHandles, githubToken);
  }
  if (comment) {
    // When failure is also specified, don't just leave a comment: block the review.
    // Some other process will need to handle dismissing this: there's no good way to do it from here.
    if (fail) {
      await requestChanges(comment, githubToken);
    } else {
      await leaveComment(comment, githubToken);
    }
  }
  if (fail) {
    setFailed(FAILURE_MESSAGE + filesAsMarkdownList);
  } else {
    setNeutral(FAILURE_MESSAGE + filesAsMarkdownList);
  }

  // Set the outputs.
  setOutput('files', filesAsSpaceSeparatedList);
  setOutput('filesAsMarkdownList', filesAsMarkdownList);
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

/**
 * Adds a given set of GitHub handles as reviewers to the pull request triggering this action.
 */
async function requestReviewers(githubHandles, githubToken) {
  var octokit = getOctokit(githubToken);
  var {
    pull_request: {
      number: pullNumber,
      user: { login: author }
    },
    repository: {
      name: repo,
      owner: { login: owner }
    }
  } = context.payload;

  // GitHub doesn't allow pull request authors to review their own pull requests.
  var reviewers = githubHandles.filter(function excludeAuthor(githubHandle) {
    return githubHandle != author;
  });

  info(`Requesting reviews from: ${reviewers}`);

  return octokit.rest.pulls.requestReviewers({
    owner,
    repo,
    pull_number: pullNumber,
    reviewers
  });
}

/**
 * Leaves a comment on the pull request from whence this action originated.
 */
async function leaveComment(comment, githubToken) {
  return submitReview(comment, githubToken, { action: 'COMMENT' });
}

/**
 * Requests changes on the pull request from whence this action originated.
 */
async function requestChanges(comment, githubToken) {
  return submitReview(comment, githubToken, { action: 'REQUEST_CHANGES' });
}

/**
 * Submits a review of the given kind on the pull request from whence this action originated.
 */
async function submitReview(comment, githubToken, { action = 'COMMENT' }) {
  var octokit = getOctokit(githubToken);
  var {
    pull_request: {
      number: pullNumber
    },
    repository: {
      name: repo,
      owner: { login: owner }
    }
  } = context.payload;
  return octokit.rest.pulls.createReview({
    owner,
    repo,
    pull_number: pullNumber,
    commit_id: context.sha,
    body: comment,
    event: action
  });
}
