import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const email = process.env.SEED_EMAIL ?? "demo@example.com";

try {
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email },
  });

  const group = await prisma.group.create({
    data: {
      name: "Household",
      createdByUserId: user.id,
      memberships: { create: { userId: user.id, role: "admin" } },
    },
  });

  await prisma.note.createMany({
    data: [
      { ownerId: user.id, title: "Welcome to Shared Notes", body: "Capture something small here, then share the ones that need another pair of hands." },
      { ownerId: user.id, groupId: group.id, title: "Pick up the essentials", body: "Toilet paper and washing-up liquid", isUrgent: true },
    ],
  });
  console.info(`Seeded ${email} with a Household group and two notes.`);
} finally {
  await prisma.$disconnect();
}