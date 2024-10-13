import {info} from '@actions/core'
import {minimatch} from 'minimatch'
import {TokenLimits} from './limits'

export class Options {
  debug: boolean
  disableReview: boolean
  disableReleaseNotes: boolean
  maxFiles: number
  reviewSimpleChanges: boolean
  lessVerboseReview: boolean
  reviewCommentLGTM: boolean
  pathFilters: PathFilter
  systemMessage: string
  reviewFileDiff: string
  anthropicLightModel: string
  anthropicHeavyModel: string
  anthropicModelTemperature: number
  anthropicRetries: number
  anthropicTimeoutMS: number
  anthropicConcurrencyLimit: number
  githubConcurrencyLimit: number
  lightTokenLimits: TokenLimits
  heavyTokenLimits: TokenLimits
  language: string

  constructor(
    debug: boolean,
    disableReview: boolean,
    disableReleaseNotes: boolean,
    maxFiles = '0',
    reviewSimpleChanges = false,
    lessVerboseReview = false,
    reviewCommentLGTM = false,
    pathFilters: string[] | null = null,
    systemMessage = '',
    reviewFileDiff = '',
    anthropicLightModel: string,
    anthropicHeavyModel: string,
    anthropicModelTemperature = '0.0',
    anthropicRetries = '3',
    anthropicTimeoutMS = '120000',
    anthropicConcurrencyLimit = '6',
    githubConcurrencyLimit = '6',
    language = 'en-US'
  ) {
    this.debug = debug
    this.disableReview = disableReview
    this.disableReleaseNotes = disableReleaseNotes
    this.maxFiles = parseInt(maxFiles)
    this.reviewSimpleChanges = reviewSimpleChanges
    this.lessVerboseReview = lessVerboseReview
    this.reviewCommentLGTM = reviewCommentLGTM
    this.pathFilters = new PathFilter(pathFilters)
    this.systemMessage = systemMessage
    this.reviewFileDiff = reviewFileDiff
    this.anthropicLightModel = anthropicLightModel
    this.anthropicHeavyModel = anthropicHeavyModel
    this.anthropicModelTemperature = parseFloat(anthropicModelTemperature)
    this.anthropicRetries = parseInt(anthropicRetries)
    this.anthropicTimeoutMS = parseInt(anthropicTimeoutMS)
    this.anthropicConcurrencyLimit = parseInt(anthropicConcurrencyLimit)
    this.githubConcurrencyLimit = parseInt(githubConcurrencyLimit)
    this.lightTokenLimits = new TokenLimits(anthropicLightModel)
    this.heavyTokenLimits = new TokenLimits(anthropicHeavyModel)
    this.language = language
  }

  // print all options using core.info
  print(): void {
    info(`debug: ${this.debug}`)
    info(`disable_review: ${this.disableReview}`)
    info(`disable_release_notes: ${this.disableReleaseNotes}`)
    info(`max_files: ${this.maxFiles}`)
    info(`review_simple_changes: ${this.reviewSimpleChanges}`)
    info(`less_verbose_review: ${this.lessVerboseReview}`)
    info(`review_comment_lgtm: ${this.reviewCommentLGTM}`)
    info(`path_filters: ${this.pathFilters}`)
    info(`system_message: ${this.systemMessage}`)
    info(`review_file_diff: ${this.reviewFileDiff}`)
    info(`anthropic_light_model: ${this.anthropicLightModel}`)
    info(`anthropic_heavy_model: ${this.anthropicHeavyModel}`)
    info(`anthropic_model_temperature: ${this.anthropicModelTemperature}`)
    info(`anthropic_retries: ${this.anthropicRetries}`)
    info(`anthropic_timeout_ms: ${this.anthropicTimeoutMS}`)
    info(`anthropic_concurrency_limit: ${this.anthropicConcurrencyLimit}`)
    info(`github_concurrency_limit: ${this.githubConcurrencyLimit}`)
    info(`summary_token_limits: ${this.lightTokenLimits.string()}`)
    info(`review_token_limits: ${this.heavyTokenLimits.string()}`)
    info(`language: ${this.language}`)
  }

  checkPath(path: string): boolean {
    const ok = this.pathFilters.check(path)
    info(`checking path: ${path} => ${ok}`)
    return ok
  }
}

export class PathFilter {
  private readonly rules: Array<[string /* rule */, boolean /* exclude */]>

  constructor(rules: string[] | null = null) {
    this.rules = []
    if (rules != null) {
      for (const rule of rules) {
        const trimmed = rule?.trim()
        if (trimmed) {
          if (trimmed.startsWith('!')) {
            this.rules.push([trimmed.substring(1).trim(), true])
          } else {
            this.rules.push([trimmed, false])
          }
        }
      }
    }
  }

  /**
   * Returns true if the file should be processed, not ignored.
   * If there is any inclusion rule set, a file is included when it matches any of inclusion rule.
   * If there is no inclusion rule set, a file is included when it does not matches any of exclusion rule.
   */
  check(path: string): boolean {
    if (this.rules.length === 0) {
      return true
    }

    let included = false
    let excluded = false
    let inclusionRuleExists = false

    for (const [rule, exclude] of this.rules) {
      if (minimatch(path, rule)) {
        if (exclude) {
          excluded = true
        } else {
          included = true
        }
      }
      if (!exclude) {
        inclusionRuleExists = true
      }
    }

    return (!inclusionRuleExists || included) && !excluded
  }
}

export class AnthropicOptions {
  model: string
  tokenLimits: TokenLimits

  constructor(
    model = 'anthropic.claude-instant-v1',
    tokenLimits: TokenLimits | null = null
  ) {
    this.model = model
    if (tokenLimits != null) {
      this.tokenLimits = tokenLimits
    } else {
      this.tokenLimits = new TokenLimits(model)
    }
  }
}
