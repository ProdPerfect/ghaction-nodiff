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

describe('#hydrateTemplateString', () => {
  describe('when given a string with no template variables', () => {
    var targetString = 'Look mum, no template variables!';
    var templateVariables = { answer: 42 };

    it('leaves the string untouched', () => {
      expect(helpers.hydrateTemplateString(targetString, templateVariables)).toEqual(targetString);
    });
  });

  describe('when given a string with template variables', () => {
    var targetString = "A wild %{pokemon} appears! Who's that %{pokemon}?";

    describe('but no defined template variables', () => {
      var templateVariables = {};

      it('leaves the string untouched', () => {
        expect(helpers.hydrateTemplateString(targetString, templateVariables)).toEqual(targetString);
      });
    });

    describe('but none of them match the defined template variables', () => {
      var templateVariables = { digimon: 'digital monster' };

      it('leaves the string untouched', () => {
        expect(helpers.hydrateTemplateString(targetString, templateVariables)).toEqual(targetString);
      });
    });

    describe('and a set of at least partially matching template variables', () => {
      var templateVariables = { digimon: 'digital monster', pokemon: 'Pikachu' };

      it('replaces each occurrence of each template variable with its defined value', () => {
        var hydratedString = helpers.hydrateTemplateString(targetString, templateVariables);
        for (let templateVar in templateVariables) {
          let placeholder = `%{${templateVar}}`;
          if (targetString.includes(placeholder)) {
            // Placeholder should have been removed
            expect(hydratedString).toEqual(expect.not.stringContaining(placeholder));
            // Defined value for placeholder should have been added
            expect(hydratedString).toEqual(expect.stringContaining(templateVariables[templateVar]));
          }
        }
      });
    });
  });
});
