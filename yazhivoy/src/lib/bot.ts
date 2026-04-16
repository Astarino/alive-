import { Bot } from "grammy"

// Singleton — один инстанс на весь процесс
// В Next.js API используется только bot.api (HTTP), без polling
let _bot: Bot | null = null

export function getBot(): Bot {
  if (!_bot) {
    if (!process.env.BOT_TOKEN) throw new Error("BOT_TOKEN is not set")
    _bot = new Bot(process.env.BOT_TOKEN)
  }
  return _bot
}
