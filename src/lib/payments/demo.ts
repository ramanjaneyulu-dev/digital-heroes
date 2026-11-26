import type { PaymentProvider } from "./types";

// Test-mode gateway: no real money, no card numbers. The checkout page
// (/checkout/[sessionId]) offers "success" and "declined" test outcomes.
export const demoProvider: PaymentProvider = {
  name: "demo",
  getCheckoutUrl: (sessionId) => `/checkout/${sessionId}`,
  async cancelSubscription() {
    // Nothing to do on the provider side for the demo gateway.
  },
};
