import axios, { AxiosError } from 'axios';

interface SalesforceAuthResponse {
  access_token: string;
  instance_url: string;
  token_type: string;
}

interface SalesforceTokenResponse {
  access_token: string;
  instance_url?: string;
  token_type: string;
}

interface ContactLeadInput {
  submissionId: string;
  firstName: string;
  lastName: string;
  email: string;
  message: string;
  pageUrl?: string;
}

interface SalesforceLeadResult {
  success: boolean;
  leadId?: string;
  errorMessage?: string;
}

type Config = {
  clientId: string;
  clientSecret: string;
  loginUrl: string;
  instanceUrl?: string;
  scope?: string;
};

class SalesforceService {
  private readonly apiVersion = 'v60.0';
  private readonly maxRetries = 2;
  private readonly timeoutMs = 15000;

  private getConfig(): Config {
    return {
      clientId: process.env.SALESFORCE_CLIENT_ID || process.env.SF_CLIENT_ID || '',
      clientSecret: process.env.SALESFORCE_CLIENT_SECRET || process.env.SF_CLIENT_SECRET || '',
      loginUrl: (
        process.env.SALESFORCE_LOGIN_URL ||
        'https://login.salesforce.com'
      ).replace(/\/$/, ''),
      instanceUrl: (
        process.env.SALESFORCE_INSTANCE_URL ||
        process.env.SF_INSTANCE_URL ||
        ''
      ).replace(/\/$/, '') || undefined,
      scope: process.env.SALESFORCE_SCOPE || process.env.SF_SCOPE
    };
  }

  isConfigured(): boolean {
    const config = this.getConfig();
    return !!(config.clientId && config.clientSecret);
  }

  async createLeadFromContact(input: ContactLeadInput): Promise<SalesforceLeadResult> {
    if (!this.isConfigured()) {
      const message = 'Salesforce not configured, skipping lead sync';
      console.warn(`[SalesforceService] ${message}`);
      return { success: false, errorMessage: message };
    }

    try {
      const auth = await this.authenticate();
      const leadPayload = this.mapContactToLead(input);

      const response = await this.requestWithRetry<{ id: string }>({
        method: 'POST',
        url: `${auth.instance_url}/services/data/${this.apiVersion}/sobjects/Lead`,
        headers: {
          Authorization: `Bearer ${auth.access_token}`,
          'Content-Type': 'application/json'
        },
        data: leadPayload
      });

      console.log(`[SalesforceService] Lead created for submission ${input.submissionId}: ${response.data.id}`);
      return { success: true, leadId: response.data.id };
    } catch (error: any) {
      const errorMessage = this.formatAxiosError(error);
      console.error(`[SalesforceService] Failed to create lead for ${input.submissionId}: ${errorMessage}`);
      return { success: false, errorMessage };
    }
  }

  private async authenticate(): Promise<SalesforceAuthResponse> {
    const config = this.getConfig();
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: config.clientId,
      client_secret: config.clientSecret
    });
    if (config.scope) {
      params.set('scope', config.scope);
    }

    const response = await this.requestWithRetry<SalesforceTokenResponse>({
      method: 'POST',
      url: `${config.loginUrl}/services/oauth2/token`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: params.toString()
    });

    const instanceUrl = response.data.instance_url || config.instanceUrl;
    if (!instanceUrl) {
      throw new Error('Salesforce token response missing instance_url. Set SALESFORCE_INSTANCE_URL.');
    }

    return {
      ...response.data,
      instance_url: instanceUrl
    };
  }

  private mapContactToLead(input: ContactLeadInput): Record<string, string> {
    const descriptionLines = [
      `Website contact form submission ID: ${input.submissionId}`,
      input.pageUrl ? `Page URL: ${input.pageUrl}` : undefined,
      '',
      'Message:',
      input.message
    ].filter(Boolean);

    return {
      FirstName: input.firstName,
      LastName: input.lastName,
      Email: input.email,
      Company: 'Forza Built Website',
      LeadSource: 'Website Contact Form',
      Description: descriptionLines.join('\n')
    };
  }

  private async requestWithRetry<T>(requestConfig: {
    method: 'POST';
    url: string;
    headers: Record<string, string>;
    data: string | Record<string, unknown>;
  }) {
    let attempt = 0;

    while (true) {
      try {
        return await axios.request<T>({
          ...requestConfig,
          timeout: this.timeoutMs
        });
      } catch (error: any) {
        const retryable = this.isRetryable(error);
        if (!retryable || attempt >= this.maxRetries) {
          throw error;
        }

        attempt += 1;
        const backoffMs = Math.pow(2, attempt) * 500;
        console.warn(`[SalesforceService] Retry ${attempt}/${this.maxRetries} after ${backoffMs}ms`);
        await this.delay(backoffMs);
      }
    }
  }

  private isRetryable(error: AxiosError | Error): boolean {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND' || error.code === 'ECONNRESET') {
        return true;
      }

      const status = error.response?.status;
      return !!status && status >= 500;
    }

    return false;
  }

  private formatAxiosError(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const responseData = error.response?.data;
      if (responseData && typeof responseData === 'object') {
        return `HTTP ${status ?? 'unknown'} - ${JSON.stringify(responseData)}`;
      }

      return `HTTP ${status ?? 'unknown'} - ${error.message}`;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown Salesforce error';
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const salesforceService = new SalesforceService();
