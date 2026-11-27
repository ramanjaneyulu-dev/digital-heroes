import { demoProvider } from "./demo";
import { stripeProvider } from "./stripe";
import type { PaymentProvider } from "./types";

export function getPaymentProvider(): PaymentProvider {
  const name = process.env.PAYMENT_PROVIDER ?? "demo";
  switch (name) {
    case "stripe":
      return stripeProvider;
    case "demo":
      return demoProvider;
    default:
      throw new Error(`Payment provider "${name}" is not configured.`);
  }
}

export function isDemoMode(): boolean {
  return (process.env.PAYMENT_PROVIDER ?? "demo") === "demo";
}