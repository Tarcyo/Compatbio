import Stripe from "stripe";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`ENV ausente: ${name}`);
  return v;
}

export const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
  apiVersion: "2026-01-28.clover",
});
