import { info, isDebug, setFailed } from '@actions/core';
import { exec } from '@actions/exec';
import {
  hydrateTemplateString,
  leaveComment,
  requestChanges,
  requestReviewers,
} from './helpers';

// TODO(dabrady) Improve this message or parameterize it if we ever expand the definition of 'meaningless'.
const FAILURE_MESSAGE = "Whitespace changes aren't allowed but have been made to:\n%{files}";

/**
 * This action lets you react when meaningless changes are made within a given change set.
 *
 * Currently, a 'meaningless' change is defined in terms of whitespace, but it can be extended later. It can be
 * configured to monitor an entire project or a set of files within it, and by default it simply fails if part of the given
 * change set makes 'no difference' to the codebase.
 *
 * You can also configure it to react with one or more of a small set of predefined and slightly configurable actions,
 * such as requesting a review from someone, leaving a comment, or requesting changes.
 */
export default async function nodiff({
  filesToJudge,
  baseGitRef,
  respondWith: {
    requestReviewers: githubHandles,
    comment,
    fail
  },
  actionPayload,
  githubToken
}) {
  // NOTE(dabrady) This prevents consumers from needing to do this themselves.
  // We need to fetch the base to do a proper diff.
  await fetchGitRef(baseGitRef);

  // Get the list of files that have been changed meaninglessly.
  var files = await meaninglessDiff(filesToJudge, baseGitRef);
  if (files.length <= 0) {
    // Hurray, no meaningless changes.
    return null;
  }

  // Process the results.
  var outputs = {
    files: files.join(' '),
    // Prepend the string "- " to the beginning of each line, which is a file path, resulting in a Markdown list of files.
    filesAsMarkdownList: files.join('\n').replace(/^/gm, '- ')
  };
  var failureMessage = hydrateTemplateString(FAILURE_MESSAGE, outputs);
  info(failureMessage);

  // Respond as directed. Any or all of these may be provided.
  if (githubHandles) {
    await requestReviewers(githubHandles, githubToken, actionPayload);
  }
  if (comment) {
    // When failure is also specified, don't just leave a comment: block the review.
    // Some other process will need to handle dismissing this: there's no good way to do it from here.
    await (fail ? requestChanges : leaveComment)(
      hydrateTemplateString(comment, outputs),
      githubToken,
      actionPayload
    );
  }
  if (fail) {
    setFailed(failureMessage);
  }

  return outputs;
}

// *********

/**
 * Fetches the given git ref for later comparison.
 */
async function fetchGitRef(ref) {
  var stderr = '';
  var exitCode = await exec(
    `git fetch --no-tags --prune --depth=1 origin +refs/heads/${ref}:refs/remotes/origin/${ref}`,
    null,
    {
      listeners: {
        stderr: function saveStderr(data) {
          stderr += data.toString();
        },
      }
    }
  );
  if (exitCode != 0) {
    throw new Error(`Something went wrong:\n${stderr}`);
  }
  return true;
}

/**
 * This function returns the set of files in this change set that have not been meaningfully changed.
 */
async function meaninglessDiff(filesToJudge, baseRef) {
  var meaningfulDiffCmd =
      `git diff --ignore-space-change --ignore-blank-lines --diff-filter=M --numstat origin/${baseRef} HEAD -- ${filesToJudge} | awk '{print $3}'`;
  var meaninglessDiffCmd = `comm -23 <(git diff --diff-filter=M --name-only origin/${baseRef} HEAD -- ${filesToJudge}) <(${meaningfulDiffCmd})`;
  var stdout = '';
  var stderr = '';
  var exitCode = await exec(
    '/bin/bash', ['-c', meaninglessDiffCmd],
    {
      silent: !isDebug(), // Suppress log output unless running in debug mode
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
