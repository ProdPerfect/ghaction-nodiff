# GitHub Action: `nodiff`
This action lets you react when no meaningful changes are made within a given change set.

Currently, a 'meaningless' change is defined in terms of whitespace, but it can be extended later. It can be configured to monitor an entire project or a set of files within it, and by default it simply fails if the given change set makes 'no difference' to the codebase.

You can also configure it to react with one or more of a small set of predefined and slightly configurable actions, such as requesting a review from someone, leaving a comment, or requesting changes.

# What's new

- This action!


# Usage

```yaml
- uses: ProdPerfect/ghaction-nodiff@v1.0
  with:
    # Space-separated list of specific files to judge. Globs are supported.
    # @see https://github.com/actions/toolkit/tree/main/packages/glob#patterns
    # for details on supported patterns.
    #
    # NOTE: Since GitHub Actions support only string input values, using YAML's
    # `>-` string syntax is recommended for readability.
    # @see https://yaml-multiline.info
    files-to-judge: >-
      my-package/**
      **.py
      package.json
      index.js

    # If no meaningful changes to the monitored file(s) are detected, this
    # action can respond in one or more predefined ways.
    #
    # NOTE: This is a JSON object string, not a YAML map. GitHub Actions do
    # not currently support any input types other than strings.
    #
    # NOTE: Many of these reactions are only applicable to `pull-request`
    # events, but some, like `fail`, are event-agnostic. If a reaction is
    # specified but not applicable to an event, it has no effect.
    do-this-in-response: |
    {
      # If provided, a review will be submitted with this comment.
      # If `fail` is also specified, the review will request changes.
      #
      # The following patterns are interpolated:
      #   `%(files)`
      #   The same space-separated list of filenames output by this action
      #
      #   `%(filesAsMarkdownList)`:
      #    A valid unordered Markdown list of the items in `files`
      #
      # Ex.
      #    "The changes you made to these files are meaningless:\n%(filesAsMarkdownList)\nDid you mean to touch them?"
      # -->
      #    The changes you made to these files are meaningless:
      #    - foo.py
      #    - src/config/bar.json
      #    - docs/dontreadme.md
      #    Did you mean to touch them?
      #
      # Default: <none>
      "comment": "Hey, make sure you leave the code better than you found it!",

      # If provided, these users/aliases will be requested to leave a review.
      # Default: <none>
      "requestReviewers": [
        "@dabrady",
        "@MyCompany/moderators"
      ],

      # If provided, this action will fail if no meaningful changes to the
      # monitored files are detected.
      # If provided in conjunction with `comment`, the submitted review will
      # request changes, not just leave a comment.
      # Default: true
      "fail": true
    }
```

# Outputs
## `files`
A space-separated string of file paths, relative to the project root, that comprise whatever subset of the input `files-to-judge` were changed in meaningless ways in the event that triggered the action.

# Scenarios

- [Fail if any meaningless change has been made](#Fail-if-any-meaningless-change-has-been-made)
- [Identify files that have been changed meaninglessly](#Identify-files-that-have-been-changed-meaninglessly)
- [Alert someone when a file is changed meaninglessly](#Alert-someone-when-a-file-is-changed-meaninglessly)
- [Protect certain files from changing meaninglessly](#Protect-certain-files-from-changing-meaninglessly)

## Fail if any meaningless change has been made
```yaml
steps:
  - id: nodiff
    uses: ProdPerfect/ghaction-nodiff@v1.0
```

## Identify files that have been changed meaninglessly

```yaml
steps:
  - id: nodiff
    uses: ProdPerfect/ghaction-nodiff@v1.0
    with:
      do-this-in-response: |
        { "fail": false }
  - run: |
      echo "You made meaningless changes to: ${{ steps.nodiff.outputs.files }}"
    shell: bash
```

## Alert someone when a file is changed meaninglessly

```yaml
- uses: ProdPerfect/ghaction-nodiff@v1.0
  with:
    files-to-judge: >-
      package.js
      src/config.js
      docs/**
      src/modules/frobnicate/a-magic-file.js
    do-this-in-response: |
    {
      "comment": "Something about this is sus. Pinging some people who might be interested in these changes.",
      "alert": [ "@dabrady", "@MyCompany/moderators" ],
      "fail": false
    }
```

## Protect certain files from changing meaninglessly

```yaml
- uses: ProdPerfect/ghaction-nodiff@v1.0
  with:
    files-to-judge: >-
      src/modules/frobnicate/that-one-file-we-probly-shouldnt-touch.bat
    do-this-in-response: |
    {
      "comment": "Sorry, gonna need approval from da boss on this one.",
      "alert": [ "@dabrady" ],
      "fail": true
    }
```

# License

The scripts and documentation in this project are released under the [GPL v3 License](LICENSE)
