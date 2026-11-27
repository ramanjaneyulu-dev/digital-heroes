// Every payment gateway (demo, Razorpay, Stripe...) implements this one interface,
// so the rest of the app never depends on a specific provider.
export interface PaymentProvider {
  readonly name: string;
  /** Where the customer goes to pay for an existing checkout session. */
  getCheckoutUrl(sessionId: string): string | Promise<string>;
  /** Ask the provider to stop future renewals. */
  cancelSubscription(providerSubscriptionId: string | null): Promise<void>;
}
