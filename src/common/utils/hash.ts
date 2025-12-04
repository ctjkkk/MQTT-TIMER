import * as bcrypt from 'bcrypt'

export const Hash = {
  make: async (plain: string): Promise<string> => {
    const salt = await bcrypt.genSalt(10)
    return bcrypt.hash(plain, salt)
  },
  verify: async (plain: string, hash: string): Promise<boolean> => {
    return bcrypt.compare(plain, hash)
  },
}
