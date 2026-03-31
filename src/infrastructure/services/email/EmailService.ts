import { Resend } from 'resend';
import { Logger } from '@/infrastructure/logger';

interface ProposalData {
  id: string;
  number: string;
  clientName: string;
  clientEmail: string;
  amount: number;
  currency: string;
  validUntil: Date;
  createdBy?: string;
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export class EmailService {
  private _resend: Resend | null = null;
  private logger: Logger;
  private fromEmail: string;

  constructor() {
    this.logger = new Logger('EmailService');
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@teklifpro.com';
  }

  private get resend(): Resend {
    if (!this._resend) {
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        throw new Error('RESEND_API_KEY environment variable is required');
      }
      this._resend = new Resend(apiKey);
    }
    return this._resend;
  }

  /**
   * Sends proposal notification when proposal is sent to customer
   */
  async sendProposalNotification(to: string, proposal: ProposalData): Promise<boolean> {
    try {
      const viewUrl = `${process.env.NEXT_PUBLIC_APP_URL}/proposals/${proposal.id}/view`;

      const html = this.buildProposalNotificationTemplate({
        clientName: proposal.clientName,
        proposalNumber: proposal.number,
        amount: proposal.amount,
        currency: proposal.currency,
        validUntil: proposal.validUntil,
        viewUrl,
      });

      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject: `Teklif ${proposal.number} - ${proposal.clientName}`,
        html,
      });

      if (result.error) {
        this.logger.error('Failed to send proposal notification', result.error);
        return false;
      }

      this.logger.info('Proposal notification sent', {
        proposalId: proposal.id,
        to,
      });

      return true;
    } catch (error) {
      this.logger.error('Error sending proposal notification', error);
      return false;
    }
  }

  /**
   * Notifies proposal owner when customer accepts proposal
   */
  async sendProposalAccepted(to: string, proposal: ProposalData): Promise<boolean> {
    try {
      const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/proposals/${proposal.id}`;

      const html = this.buildProposalAcceptedTemplate({
        clientName: proposal.clientName,
        proposalNumber: proposal.number,
        amount: proposal.amount,
        currency: proposal.currency,
        dashboardUrl,
      });

      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject: `Teklif Kabul Edildi: ${proposal.number}`,
        html,
      });

      if (result.error) {
        this.logger.error('Failed to send proposal accepted email', result.error);
        return false;
      }

      this.logger.info('Proposal accepted notification sent', {
        proposalId: proposal.id,
        to,
      });

      return true;
    } catch (error) {
      this.logger.error('Error sending proposal accepted email', error);
      return false;
    }
  }

  /**
   * Notifies proposal owner when customer rejects proposal
   */
  async sendProposalRejected(to: string, proposal: ProposalData): Promise<boolean> {
    try {
      const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/proposals/${proposal.id}`;

      const html = this.buildProposalRejectedTemplate({
        clientName: proposal.clientName,
        proposalNumber: proposal.number,
        dashboardUrl,
      });

      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject: `Teklif Reddedildi: ${proposal.number}`,
        html,
      });

      if (result.error) {
        this.logger.error('Failed to send proposal rejected email', result.error);
        return false;
      }

      this.logger.info('Proposal rejected notification sent', {
        proposalId: proposal.id,
        to,
      });

      return true;
    } catch (error) {
      this.logger.error('Error sending proposal rejected email', error);
      return false;
    }
  }

  /**
   * Notifies about revision request
   */
  async sendProposalRevisionRequested(
    to: string,
    proposal: ProposalData,
    note: string,
  ): Promise<boolean> {
    try {
      const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/proposals/${proposal.id}`;

      const html = this.buildProposalRevisionTemplate({
        clientName: proposal.clientName,
        proposalNumber: proposal.number,
        note,
        dashboardUrl,
      });

      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject: `Revizyon İsteği: ${proposal.number}`,
        html,
      });

      if (result.error) {
        this.logger.error('Failed to send revision request email', result.error);
        return false;
      }

      this.logger.info('Revision request notification sent', {
        proposalId: proposal.id,
        to,
      });

      return true;
    } catch (error) {
      this.logger.error('Error sending revision request email', error);
      return false;
    }
  }

  /**
   * Sends welcome email after registration
   */
  async sendWelcomeEmail(to: string, name: string): Promise<boolean> {
    try {
      const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`;

      const html = this.buildWelcomeTemplate({
        name,
        dashboardUrl,
      });

      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject: 'TeklifPro\'ya Hoş Geldiniz',
        html,
      });

      if (result.error) {
        this.logger.error('Failed to send welcome email', result.error);
        return false;
      }

      this.logger.info('Welcome email sent', { to });
      return true;
    } catch (error) {
      this.logger.error('Error sending welcome email', error);
      return false;
    }
  }

  /**
   * Sends trial expiry reminder
   */
  async sendTrialExpiring(to: string, name: string, daysLeft: number): Promise<boolean> {
    try {
      const upgradeUrl = `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=subscription`;

      const html = this.buildTrialExpiringTemplate({
        name,
        daysLeft,
        upgradeUrl,
      });

      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject: `Deneme Süresi ${daysLeft} Gün Kaldı`,
        html,
      });

      if (result.error) {
        this.logger.error('Failed to send trial expiring email', result.error);
        return false;
      }

      this.logger.info('Trial expiring reminder sent', { to, daysLeft });
      return true;
    } catch (error) {
      this.logger.error('Error sending trial expiring email', error);
      return false;
    }
  }

  /**
   * Sends email verification email
   */
  async sendVerificationEmail(to: string, html: string): Promise<boolean> {
    try {
      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject: 'E-posta Doğrulaması - TeklifPro',
        html,
      });

      if (result.error) {
        this.logger.error('Failed to send verification email', result.error);
        return false;
      }

      this.logger.info('Verification email sent', { to });
      return true;
    } catch (error) {
      this.logger.error('Error sending verification email', error);
      return false;
    }
  }

  /**
   * Sends password reset email
   */
  async sendPasswordResetEmail(to: string, html: string): Promise<boolean> {
    try {
      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject: 'Şifre Sıfırlama - TeklifPro',
        html,
      });

      if (result.error) {
        this.logger.error('Failed to send password reset email', result.error);
        return false;
      }

      this.logger.info('Password reset email sent', { to });
      return true;
    } catch (error) {
      this.logger.error('Error sending password reset email', error);
      return false;
    }
  }

  // ============== Email Template Builders ==============

  private buildProposalNotificationTemplate({
    clientName,
    proposalNumber,
    amount,
    currency,
    validUntil,
    viewUrl,
  }: {
    clientName: string;
    proposalNumber: string;
    amount: number;
    currency: string;
    validUntil: Date;
    viewUrl: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
            .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
            .button { background: #667eea; color: white; padding: 12px 30px; border-radius: 5px; text-decoration: none; display: inline-block; margin: 20px 0; }
            .amount { font-size: 24px; font-weight: bold; color: #667eea; }
            .info-box { background: white; padding: 15px; border-left: 4px solid #667eea; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Teklif Gönderildi</h1>
            </div>
            <div class="content">
              <p>Merhaba,</p>
              <p><strong>${clientName}</strong> için yeni bir teklif oluşturdunuz.</p>

              <div class="info-box">
                <p><strong>Teklif No:</strong> ${proposalNumber}</p>
                <p><strong>Tutar:</strong> <span class="amount">${amount.toLocaleString('tr-TR')} ${currency}</span></p>
                <p><strong>Geçerlilik:</strong> ${validUntil.toLocaleDateString('tr-TR')}</p>
              </div>

              <p>Teklifi görmek için aşağıdaki butona tıklayın:</p>
              <a href="${viewUrl}" class="button">Teklifi Görüntüle</a>

              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                Bu teklif müşterinizin tarafından görüntülenebilir ve yanıtlanabilir.
              </p>
            </div>
            <div class="footer">
              <p>&copy; 2026 TeklifPro. Tüm hakları saklıdır.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private buildProposalAcceptedTemplate({
    clientName,
    proposalNumber,
    amount,
    currency,
    dashboardUrl,
  }: {
    clientName: string;
    proposalNumber: string;
    amount: number;
    currency: string;
    dashboardUrl: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
            .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
            .button { background: #10b981; color: white; padding: 12px 30px; border-radius: 5px; text-decoration: none; display: inline-block; margin: 20px 0; }
            .success-icon { font-size: 48px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="success-icon">✓</div>
              <h1>Teklif Kabul Edildi!</h1>
            </div>
            <div class="content">
              <p><strong>${clientName}</strong> sizin ${proposalNumber} nolu teklifinizi kabul etti!</p>

              <p style="font-size: 16px; margin: 20px 0;">
                <strong>Teklif Tutarı:</strong> ${amount.toLocaleString('tr-TR')} ${currency}
              </p>

              <p>Sonraki adımlar için panonuza dönün:</p>
              <a href="${dashboardUrl}" class="button">Panoya Git</a>
            </div>
            <div class="footer">
              <p>&copy; 2026 TeklifPro. Tüm hakları saklıdır.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private buildProposalRejectedTemplate({
    clientName,
    proposalNumber,
    dashboardUrl,
  }: {
    clientName: string;
    proposalNumber: string;
    dashboardUrl: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
            .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
            .button { background: #ef4444; color: white; padding: 12px 30px; border-radius: 5px; text-decoration: none; display: inline-block; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Teklif Reddedildi</h1>
            </div>
            <div class="content">
              <p><strong>${clientName}</strong> sizin ${proposalNumber} nolu teklifinizi reddetti.</p>

              <p>Detaylar için panonuza dönebilir ve müşteri ile iletişime geçebilirsiniz:</p>
              <a href="${dashboardUrl}" class="button">Detayları Görüntüle</a>
            </div>
            <div class="footer">
              <p>&copy; 2026 TeklifPro. Tüm hakları saklıdır.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private buildProposalRevisionTemplate({
    clientName,
    proposalNumber,
    note,
    dashboardUrl,
  }: {
    clientName: string;
    proposalNumber: string;
    note: string;
    dashboardUrl: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
            .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
            .button { background: #f59e0b; color: white; padding: 12px 30px; border-radius: 5px; text-decoration: none; display: inline-block; margin: 20px 0; }
            .note-box { background: white; padding: 15px; border-left: 4px solid #f59e0b; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Revizyon İsteği</h1>
            </div>
            <div class="content">
              <p><strong>${clientName}</strong> ${proposalNumber} nolu teklifiniz için bir revizyon istedi.</p>

              <div class="note-box">
                <p><strong>Not:</strong></p>
                <p>${note}</p>
              </div>

              <p>Teklifinizi güncellemek için aşağıdaki butona tıklayın:</p>
              <a href="${dashboardUrl}" class="button">Teklifi Güncelle</a>
            </div>
            <div class="footer">
              <p>&copy; 2026 TeklifPro. Tüm hakları saklıdır.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private buildWelcomeTemplate({
    name,
    dashboardUrl,
  }: {
    name: string;
    dashboardUrl: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
            .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
            .button { background: #667eea; color: white; padding: 12px 30px; border-radius: 5px; text-decoration: none; display: inline-block; margin: 20px 0; }
            .features { margin: 20px 0; }
            .feature-item { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>TeklifPro\'ya Hoş Geldiniz</h1>
            </div>
            <div class="content">
              <p>Merhaba <strong>${name}</strong>,</p>

              <p>TeklifPro ailesi olduğunuz için teşekkür ederiz! Profesyonel teklifleri hazırlamaya başlayabilirsiniz.</p>

              <div class="features">
                <p><strong>Şimdi yapabilecekleriniz:</strong></p>
                <div class="feature-item">✓ Profesyonel teklifler oluşturun</div>
                <div class="feature-item">✓ Müşterilerinizle teklifleri paylaşın</div>
                <div class="feature-item">✓ Paraşüt muhasebe sistemi ile entegre olun</div>
                <div class="feature-item">✓ Takım üyeleri ekleyin</div>
              </div>

              <p>Hemen başlamak için panonuza gidin:</p>
              <a href="${dashboardUrl}" class="button">Panoya Git</a>

              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                Herhangi bir sorunuz varsa bizimle iletişime geçmekten çekinmeyin.
              </p>
            </div>
            <div class="footer">
              <p>&copy; 2026 TeklifPro. Tüm hakları saklıdır.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private buildTrialExpiringTemplate({
    name,
    daysLeft,
    upgradeUrl,
  }: {
    name: string;
    daysLeft: number;
    upgradeUrl: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
            .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
            .button { background: #f59e0b; color: white; padding: 12px 30px; border-radius: 5px; text-decoration: none; display: inline-block; margin: 20px 0; }
            .countdown { font-size: 32px; font-weight: bold; color: #f59e0b; text-align: center; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Deneme Süresi Sona Uzmak</h1>
            </div>
            <div class="content">
              <p>Merhaba <strong>${name}</strong>,</p>

              <p>Sizin deneme süresi <strong>${daysLeft} gün</strong> içinde sona erecektir.</p>

              <div class="countdown">${daysLeft}</div>

              <p>Devam etmek ve tüm özellikleri kullanmak için lütfen bir plan seçin:</p>
              <a href="${upgradeUrl}" class="button">Şimdi Yükselt</a>

              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                Deneme süresi sona erdikten sonra teklifleri görüntüleyebileceksiniz ama yenisini oluşturamayacaksınız.
              </p>
            </div>
            <div class="footer">
              <p>&copy; 2026 TeklifPro. Tüm hakları saklıdır.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}

export const emailService = new EmailService();
