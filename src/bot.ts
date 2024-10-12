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
      const params: Anthropic.MessageCreateParams = {
        model: this.anthropicOptions.model,
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: message
          },
          ...(prefix
            ? [
                {
                  role: 'assistant',
                  content: prefix
                } as const
              ]
            : [])
        ],
      };
      response = await pRetry(
        () =>
          this.client.messages.create(params),
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
    const newIds: Ids = {};

    if (response != null) {
      info(`Response type: ${typeof response}`);
      info(`Response keys: ${Object.keys(response).join(', ')}`);
      
      if (Array.isArray(response.content) && response.content.length > 0) {
        const textContent = response.content.find(item => item.type === 'text');
        if (textContent && 'text' in textContent) {
          responseText = textContent.text;
        } else {
          warning('No text content found in the response');
        }
      } else {
        warning(`Unexpected content structure in the response: ${JSON.stringify(response.content)}`);
      }

      if (responseText) {
        info(`Response text: ${responseText.substring(0, 100)}...`); // Log the first 100 characters of the response
      } else {
        warning('Response text is empty');
      }

      newIds.parentMessageId = response.id;
    } else {
      warning('Anthropic response is null');
    }

    if (this.options.debug) {
      info(`Anthropic response text: ${responseText}\n-----------`);
    }

    return [prefix + responseText, newIds]
  }
}
