export function getEnvValue(key: string, options = { isOptional: false }) {
  const value = process.env[key]
  if (!value && !options.isOptional) {
    throw new Error(`${key} is required`)
  }
  return value || ''
}

export function wait(seconds: number) {
  return new Promise((res) => {
    setTimeout(() => {
      res('')
    }, seconds)
  })
}
