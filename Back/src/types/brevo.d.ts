declare module '@getbrevo/brevo' {
  export class BrevoClient {
    constructor(config: { apiKey: string });
    transactionalEmails: {
      sendTransacEmail(payload: {
        htmlContent: string;
        sender: { email: string };
        subject: string;
        to: Array<{ email: string }>;
      }): Promise<unknown>;
    };
  }
}
