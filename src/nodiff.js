import { info, isDebug, setFailed } from '@actions/core';
import { exec } from '@actions/exec';
import {
  hydrateTemplateString,
  leaveComment,
  requestChanges,
  requestReviewers,
} from './helpers';

const FAILURE_MESSAGE = `Meaningless changes have been made to:\n`;

/**
 * This action lets you react when no meaningful changes are made within a given change set.
 *
 * Currently, a 'meaningless' change is defined in terms of whitespace, but it can be extended later. It can be
 * configured to monitor an entire project or a set of files within it, and by default it simply fails if the given
 * change set makes 'no difference' to the codebase.
 *
 * You can also configure it to react with one or more of a small set of predefined and slightly configurable actions,
 * such as requesting a review from someone, leaving a comment, or requesting changes.
 */
export default async function nodiff({
  filesToJudge,
  baseGitRef,
  doThisInResponse: {
    requestReviewers: githubHandles,
    comment,
    fail
  },
  actionPayload,
  githubToken
}) {
  // Get the list of files that have been changed meaninglessly.
  var fileList = await meaninglessDiff(filesToJudge, baseGitRef);
  if (fileList.length <= 0) {
    // Hurray, no meaningless changes.
    return null;
  }

  // Process the results.
  var outputs = {
    files: fileList.join(' '),
    // Prepend the string "- " to the beginning of each line, which is a file path, resulting in a Markdown list of files.
    filesAsMarkdownList: fileList.join('\n').replace(/^/gm, '- ')
  };
  info(FAILURE_MESSAGE + outputs.files);

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
    setFailed(FAILURE_MESSAGE + outputs.filesAsMarkdownList);
  }

  return outputs;
}

// *********


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
