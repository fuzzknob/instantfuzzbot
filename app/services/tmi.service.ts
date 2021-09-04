import { Client, Options } from 'tmi.js'
import log from '../libs/log'

export type CommandHandler = (
  args: string[],
  meta: {
    channel: string,
    message: string,
  }
) => Promise<string> | Promise<void>

export default class TmiService {
  private client: Client
  private commandList: {
    [command: string]: CommandHandler
  } = {}

  constructor(options: Options) {
    this.client = new Client(options)
    this.client.on('message', (channel, context, message, self) => {
      if (self || !message.startsWith('!')) return
      const args = message.slice(1).split(' ')
      const command = args.shift()?.toUpperCase()
      if (!command) return
      this.executeCommand(command, {
        args,
        channel,
        message,
      })
    })
    this.client.on('connected', (address, port) => {
      log.log(`Connected to ${address}:${port}`)
    })
  }

  connect() {
    return this.client.connect()
  }

  say(channel: string, message: string) {
    return this.client.say(channel, message)
  }

  listenCommand(
    command: string,
    handler: CommandHandler,
  ) {
    this.commandList[command.toUpperCase()] = handler
  }

  private async executeCommand(command: string, payload: {
    args: string[]
    channel: string
    message: string
  }) {
    const handler = this.commandList[command]
    const { args, channel, message } = payload
    if (typeof handler === 'function') {
      const replyMessage = await handler(args, { channel, message, })
      if (replyMessage) {
        this.say(channel, replyMessage)
      }
    }
  }
}
