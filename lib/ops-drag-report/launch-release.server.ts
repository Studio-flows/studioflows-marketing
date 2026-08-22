import { types } from "node:util";

import {
  CUSTOMER_LAUNCH_GATE_KEYS,
  OPS_DRAG_CUSTOMER_CONTRACT,
  type CustomerContractRuntimeGates,
} from "./accepted-contract.ts";

export function isCompleteCustomerLaunchRelease(gates: unknown): gates is CustomerContractRuntimeGates {
  try {
    if (types.isProxy(gates)) return false;
    if (gates === null || typeof gates !== "object" || Array.isArray(gates)) return false;
    if (Object.getPrototypeOf(gates) !== Object.prototype) return false;
    const ownKeys = Reflect.ownKeys(gates);
    if (
      ownKeys.length !== CUSTOMER_LAUNCH_GATE_KEYS.length ||
      ownKeys.some((key) => typeof key !== "string" || !CUSTOMER_LAUNCH_GATE_KEYS.includes(key as never))
    ) return false;
    const descriptors = Object.getOwnPropertyDescriptors(gates);
    return CUSTOMER_LAUNCH_GATE_KEYS.every((key) => {
      const descriptor = descriptors[key];
      return descriptor !== undefined && "value" in descriptor && descriptor.value === true;
    });
  } catch {
    return false;
  }
}

export function resolveCustomerContractRuntime(gates: unknown) {
  const launchReleased = isCompleteCustomerLaunchRelease(gates);
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
