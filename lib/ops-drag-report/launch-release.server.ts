import { release as nodeRelease } from "node:process";

import { OPS_DRAG_CUSTOMER_CONTRACT } from "./accepted-contract.ts";

if (nodeRelease.name !== "node") {
  throw new Error("Customer launch release envelopes require the Node.js server runtime");
}

declare const customerLaunchReleaseEnvelopeBrand: unique symbol;

export type CustomerLaunchReleaseEnvelope = Readonly<{
  [customerLaunchReleaseEnvelopeBrand]: "CustomerLaunchReleaseEnvelope";
}>;

const releaseDispositionByEnvelope = new WeakMap<CustomerLaunchReleaseEnvelope, boolean>();

export function createCustomerLaunchReleaseEnvelope(
  sourceHashesAccepted: unknown,
  managedPaymentsAccepted: unknown,
  taxConfigurationAccepted: unknown,
  providerRuntimeAccepted: unknown,
  productionReleaseAccepted: unknown,
  dependencySecurityAccepted: unknown,
  campaignControlsAccepted: unknown,
  kiroLaunchReleased: unknown,
): CustomerLaunchReleaseEnvelope {
  const launchReleased =
    arguments.length === 8 &&
    sourceHashesAccepted === true &&
    managedPaymentsAccepted === true &&
    taxConfigurationAccepted === true &&
    providerRuntimeAccepted === true &&
    productionReleaseAccepted === true &&
    dependencySecurityAccepted === true &&
    campaignControlsAccepted === true &&
    kiroLaunchReleased === true;
  const envelope = Object.freeze(Object.create(null)) as CustomerLaunchReleaseEnvelope;
  releaseDispositionByEnvelope.set(envelope, launchReleased);
  return envelope;
}

export function resolveCustomerContractRuntime(envelope: CustomerLaunchReleaseEnvelope) {
  const launchReleased = releaseDispositionByEnvelope.get(envelope) === true;
  return {
    launchReleased,
    cta: launchReleased ? OPS_DRAG_CUSTOMER_CONTRACT.cta : null,
    purchaseAction: launchReleased ? "/ops-drag-report/intake" : null,
    geography: launchReleased ? OPS_DRAG_CUSTOMER_CONTRACT.geography : null,
    checkout: launchReleased ? OPS_DRAG_CUSTOMER_CONTRACT.howItWorks[1] : null,
    delivery: launchReleased
      ? {
          receives: OPS_DRAG_CUSTOMER_CONTRACT.runtimeReceives,
          step: OPS_DRAG_CUSTOMER_CONTRACT.howItWorks[2],
        }
      : null,
    supportRefund: launchReleased ? OPS_DRAG_CUSTOMER_CONTRACT.supportRefund : null,
  };
}
