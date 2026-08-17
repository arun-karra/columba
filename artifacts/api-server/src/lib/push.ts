import { Expo } from "expo-server-sdk";
import { prisma } from "./prisma";
import { logger } from "./logger";

const expo = new Expo(
  process.env.EXPO_ACCESS_TOKEN
    ? { accessToken: process.env.EXPO_ACCESS_TOKEN }
    : undefined,
);

interface PushOptions {
  urgent?: boolean;
  /** iOS notification category identifier (enables lock-screen actions). */
  categoryId?: string;
  /** Pin to lock screen — highest interruption level allowed without Critical Alerts entitlement. */
  pinned?: boolean;
}

/**
 * Send a push notification to one or more users.
 * The 5th argument accepts either a plain boolean (urgent) for backward
 * compatibility, or an options object.
 */
export async function sendPush(
  userIds: string[],
  title: string,
  body: string,
  data: Record<string, unknown> = {},
  urgentOrOptions: boolean | PushOptions = {},
) {
  if (userIds.length === 0) return;

  const options: PushOptions =
    typeof urgentOrOptions === "boolean"
      ? { urgent: urgentOrOptions }
      : urgentOrOptions;

  const tokens = await prisma.pushToken.findMany({
    where: { userId: { in: userIds } },
    select: { id: true, expoPushToken: true },
  });
  const validTokens = tokens.filter((token) => Expo.isExpoPushToken(token.expoPushToken));
  if (validTokens.length === 0) return;

  const messages = validTokens.map((token) => ({
    to: token.expoPushToken,
    sound: options.urgent || options.pinned ? ("default" as const) : null,
    title,
    body,
    data,
    priority: options.urgent || options.pinned ? ("high" as const) : ("normal" as const),
    ...(options.urgent || options.pinned
      ? { interruptionLevel: "time-sensitive" as const }
      : {}),
    ...(options.categoryId ? { categoryIdentifier: options.categoryId } : {}),
  }));

  for (const chunk of expo.chunkPushNotifications(messages)) {
    try {
      const receipts = await expo.sendPushNotificationsAsync(chunk);
      receipts.forEach((receipt, index) => {
        if (receipt.status === "error" && receipt.details?.error === "DeviceNotRegistered") {
          const token = validTokens[index];
          if (token) void prisma.pushToken.delete({ where: { id: token.id } }).catch(() => undefined);
        }
      });
    } catch (error) {
      logger.error({ err: error }, "Unable to send Expo push notifications");
    }
  }
}

/**
 * Send a silent data-only push that tells the app to dismiss the
 * persistent notification for a given note (e.g. when the note is
 * marked done or unpinned from within the app).
 */
export async function sendDismissPush(userIds: string[], noteId: string) {
  if (userIds.length === 0) return;
  const tokens = await prisma.pushToken.findMany({
    where: { userId: { in: userIds } },
    select: { expoPushToken: true },
  });
  const validTokens = tokens.filter((t) => Expo.isExpoPushToken(t.expoPushToken));
  if (validTokens.length === 0) return;

  const messages = validTokens.map((token) => ({
    to: token.expoPushToken,
    sound: null as null,
    title: "",
    body: "",
    data: { noteId, dismiss: true },
    priority: "normal" as const,
  }));

  for (const chunk of expo.chunkPushNotifications(messages)) {
    try {
      await expo.sendPushNotificationsAsync(chunk);
    } catch (error) {
      logger.error({ err: error }, "Unable to send dismiss push");
    }
  }
}
