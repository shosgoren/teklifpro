/**
 * WhatsAppService - WhatsApp Business Cloud API
 *
 * Teklif linklerini WhatsApp uzerinden musteri ilgili kisilerine gonderir
 * Template mesaj + interaktif buton destegi
 *
 * API: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

import crypto from 'crypto'
import type { WhatsAppSendTemplateParams, WhatsAppMessageResponse } from '@/shared/types'
import { Logger } from '@/infrastructure/logger'

const logger = new Logger('WhatsAppService')

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v22.0'

export class WhatsAppService {
  private phoneNumberId: string
  private accessToken: string
  private appSecret: string

  constructor(phoneNumberId: string, accessToken: string, appSecret: string) {
    this.phoneNumberId = phoneNumberId
    this.accessToken = accessToken
    this.appSecret = appSecret
  }

  /**
   * Tenant'in WhatsApp bilgileriyle service olustur
   * Tenant config yoksa env degiskenlerinden olusturur
   */
  static fromTenantConfig(config: {
    whatsappPhoneId?: string | null
    whatsappAccessToken?: string | null
  }): WhatsAppService {
    const phoneId = config.whatsappPhoneId || process.env.WHATSAPP_PHONE_NUMBER_ID || ''
    const accessToken = config.whatsappAccessToken || process.env.WHATSAPP_ACCESS_TOKEN || ''

    if (!phoneId || !accessToken) {
      throw new Error('WhatsApp credentials not configured')
    }

    return new WhatsAppService(
      phoneId,
      accessToken,
      process.env.WHATSAPP_APP_SECRET || ''
    )
  }

  // ==================== MESAJ GONDERME ====================

  /**
   * Interaktif teklif linki gonder
   * Musteri linke tiklayarak teklifi goruntuler
   */
  async sendProposalLink(params: {
    to: string
    customerName: string
    proposalNumber: string
    proposalTitle: string
    grandTotal: string
    proposalUrl: string
    companyName: string
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const formattedTo = this.formatPhoneNumber(params.to)

    // 1. Try CTA URL button (requires 24h conversation window)
    try {
      const response = await this.sendCtaUrlMessage({
        to: formattedTo,
        header: `${params.companyName} - Teklif`,
        body: `Merhaba ${params.customerName},\n\n*${params.proposalTitle}*\nTeklif No: ${params.proposalNumber}\nTutar: ${params.grandTotal}\n\nTeklifi incelemek için aşağıdaki butona tıklayınız.`,
        footer: 'TeklifPro ile gönderildi',
        buttonText: 'Teklifi Görüntüle',
        url: params.proposalUrl,
      })

      return {
        success: true,
        messageId: response?.messages?.[0]?.id,
      }
    } catch (ctaError) {
      logger.warn('CTA URL failed, trying hello_world template', ctaError)
    }

    // 2. Fallback: hello_world template + text message with link
    //    Template opens conversation window, then we send the actual proposal link
    try {
      const templateResult = await this.sendTemplate({
        to: formattedTo,
        templateName: 'hello_world',
        language: 'en_US',
        parameters: {},
      })

      // Now send the actual proposal details as a follow-up text
      const proposalText = `Merhaba ${params.customerName},\n\n` +
        `*${params.proposalTitle}*\n` +
        `Teklif No: ${params.proposalNumber}\n` +
        `Tutar: ${params.grandTotal}\n\n` +
        `Teklifi görüntülemek için:\n${params.proposalUrl}\n\n` +
        `${params.companyName}`

      // Small delay to ensure template opens the window
      await new Promise(resolve => setTimeout(resolve, 1000))

      try {
        await this.sendTextMessage(formattedTo, proposalText)
      } catch {
        // Text follow-up failed but template was sent — still a success
        logger.warn('Follow-up text after template failed, template was sent')
      }

      return {
        success: true,
        messageId: templateResult?.messages?.[0]?.id,
      }
    } catch (templateError) {
      logger.error('Template mesaj hatasi', templateError)
      return {
        success: false,
        error: 'WhatsApp mesajı gönderilemedi. Lütfen müşterinin WhatsApp numarasını kontrol edin.',
      }
    }
  }

  /**
   * Serbest metin mesaji gonder (24 saat penceresi icinde)
   */
  async sendTextMessage(to: string, text: string): Promise<WhatsAppMessageResponse> {
    return this.request<WhatsAppMessageResponse>(
      `${this.phoneNumberId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: this.formatPhoneNumber(to),
          type: 'text',
          text: { body: text },
        }),
      }
    )
  }

  /**
   * Template mesaj gonder
   */
  async sendTemplate(params: WhatsAppSendTemplateParams): Promise<WhatsAppMessageResponse> {
    const components: Array<Record<string, unknown>> = []

    // Header parametreleri
    if (params.headerParams?.length) {
      components.push({
        type: 'header',
        parameters: params.headerParams.map((p) => ({ type: 'text', text: p })),
      })
    }

    // Body parametreleri
    const bodyParams = Object.values(params.parameters)
    if (bodyParams.length) {
      components.push({
        type: 'body',
        parameters: bodyParams.map((p) => ({ type: 'text', text: p })),
      })
    }

    // Button parametreleri (URL buton)
    if (params.buttonParams?.length) {
      params.buttonParams.forEach((url, index) => {
        components.push({
          type: 'button',
          sub_type: 'url',
          index,
          parameters: [{ type: 'text', text: url }],
        })
      })
    }

    return this.request<WhatsAppMessageResponse>(
      `${this.phoneNumberId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: params.to,
          type: 'template',
          template: {
            name: params.templateName,
            language: { code: params.language },
            components,
          },
        }),
      }
    )
  }

  /**
   * CTA URL butonlu mesaj gonder — tiklaninca link acar
   */
  async sendCtaUrlMessage(params: {
    to: string
    header: string
    body: string
    footer?: string
    buttonText: string
    url: string
  }): Promise<WhatsAppMessageResponse> {
    return this.request<WhatsAppMessageResponse>(
      `${this.phoneNumberId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: params.to,
          type: 'interactive',
          interactive: {
            type: 'cta_url',
            header: {
              type: 'text',
              text: params.header,
            },
            body: { text: params.body },
            ...(params.footer && { footer: { text: params.footer } }),
            action: {
              name: 'cta_url',
              parameters: {
                display_text: params.buttonText,
                url: params.url,
              },
            },
          },
        }),
      }
    )
  }

  /**
   * Reply butonlu mesaj gonder (yanitlama icin)
   */
  private async sendInteractiveMessage(params: {
    to: string
    type: string
    header?: Record<string, unknown>
    body: { text: string }
    footer?: { text: string }
    action: Record<string, unknown>
  }): Promise<WhatsAppMessageResponse> {
    return this.request<WhatsAppMessageResponse>(
      `${this.phoneNumberId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: params.to,
          type: 'interactive',
          interactive: {
            type: params.type,
            header: params.header,
            body: params.body,
            footer: params.footer,
            action: params.action,
          },
        }),
      }
    )
  }

  // ==================== WEBHOOK ====================

  /**
   * Webhook imza dogrulama
   */
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', this.appSecret)
      .update(rawBody)
      .digest('hex')

    const expected = `sha256=${expectedSignature}`

    try {
      return crypto.timingSafeEqual(
        Buffer.from(expected),
        Buffer.from(signature)
      )
    } catch {
      return false
    }
  }

  // ==================== HELPERS ====================

  /**
   * Telefon numarasini WhatsApp formatina cevir
   * +90 5XX -> 905XX (basi sifirsa at, + isareti varsa at)
   */
  private formatPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/[\s\-\(\)\+]/g, '')

    // Turkiye numarasi: basinda 0 varsa kaldir, 90 ekle
    if (cleaned.startsWith('0') && cleaned.length === 11) {
      cleaned = '90' + cleaned.substring(1)
    }

    // 90 ile baslamiyorsa ekle
    if (!cleaned.startsWith('90') && cleaned.length === 10) {
      cleaned = '90' + cleaned
    }

    return cleaned
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${WHATSAPP_API_URL}/${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(`WhatsApp API Error: ${response.status} - ${JSON.stringify(error)}`)
    }

    return response.json()
  }
}
