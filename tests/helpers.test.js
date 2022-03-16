import { afterEach, describe, expect, it, jest } from '@jest/globals';
import merge from 'lodash.merge';
import * as core from '@actions/core';
import * as github from '@actions/github';
import * as helpers from '../src/helpers';
 
jest.mock('@actions/core');
jest.mock('@actions/github'); // NOTE(dabrady) Manually mocked at: `__mocks__/@actions/github.js`

describe('#requestReviewers', () => {
  afterEach(jest.clearAllMocks);

  var payload = {
    pull_request: { number: 42, user: { login: 'steve' } },
    repository: { name: 'repo', owner: { login: 'bob' } }
  };

  it('excludes the PR author from the reviewers to request', async () => {
    var author = 'dabrady';
    var reviewers = ['fred', author, 'george'];
    await helpers.requestReviewers(
      reviewers,
      'a token',
      // Set the author of the PR
      merge({}, payload, { pull_request: { user: { login: author } } })
    );

    // Is there a cleaner way to get a ref to the API function we care about? This makes me sad.
    var githubApi = github.getOctokit.mock.results[0].value.rest.pulls.requestReviewers;

    expect(githubApi).toHaveBeenCalledWith(expect.objectContaining({
      reviewers: reviewers.filter(reviewer => reviewer != author)
    }));
  });
});
