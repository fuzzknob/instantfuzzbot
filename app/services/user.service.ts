import { getDocument, updateDocument, } from '../libs/firebase'
import dayjs, { Dayjs } from 'dayjs'

export interface User {
  accessToken: string
  refreshToken: string
  expiryDate: Dayjs
}

export default class UserService {
  private cacheUser = null

  async getUser(): Promise<User | null> {
    if (this.cacheUser) {
      return this.cacheUser
    }
    const document = await getDocument<{
      accessToken: string
      refreshToken: string
      expiryDate: string
    }>('users', 'default')
    if (!document.accessToken) {
      return null
    }
    this.cacheUser = {
      accessToken: document.accessToken,
      refreshToken: document.refreshToken,
      expiryDate: dayjs(document.expiryDate),
    }
    return this.cacheUser
  }

  async setUser(user: User) {
    const content = {
      accessToken: user.accessToken,
      refreshToken: user.refreshToken,
      expiryDate: user.expiryDate.toISOString(),
    }
    this.cacheUser = user
    return updateDocument('users', 'default', content)
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
