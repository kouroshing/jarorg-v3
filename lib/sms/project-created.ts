import { getAdminPhoneDigits } from "@/lib/auth/admin";
import { phoneToLocalDisplay } from "@/lib/auth/phone";
import { getServiceTypeLabel } from "@/lib/projects/services";
import { sendSmsByPattern } from "@/lib/sms/ippanel";

function getAdminNotificationPatternCode(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_ADMIN_NOTIF_PATTERN_CODE?.trim() ||
    process.env.IPPANEL_PATTERN_ADMIN?.trim() ||
    undefined
  );
}

export type ProjectCreatedSmsPayload = {
  contactPhone: string;
  contactName: string;
  serviceType: string;
  projectId: string;
};

/**
 * Fire-and-forget SMS after a project is saved. Never throws to the caller.
 */
export function sendProjectCreatedSmsNotifications(
  payload: ProjectCreatedSmsPayload
): void {
  void dispatchProjectCreatedSms(payload);
}

async function dispatchProjectCreatedSms(
  payload: ProjectCreatedSmsPayload
): Promise<void> {
  const customerPattern = process.env.IPPANEL_PATTERN_CUSTOMER?.trim();
  const adminPattern = getAdminNotificationPatternCode();

  if (!customerPattern && !adminPattern) {
    return;
  }

  const service = getServiceTypeLabel(payload.serviceType);
  const phoneDisplay = phoneToLocalDisplay(payload.contactPhone);

  const tasks: Promise<void>[] = [];

  if (customerPattern) {
    tasks.push(
      sendPatternSafe("customer", payload.projectId, () =>
        sendSmsByPattern({
          recipient: payload.contactPhone,
          patternCode: customerPattern,
          patternValues: {
            name: payload.contactName,
            service,
          },
        })
      )
    );
  }

  const adminPhone = getAdminPhoneDigits();
  if (adminPattern && adminPhone) {
    tasks.push(
      sendPatternSafe("admin", payload.projectId, () =>
        sendSmsByPattern({
          recipient: adminPhone,
          patternCode: adminPattern,
          patternValues: {
            name: payload.contactName,
            phone: phoneDisplay,
            service,
          },
        })
      )
    );
  }

  await Promise.allSettled(tasks);
}

async function sendPatternSafe(
  audience: "customer" | "admin",
  projectId: string,
  send: () => Promise<unknown>
): Promise<void> {
  try {
    await send();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[sms] ${audience} pattern failed for project ${projectId}:`,
      message
    );
  }
}
