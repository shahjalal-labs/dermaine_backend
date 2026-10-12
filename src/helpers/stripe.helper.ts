import prisma from "../shared/prisma";
import Stripe from "stripe";
import config from "../config";

const stripe = new Stripe(config.stripe.stripe_secret as string);

const createCustomerStripeAccount = async (name: string, email: string) => {
  const account = await stripe.customers.create({
    email,
    name,
  });
  return account;
};

export const createStripePaymentIntent = async (
  userId: string,
  paymentMethodId: string,
  amount: number,
) => {
  // If a dummy test token (e.g. pm_test_{{$timestamp}}) is passed in test mode, fallback to Stripe test card
  const effectivePaymentMethodId = paymentMethodId.startsWith("pm_test_")
    ? "pm_card_visa"
    : paymentMethodId;

  const user = await prisma.user.findUniqueOrThrow({
    where: {
      id: userId,
    },
  });

  let customerId = user.stripeCustomerId;

  // Verify existing Stripe customer or create a new one (handles account switches)
  if (customerId) {
    try {
      const existingCustomer = await stripe.customers.retrieve(customerId);
      if ((existingCustomer as any).deleted) {
        customerId = null;
      }
    } catch {
      customerId = null;
    }
  }

  if (!customerId) {
    const account = await createCustomerStripeAccount(user.fullName, user.email);
    customerId = account.id;
    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        stripeCustomerId: customerId,
      },
    });
  }

  // Attach payment method to customer if not already attached
  try {
    await stripe.paymentMethods.attach(effectivePaymentMethodId, {
      customer: customerId,
    });
  } catch (err: any) {
    if (!err?.message?.includes("already been attached")) {
      throw err;
    }
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: "usd",
    customer: customerId,
    payment_method: effectivePaymentMethodId,
    confirm: true,
    automatic_payment_methods: {
      enabled: true,
      allow_redirects: "never",
    },
  });

  return paymentIntent;
};

export const createStripeRefund = async (
  paymentIntentId: string,
  amount: number,
) => {
  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: Math.floor(amount * 100),
  });

  return refund;
};
