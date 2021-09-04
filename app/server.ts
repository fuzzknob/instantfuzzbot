import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import path from 'path'
import SpotifyService from './services/spotify.service'
import UserService from './services/user.service'

import { getEnvValue } from './libs/utils'

const PORT = getEnvValue('PORT')

interface ServerProps {
  userService: UserService
  spotifyService: SpotifyService
}

export function start({
  userService,
  spotifyService,
}: ServerProps) {
  const server = express()

  server.set('view engine', 'ejs')
  server.set('views', path.join(__dirname, 'views'))

  server.get('/', async (req, res) => {
    if (await userService.hasLoggedIn()) {
      return res.render('index')
    }
    res.redirect('/auth')
  })

  server.get('/auth', (req, res) => {
    res.redirect(spotifyService.getAuthRedirectURL())
  })

  server.get('/callback', async (req, res) => {
    const code = req.query['code'] as string
    if (!code) {
      return res.render('error.ejs', {
        message: 'Code is empty'
      })
    }
    try {
      const auth = await spotifyService.exchangeAccessCode(code)
      if (!auth) {
        return res.render('error.ejs', {
          message: 'There was an error exchanging access code'
        })
      }
      await userService.setUser(auth)
      res.redirect('/')
    } catch (e) {
      res.render('error.ejs', {
        message: 'There was an error exchanging access code'
      })
    }
  })

  const httpServer = http.createServer(server)

  httpServer.listen(PORT, null, () => {
    console.log(`Started server at http://localhost:${PORT}`)
  })
}
