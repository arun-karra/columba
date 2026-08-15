import { Expo } from "expo-server-sdk";
import { prisma } from "./prisma";
import { logger } from "./logger";

const expo = new Expo(
  process.env.EXPO_ACCESS_TOKEN
    ? { accessToken: process.env.EXPO_ACCESS_TOKEN }
    : undefined,
);

export async function sendPush(
  userIds: string[],
  title: string,
  body: string,
  data: Record<string, unknown> = {},
  urgent = false,
) {
  if (userIds.length === 0) return;

  const tokens = await prisma.pushToken.findMany({
    where: { userId: { in: userIds } },
    select: { id: true, expoPushToken: true },
  });
  const validTokens = tokens.filter((token) => Expo.isExpoPushToken(token.expoPushToken));
  if (validTokens.length === 0) return;

  const messages = validTokens.map((token) => ({
    to: token.expoPushToken,
    sound: "default" as const,
    title,
    body,
    data,
    priority: urgent ? ("high" as const) : ("default" as const),
    ...(urgent ? { interruptionLevel: "time-sensitive" as const } : {}),
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