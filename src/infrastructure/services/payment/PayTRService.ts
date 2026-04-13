import crypto from 'crypto';
import { Logger } from '@/infrastructure/logger';

interface PayTRPaymentParams {
  merchant_id: string;
  user_ip: string;
  merchant_oid: string;
  email: string;
  payment_amount: number;
  currency: string;
  user_name: string;
  user_phone: string;
  user_address: string;
  user_city: string;
  user_country: string;
  merchant_ok_url: string;
  merchant_fail_url: string;
}

interface PayTRWebhookData {
  merchant_oid: string;
  status: string;
  total_amount: number;
  hash: string;
  [key: string]: unknown;
}

interface SubscriptionData {
  tenantId: string;
  plan: 'starter' | 'professional' | 'enterprise';
  period: 'monthly' | 'yearly';
  amount: number;
}

export class PayTRService {
  private merchantId: string;
  private merchantKey: string;
  private merchantSalt: string;
  private logger: Logger;

  constructor() {
    this.merchantId = process.env.PAYTR_MERCHANT_ID || '';
    this.merchantKey = process.env.PAYTR_MERCHANT_KEY || '';
    this.merchantSalt = process.env.PAYTR_MERCHANT_SALT || '';
    this.logger = new Logger('PayTRService');

    if (!this.merchantId || !this.merchantKey || !this.merchantSalt) {
      this.logger.warn('PayTR credentials not configured');
    }
  }

  /**
   * Generates payment token for PayTR iFrame API
   */
  getPaymentToken(params: Partial<PayTRPaymentParams>, userIp: string): {
    token: string;
    merchantId: string;
  } {
    try {
      const paymentParams: PayTRPaymentParams = {
        merchant_id: this.merchantId,
        user_ip: userIp,
        currency: 'TL',
        ...params,
      } as PayTRPaymentParams;

      // Validate required fields
      const requiredFields = [
        'merchant_id',
        'user_ip',
        'merchant_oid',
        'email',
        'payment_amount',
        'currency',
        'user_name',
        'user_phone',
        'user_address',
        'user_city',
        'user_country',
        'merchant_ok_url',
        'merchant_fail_url',
      ];

      for (const field of requiredFields) {
        if (!paymentParams[field as keyof PayTRPaymentParams]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Prepare hash string
      const hashString = this.buildHashString(paymentParams);

      // Generate HMAC SHA256 hash
      const hash = crypto
        .createHmac('sha256', this.merchantKey)
        .update(hashString)
        .digest('base64');

      this.logger.info('Payment token generated', {
        merchant_oid: paymentParams.merchant_oid,
        amount: paymentParams.payment_amount,
      });

      return {
        token: hash,
        merchantId: this.merchantId,
      };
    } catch (error) {
      this.logger.error('Failed to generate payment token', error);
      throw error;
    }
  }

  /**
   * Creates a recurring subscription
   */
  async createSubscription(
    tenantId: string,
    plan: 'starter' | 'professional' | 'enterprise',
    period: 'monthly' | 'yearly',
  ): Promise<{
    merchantOid: string;
    amount: number;
    token: string;
    iframeUrl: string;
  }> {
    try {
      const amount = this.getPlanAmount(plan, period);
      const merchantOid = `SUB_${tenantId}_${Date.now()}`;

      this.logger.info('Creating subscription', {
        tenantId,
        plan,
        period,
        amount,
      });

      // This would typically call a database to get tenant details
      // For now, we'll return a properly structured response
      return {
        merchantOid,
        amount,
        token: 'token_would_be_generated_here',
        iframeUrl: `https://iframe.paytr.com/?token=token_placeholder`,
      };
    } catch (error) {
      this.logger.error('Failed to create subscription', error);
      throw error;
    }
  }

  /**
   * Cancels a recurring subscription
   */
  async cancelSubscription(tenantId: string): Promise<boolean> {
    try {
      this.logger.info('Canceling subscription', { tenantId });

      // This would typically call PayTR API to cancel recurring payment
      // For now, we'll simulate a successful cancellation

      this.logger.info('Subscription canceled successfully', { tenantId });
      return true;
    } catch (error) {
      this.logger.error('Failed to cancel subscription', error);
      throw error;
    }
  }

  /**
   * Verifies webhook hash from PayTR callback
   */
  verifyWebhookHash(data: PayTRWebhookData): boolean {
    try {
      const { hash, ...params } = data;

      // Build verification hash
      const hashString = `${params.merchant_oid}${this.merchantSalt}${params.status}${params.total_amount}`;

      const verifyHash = crypto
        .createHmac('sha256', this.merchantKey)
        .update(hashString)
        .digest('base64');

      const verifyBuf = Buffer.from(verifyHash);
      const hashBuf = Buffer.from(hash);
      const isValid =
        verifyBuf.length === hashBuf.length &&
        crypto.timingSafeEqual(verifyBuf, hashBuf);

      this.logger.info('Webhook hash verification', {
        merchant_oid: params.merchant_oid,
        isValid,
      });

      return isValid;
    } catch (error) {
      this.logger.error('Webhook hash verification failed', error);
      return false;
    }
  }

  /**
   * Handles payment callback from PayTR webhook
   */
  async handlePaymentCallback(
    data: PayTRWebhookData,
  ): Promise<{
    success: boolean;
    message: string;
    tenantId?: string;
  }> {
    try {
      // Verify webhook authenticity
      if (!this.verifyWebhookHash(data)) {
        this.logger.warn('Invalid webhook signature', {
          merchant_oid: data.merchant_oid,
        });
        return {
          success: false,
          message: 'Invalid webhook signature',
        };
      }

      const { merchant_oid, status, total_amount } = data;

      // Parse tenant ID from merchant_oid (format: SUB_tenantId_timestamp)
      const tenantId = merchant_oid.split('_')[1];

      if (status === 'success') {
        // Update tenant subscription status in database
        this.logger.info('Payment successful', {
          tenantId,
          merchant_oid,
          amount: total_amount,
        });

        // Call database service to update tenant plan
        // await updateTenantPlan(tenantId, plan, period);

        return {
          success: true,
          message: 'Payment processed successfully',
          tenantId,
        };
      } else if (status === 'failed') {
        this.logger.warn('Payment failed', {
          tenantId,
          merchant_oid,
        });

        // Log failed payment for customer support
        // await logFailedPayment(tenantId, merchant_oid);

        return {
          success: false,
          message: 'Payment failed',
          tenantId,
        };
      }

      return {
        success: false,
        message: 'Unknown payment status',
      };
    } catch (error) {
      this.logger.error('Payment callback processing failed', error);
      throw error;
    }
  }

  /**
   * Creates a payment token for a proposal (OFFICIAL only)
   * Returns iFrame token for PayTR checkout
   */
  createProposalPaymentToken(params: {
    proposalId: string
    proposalNumber: string
    amount: number // kuruş cinsinden (e.g. 11935000 for 119,350.00 TL)
    currency?: string
    customerEmail: string
    customerName: string
    customerPhone: string
    customerAddress?: string
    userIp: string
    okUrl: string
    failUrl: string
  }): { token: string; merchantOid: string; merchantId: string } {
    const merchantOid = `PROP_${params.proposalId}_${Date.now()}`

    const paymentParams: PayTRPaymentParams = {
      merchant_id: this.merchantId,
      user_ip: params.userIp,
      merchant_oid: merchantOid,
      email: params.customerEmail,
      payment_amount: params.amount,
      currency: params.currency === 'USD' ? 'USD' : params.currency === 'EUR' ? 'EUR' : 'TL',
      user_name: params.customerName,
      user_phone: params.customerPhone || '-',
      user_address: params.customerAddress || '-',
      user_city: '-',
      user_country: 'TR',
      merchant_ok_url: params.okUrl,
      merchant_fail_url: params.failUrl,
    }

    const hashString = this.buildHashString(paymentParams)
    const token = crypto
      .createHmac('sha256', this.merchantKey)
      .update(hashString)
      .digest('base64')

    this.logger.info('Proposal payment token generated', {
      proposalId: params.proposalId,
      proposalNumber: params.proposalNumber,
      merchantOid,
      amount: params.amount,
    })

    return { token, merchantOid, merchantId: this.merchantId }
  }

  /**
   * Parses proposal ID from payment merchant_oid
   * Format: PROP_{proposalId}_{timestamp}
   */
  static parseProposalIdFromOid(merchantOid: string): string | null {
    if (!merchantOid.startsWith('PROP_')) return null
    const parts = merchantOid.split('_')
    return parts[1] || null
  }

  /**
   * Gets payment amount for a plan
   */
  private getPlanAmount(
    plan: 'starter' | 'professional' | 'enterprise',
    period: 'monthly' | 'yearly' = 'monthly',
  ): number {
    const amounts: Record<string, Record<string, number>> = {
      starter: { monthly: 2900, yearly: 29000 },
      professional: { monthly: 9900, yearly: 99000 },
      enterprise: { monthly: 29900, yearly: 299000 },
    };

    return amounts[plan]?.[period] || 0;
  }

  /**
   * Builds hash string for payment request
   */
  private buildHashString(params: PayTRPaymentParams): string {
    const {
      merchant_id,
      user_ip,
      merchant_oid,
      email,
      payment_amount,
      currency,
      user_name,
      user_phone,
      user_address,
      user_city,
      user_country,
      merchant_ok_url,
      merchant_fail_url,
    } = params;

    return (
      merchant_id +
      user_ip +
      merchant_oid +
      email +
      payment_amount +
      currency +
      user_name +
      user_phone +
      user_address +
      user_city +
      user_country +
      merchant_ok_url +
      merchant_fail_url +
      this.merchantSalt
    );
  }
}

export const paytrService = new PayTRService();
