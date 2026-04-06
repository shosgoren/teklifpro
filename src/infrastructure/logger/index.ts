/**
 * Logger utility for TeklifPro
 * - Production: structured JSON logs for log aggregation
 * - Development: human-readable console output
 */

const isProduction = process.env.NODE_ENV === 'production'

export class Logger {
  private context: string

  constructor(context: string) {
    this.context = context
  }

  private formatMessage(level: string, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString()
    const dataStr = data ? ` ${JSON.stringify(data)}` : ''
    return `[${timestamp}] [${level}] [${this.context}] ${message}${dataStr}`
  }

  private formatJson(level: string, message: string, data?: unknown): string {
    const entry: Record<string, unknown> = {
      level,
      context: this.context,
      message,
      timestamp: new Date().toISOString(),
    }
    if (data !== undefined) {
      entry.data = data
    }
    return JSON.stringify(entry)
  }

  private extractErrorData(error: unknown): unknown {
    if (error instanceof Error) {
      return { message: error.message, stack: error.stack }
    }
    return error
  }

  info(message: string, data?: unknown): void {
    if (isProduction) {
      console.log(this.formatJson('info', message, data))
    } else {
      console.log(this.formatMessage('INFO', message, data))
    }
  }

  warn(message: string, data?: unknown): void {
    if (isProduction) {
      console.log(this.formatJson('warn', message, data))
    } else {
      console.warn(this.formatMessage('WARN', message, data))
    }
  }

  error(message: string, error?: unknown): void {
    if (isProduction) {
      const errorData = error !== undefined ? this.extractErrorData(error) : undefined
      console.log(this.formatJson('error', message, errorData))
    } else {
      const errorData = error instanceof Error ? error.message : String(error)
      console.error(this.formatMessage('ERROR', message, errorData))
    }
  }

  debug(message: string, data?: unknown): void {
    if (isProduction) {
      // no-op in production (same as before)
      return
    }
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('DEBUG', message, data))
    }
  }
}

export const logger = new Logger('app')
