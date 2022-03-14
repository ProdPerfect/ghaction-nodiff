import { info } from '@actions/core';
import { getOctokit } from '@actions/github';

/**
 * Adds a given set of GitHub handles as reviewers to the pull request triggering this action.
 */
export async function requestReviewers(githubHandles, githubToken, actionPayload) {
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
  } = actionPayload;

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
export async function leaveComment(comment, githubToken, actionPayload) {
  return submitReview(comment, githubToken, actionPayload, { action: 'COMMENT' });
}

/**
 * Requests changes on the pull request from whence this action originated.
 */
export async function requestChanges(comment, githubToken, actionPayload) {
  return submitReview(comment, githubToken, actionPayload, { action: 'REQUEST_CHANGES' });
}

/**
 * Submits a review of the given kind on the pull request from whence this action originated.
 */
export async function submitReview(comment, githubToken, actionPayload, { action } = {}) {
  var octokit = getOctokit(githubToken);
  var {
    pull_request: {
      number: pullNumber,
      head: { ref }
    },
    repository: {
      name: repo,
      owner: { login: owner }
    }
  } = actionPayload;
  var reviewPayload = {
    owner,
    repo,
    pull_number: pullNumber,
    commit_id: ref,
    body: comment,
    event: action
  };
  console.log(reviewPayload);
  return octokit.rest.pulls.createReview();
}

/**
 * Does a simple find-and-replace on a string, replacing placeholders with their specified values if found.
 * The current placeholder pattern is like this: %{a_string_of_wordCharacters}
 * E.g.
 *     hydrateTemplateString(
 *         "Today is %{today}, but tomorrow is actually the day after %{today}, which is %{tomorrow}.",
 *         { today: 'Tuesday', tomorrow: 'Wednesday' }
 *     )
 *     // -> "Today is Tuesday, but tomorrow is actually the day after Tuesday, which is Wednesday."
 */
export function hydrateTemplateString(string, templateVariables = {}) {
  var PLACEHOLDER_PATTERN = /%{(\w+)}/;
  return string.replace(PLACEHOLDER_PATTERN, function replaceTemplateVariable(fullMatch, templateVariable) {
    return (templateVariable in templateVariables) ? templateVariables[templateVariable] : fullMatch;
  });
}
