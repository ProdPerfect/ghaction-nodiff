import { setOutput, setFailed } from '@actions/core';

export default async function nodiff() {
  /**
     1. Get commit range
     2. Get files changed within commit range
     3. Filter based on `files-to-judge` (config check)
     4. Check based on `monitor-[all|any]` (config check)
     5. Respond if requested
     6. Return results of (3.)
   */


  // TODO Write the code that does the thing.
  try {
    setOutput('files', '');
  } catch (error) {
    setFailed(error.message);
    return;
  }
}

nodiff();
