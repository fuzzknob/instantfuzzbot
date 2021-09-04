import axios from 'axios'
import qs from 'qs'
import log from '../libs/log'
import dayjs from 'dayjs'
import { getEnvValue, wait } from '../libs/utils'
import UserService from './user.service'

const SPOTIFY_API_URL = 'https://api.spotify.com/v1/me'
const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com'
const SPOTIFY_CLIENT_ID = getEnvValue('SPOTIFY_CLIENT_ID')
const SPOTIFY_CLIENT_SECRET = getEnvValue('SPOTIFY_CLIENT_SECRET')

const PORT = getEnvValue('PORT')

const SCOPES = 'user-read-currently-playing'

interface SpotifyResponse {
  context: {
    external_urls: {
      spotify: string
    }
    href: string
    type: string
    uri: string
  }
  timestamp: number
  progress_ms: number
  is_playing: boolean
  currently_playing_type: string
  item: {
    album: {
      album_type: string
      external_urls: {
        spotify: string
      }
      href: string
      id: string
      images: {
        height: number
        url: string
        width: number
      }[]
      name: string
      type: string
      uri: string
    }
    artists: {
      external_urls: {
        spotify: string
      }
      href: string
      id: string
      name: string
      type: string
      uri: string
    }[]
    available_markets: string[]
    disc_number: number
    duration_ms: number
    explicit: boolean
    external_ids: {
      isrc: string
    }
    external_urls: {
      spotify: string
    }
    href: string
    id: string
    name: string
    popularity: number
    preview_url: string
    track_number: number
    type: string
    uri: string
  }
}

interface SpotifySong {
  id: string
  song: string
  artist: string
  album: {
    name: string,
    albumArt: string
  }
}

export default class SpotifyService {
  private currentSong: SpotifySong | undefined
  private listeners: Array<(song: SpotifySong) => void> = []

  getAuthRedirectURL() {
    const query = qs.stringify({
      response_type: 'code',
      client_id: SPOTIFY_CLIENT_ID,
      scope: SCOPES,
      redirect_uri: `http://localhost:${PORT}/callback/`,
    })
    return `${SPOTIFY_AUTH_URL}/authorize?${query}`
  }

  async exchangeAccessCode(code: string) {
    try {
      const { data } = await axios.post<{
        access_token: string,
        refresh_token: string,
        expires_in: number
      }>(`${SPOTIFY_AUTH_URL}/api/token`, null, {
        params: {
          code,
          redirect_uri: `http://localhost:${PORT}/callback/`,
          grant_type: 'authorization_code',
        },
        headers: {
          'Authorization': `Basic ${this.getAuthToken()}`,
        },
      })
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiryDate: dayjs().add(data.expires_in - 60, 'seconds'),
      }
    } catch (e) {
      log.error(e.message)
      return ''
    }
  }

  async refreshAccessToken(refreshToken: string) {
    try {
      const { data } = await axios.post<{
        access_token: string
        expires_in: number
      }>(
        `${SPOTIFY_AUTH_URL}/api/token`,
        null,
        {
          params: {
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
          },
          headers: {
            'Authorization': `Basic ${this.getAuthToken()}`,
          }
        }
      )
      return {
        accessToken: data.access_token,
        expiryDate: dayjs().add(data.expires_in - 60, 'seconds'),
      }
    } catch (e) {
      log.error(e.message)
    }
  }

  async watch(userService: UserService) {
    while (true) {
      try {
        const accessToken = await this.getUserAccessToken(userService)
        if (!accessToken) {
          log.error('There was an error while getting the access token')
          continue
        }
        const { data: { item } } = await axios.get<SpotifyResponse>(
          `${SPOTIFY_API_URL}/player/currently-playing`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
            params: {
              market: 'NP',
            }
          }
        )
        console.log()
        const spotifySong: SpotifySong = {
          id: item.id,
          song: item.name,
          artist: item.artists.map(artist => artist.name).join(', '),
          album: {
            name: item.album.name,
            albumArt: item.album.images.find(img => img.height === 64)?.url || '',
          },
        }
        if (!this.currentSong) {
          this.currentSong = spotifySong
        }
        if (this.currentSong.id !== spotifySong.id) {
          this.currentSong = spotifySong
          this.listeners.forEach(listener => listener(spotifySong))
        }
      } catch (e) {
        log.error(e.message)
      } finally {
        await wait(1000)
      }
    }
  }

  getCurrentPlayingSong() {
    return this.currentSong
  }

  listenSongChange(handler: (song: SpotifySong) => void) {
    this.listeners.push(handler)
  }

  private async getUserAccessToken(userService: UserService) {
    const user = await userService.getUser()
    if (!user) return
    if (user.expiryDate.isAfter(dayjs())) {
      return user.accessToken
    }
    try {
      const auth = await this.refreshAccessToken(user.refreshToken)
      if (!auth) return ''
      userService.setUser({
        accessToken: auth.accessToken,
        expiryDate: auth.expiryDate,
        refreshToken: user.refreshToken,
      })
    } catch (e) {
      log.error(e)
      return ''
    }
  }

  private getAuthToken() {
    return Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')
  }
}

