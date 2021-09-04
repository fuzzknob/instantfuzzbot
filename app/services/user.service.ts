import fs from 'fs'
import dayjs, { Dayjs } from 'dayjs'

export interface User {
  accessToken: string
  refreshToken: string
  expiryDate: Dayjs
}

export default class UserService {
  getUser(): Promise<User | null> {
    return new Promise((res, rej) => {
      fs.readFile('./data/user.json', 'utf8', (err, data) => {
        if (err) {
          return rej(err)
        }
        if (data) {
          const { accessToken, refreshToken, expiryDate } = JSON.parse(data) as {
            accessToken: string
            refreshToken: string
            expiryDate: string
          }
          return res({
            accessToken,
            refreshToken,
            expiryDate: dayjs(expiryDate)
          })
        }
        res(null)
      })
    })
  }

  async setUser(user: User) {
    const content = JSON.stringify({
      accessToken: user.accessToken,
      refreshToken: user.refreshToken,
      expiryDate: user.expiryDate.toISOString(),
    })
    return new Promise((res, rej) => {
      fs.writeFile('./data/user.json', content, (err) => {
        if (err) {
          rej(err)
        }
        res('')
      })
    })
  }

  async hasLoggedIn() {
    try {
      const user = await this.getUser()
      return !!user
    } catch (error) {
      return false
    }
  }
}
