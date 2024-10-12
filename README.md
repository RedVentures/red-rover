<h1><img align="center" height="60" src="https://github.com/user-attachments/assets/84111c2e-fe44-4de1-b82d-45f38199724a">  &nbsp;&nbsp;Red Rover</h1>

<br/>

## Overview

RedRover is an AI-based code reviewer and summarizer for
GitHub pull requests using Anthropic models. It is
designed to be used as a GitHub Action and can be configured to run on every
pull request and review comments

## Reviewer Features:

- **PR Summarization**: It generates a summary and release notes of the changes
  in the pull request.
- **Line-by-line code change suggestions**: Reviews the changes line by line and
  provides code change suggestions.
- **Continuous, incremental reviews**: Reviews are performed on each commit
  within a pull request, rather than a one-time review on the entire pull
  request.
- **Cost-effective and reduced noise**: Incremental reviews save on Anthropic costs
  and reduce noise by tracking changed files between commits and the base of the
  pull request.
- **"Light" model for summary**: Designed to be used with a "light"
  summarization model and a "heavy" review model.
- **Chat with bot**: Supports conversation with the bot in the context of lines
  of code or entire files, useful for providing context, generating test cases,
  and reducing code complexity.
- **Smart review skipping**: By default, skips in-depth review for simple
  changes (e.g. typo fixes) and when changes look good for the most part. It can
  be disabled by setting `review_simple_changes` and `review_comment_lgtm` to
  `true`.
- **Less verbose reviews**: For more experienced users the Red Rover can err on 
  side of ignoring a change unless it is a major one. This is disabled by default,
  to enable set `review_simple_changes` to `false` and `less_verbose_review` to
  `true`.
- **Customizable prompts**: Tailor the `system_message`, `summarize`, and
  `summarize_release_notes` prompts to focus on specific aspects of the review
  process or even change the review objective.

To use this tool, you need to add the provided YAML file to your repository and
configure the required environment variables, such as `GITHUB_TOKEN` and
`ANTHROPIC_API_KEY`. For more information on usage, examples, and development
you can refer to the sections below.

- [Overview](#overview)
- [Reviewer Features](#reviewer-features)
- [Install instructions](#install-instructions)
- [Conversation with RedRover(#conversation-with-RedRover)
- [Examples](#examples)
- [Developing](#developing)

## Install instructions

RedRover runs as a GitHub Action. Add the below file to your repository
at `.github/workflows/redrover-review.yml`

```yaml
name: RedRover Reviewer

permissions:
  contents: read
  pull-requests: write

on:
  pull_request:
  pull_request_review_comment:
    types: [ created ]

concurrency:
  group:
    ${{ github.repository }}-${{ github.event.number || github.head_ref ||
    github.sha }}-${{ github.workflow }}-${{ github.event_name ==
    'pull_request_review_comment' && 'pr_comment' || 'pr' }}
  cancel-in-progress: ${{ github.event_name != 'pull_request_review_comment' }}

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: RedVentures/red-rover@anthropic
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        with:
          debug: false
          review_simple_changes: false
          review_comment_lgtm: false
```

#### Environment variables

- `GITHUB_TOKEN`: This should already be available to the GitHub Action
  environment. This is used to add comments to the pull request.
- `ANTHROPIC_API_KEY`: use this to authenticate with Anthropic API. You can get one
  [here](https://console.anthropic.com/settings/keys). Please add this key to
  your GitHub Action secrets.

### Prompts & Configuration

See: [action.yml](./action.yml)

Tip: You can change the bot personality by configuring the `system_message`
value. For example, to review docs/blog posts, you can use the following prompt:

<details>
<summary>Blog Reviewer Prompt</summary>

```yaml
system_message: |
  You are `@redrover` (aka `github-actions[dog]`), a language model
  trained by OpenAI. Your purpose is to act as a highly experienced
  DevRel (developer relations) professional with focus on cloud-native
  infrastructure.

  Company context -
  RedRover is an AI-powered Code reviewer.It boosts code quality and cuts manual effort. Offers context-aware, line-by-line feedback, highlights critical changes,
  enables bot interaction, and lets you commit suggestions directly from GitHub.

  When reviewing or generating content focus on key areas such as -
  - Accuracy
  - Relevance
  - Clarity
  - Technical depth
  - Call-to-action
  - SEO optimization
  - Brand consistency
  - Grammar and prose
  - Typos
  - Hyperlink suggestions
  - Graphics or images (suggest Dall-E image prompts if needed)
  - Empathy
  - Engagement
```

</details>

## Conversation with RedRover

You can reply to a review comment made by this action and get a response based
on the diff context. Additionally, you can invite the bot to a conversation by
tagging it in the comment (`@redrover`).

Example:

> @redrover Please generate a test plan for this file.

Note: A review comment is a comment made on a diff or a file in the pull
request.

### Ignoring PRs

Sometimes it is useful to ignore a PR. For example, if you are using this action
to review documentation, you can ignore PRs that only change the documentation.
To ignore a PR, add the following keyword in the PR description:

```text
@redrover: ignore
```

## Examples

Some of the reviews done by ai-pr-reviewer

![PR Summary](./docs/images/openai-pr-summary.png)

![PR Release Notes](./docs/images/openai-pr-release-notes.png)

![PR Review](./docs/images/openai-pr-review.png)

![PR Conversation](./docs/images/openai-review-conversation.png)

Any suggestions or pull requests for improving the prompts are highly
appreciated.

### Developing

> First, you'll need to have a reasonably modern version of `node` handy, tested
> with node 17+.

Install the dependencies

```bash
$ npm install
```

Build the typescript and package it for distribution

```bash
$ npm run build && npm run package
```

### Inspect the messages between Anthropic server

Set `debug: true` in the workflow file to enable debug mode, which will show the
messages
