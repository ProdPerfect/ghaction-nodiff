import { getInput, setOutput, setFailed } from '@actions/core';
import { exec } from '@actions/exec';
import { context } from '@actions/github';

export default async function nodiff() {
  console.log(context); // TODO delete
  if (context.eventName != 'pull_request') {
    return setFailed(`Sorry, this action isn't designed for '${context.eventName}' events.`);
  }

  var { /* doThis, */ filesToJudge } = parseInputs();
  var {
    base: { ref: baseRef }
  } = context.payload[context.eventName];

  var { files, filesAsMarkdownList } = await meaninglessDiff(filesToJudge, baseRef);
  setOutput('files', files);
  setOutput('filesAsMarkdownList', filesAsMarkdownList);
}

function parseInputs() {
  try {
    var doThis = {
      comment: null,
      alert: null,
      fail: true,
      ...JSON.parse(getInput('do-this-in-response', {required: false}) || "{}")
    };
  } catch (syntaxError) {
    setFailed('`do-this-in-response` must be valid JSON, please correct your config');
    process.exit();
  }

  return {
    doThis,
    // NOTE(dabrady) `getInput` will return an empty string if the input is not provided.
    filesToJudge: getInput('files-to-judge', {required: false}).split('\n').join(' '),
  };
}

async function meaninglessDiff(filesToJudge, baseRef) {
  var meaningfulDiffCmd = `git diff --ignore-space-change --ignore-blank-lines --numstat -- ${filesToJudge} | awk '{print $3}'`;
  var meaninglessDiffCmd = `comm -23 <(git diff --name-only ${baseRef} -- ${filesToJudge}) <(${meaningfulDiffCmd})`;
  var stdout = '';
  var stderr = '';
  try {
    var exitCode = await exec(
      `bash -c "${meaninglessDiffCmd}"`,
      null,
      {
        listeners: {
          stdout: function saveStdout(data) {
            stdout += data.toString();
          },
          stderr: function saveStderr(data) {
            stderr += data.toString();
          },
        }
      }
    );
  } catch (error) {
    setFailed(error);
    process.exit();
  } finally {
    if (exitCode != 0) {
      setFailed(`Something went wrong:\n${stderr}`);
      process.exit();
    }
  }

  return {
    files: stdout.trim(),
    filesAsMarkdownList: stdout.trim().replace(/^/gm, '- ')
  };
}
