import { demoProvider } from "./demo";
import type { PaymentProvider } from "./types";

// Choose the gateway with PAYMENT_PROVIDER in .env.local.
// To add Razorpay or Stripe: create razorpay.ts implementing PaymentProvider, add a case here.
export function getPaymentProvider(): PaymentProvider {
  const name = process.env.PAYMENT_PROVIDER ?? "demo";
  switch (name) {
    case "demo":
      return demoProvider;
    default:
      throw new Error(`Payment provider "${name}" is not configured.`);
  }
}

export function isDemoMode(): boolean {
  return (process.env.PAYMENT_PROVIDER ?? "demo") === "demo";
}
