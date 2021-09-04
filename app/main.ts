import 'dotenv/config'
import TmiService from './services/tmi.service'
import SpotifyService from './services/spotify.service'
import UserService from './services/user.service'
import { getEnvValue } from './libs/utils'
import * as Server from './server'

async function main() {
  const tmiService = new TmiService({
    identity: {
      username: getEnvValue('BOT_USERNAME'),
      password: getEnvValue('BOT_OAUTH_TOKEN'),
    },
    channels: JSON.parse(getEnvValue('TARGET_CHANNELS')),
  })
  const userService = new UserService()
  const spotifyService = new SpotifyService()

  await tmiService.connect()
  spotifyService.watch(userService)

  tmiService.listenCommand('SONG', async (args, meta) => {
    const hasLoggedIn = await userService.hasLoggedIn()
    if (!hasLoggedIn) {
      return 'Information not available at this moment'
    }
    const song = spotifyService.getCurrentPlayingSong()
    if (!song) {
      return 'Information not available at this moment'
    }
    return `${song.song} - ${song.artist}`
  })

  Server.start({
    spotifyService,
    userService,
  })
}

main()

