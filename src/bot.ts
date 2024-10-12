import './fetch-polyfill'

import Anthropic from "@anthropic-ai/sdk";
import {info, warning} from '@actions/core'
import pRetry from 'p-retry'
import {AnthropicOptions, Options} from './options'

// define type to save parentMessageId and conversationId
export interface Ids {
  parentMessageId?: string
  conversationId?: string
}

export class Bot {
  private readonly client: Anthropic

  private readonly options: Options
  private readonly anthropicOptions: AnthropicOptions

  constructor(options: Options, anthropicOptions: AnthropicOptions) {
    this.options = options
    this.anthropicOptions = anthropicOptions
    this.client = new Anthropic();
  }

  chat = async (message: string, prefix?: string): Promise<[string, Ids]> => {
    let res: [string, Ids] = ['', {}]
    try {
      res = await this.chat_(message, prefix)
      return res
    } catch (e: unknown) {
      warning(`Failed to chat: ${e}`)
      return res
    }
  }

  private readonly chat_ = async (
    message: string,
    prefix: string = ''
  ): Promise<[string, Ids]> => {
    // record timing
    const start = Date.now()
    if (!message) {
      return ['', {}]
    }

    let response: Anthropic.Message | undefined

    try {
      if (this.options.debug) {
        info(`sending prompt: ${message}\n------------`)
      }
      response = await pRetry(
        () =>
          this.client.messages.create({
              model: this.anthropicOptions.model,
              max_tokens: 4096,
              messages: [
                {
                  role: 'user' as 'user',
                  content: message
                },
                ...(prefix
                  ? [
                      {
                        role: 'assistant' as 'assistant',
                        content: prefix
                      }
                    ]
                  : [])
              ]
            }),
        {
          retries: this.options.anthropicRetries
        }
      )
    } catch (e: unknown) {
      info(`response: ${response}, failed to send message to anthropic: ${e}`)
    }
    const end = Date.now()
    info(
      `anthropic sendMessage (including retries) response time: ${end - start} ms`
    )

    let responseText = ''
    if (response != null) {
      const responseBody = (response as unknown as { body: any }).body;
      responseText = JSON.parse(Buffer.from(responseBody).toString('utf-8'))
        .content?.[0]?.text
    } else {
      warning('anthropic response is null')
    }
    if (this.options.debug) {
      info(`anthropic responses: ${responseText}\n-----------`)
    }
    const responseWithMetadata = response as unknown as { $metadata: { requestId: string, cfId: string } };
    const newIds: Ids = {
      parentMessageId: responseWithMetadata?.$metadata.requestId,
      conversationId: responseWithMetadata?.$metadata.cfId
    }
    return [prefix + responseText, newIds]
  }
}
