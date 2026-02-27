import axios, { AxiosError } from 'axios';

interface SalesforceAuthResponse {
  access_token: string;
  instance_url: string;
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
  username: string;
  password: string;
  securityToken?: string;
  loginUrl: string;
};

class SalesforceService {
  private readonly apiVersion = 'v60.0';
  private readonly maxRetries = 2;
  private readonly timeoutMs = 15000;

  private getConfig(): Config {
    return {
      clientId: process.env.SALESFORCE_CLIENT_ID || process.env.SF_CLIENT_ID || '',
      clientSecret: process.env.SALESFORCE_CLIENT_SECRET || process.env.SF_CLIENT_SECRET || '',
      username: process.env.SALESFORCE_USERNAME || process.env.SF_USERNAME || '',
      password: process.env.SALESFORCE_PASSWORD || process.env.SF_PASSWORD || '',
      securityToken: process.env.SALESFORCE_SECURITY_TOKEN || process.env.SF_SECURITY_TOKEN,
      loginUrl: (
        process.env.SALESFORCE_LOGIN_URL ||
        process.env.SF_INSTANCE_URL ||
        'https://login.salesforce.com'
      ).replace(/\/$/, '')
    };
  }

  isConfigured(): boolean {
    const config = this.getConfig();
    return !!(config.clientId && config.clientSecret && config.username && config.password);
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
      grant_type: 'password',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      username: config.username,
      password: `${config.password}${config.securityToken || ''}`
    });

    const response = await this.requestWithRetry<SalesforceAuthResponse>({
      method: 'POST',
      url: `${config.loginUrl}/services/oauth2/token`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: params.toString()
    });

    return response.data;
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
