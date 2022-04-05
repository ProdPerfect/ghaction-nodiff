import { jest } from '@jest/globals';

// Mock the Octokit API.
var github = jest.createMockFromModule('@actions/github');
github.getOctokit.mockReturnValue({
  rest: {
    pulls: {
      createReview: jest.fn(),
      requestReviewers: jest.fn(),
    }
  }
});

module.exports = github;
