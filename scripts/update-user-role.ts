import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function updateUserRole() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: ts-node update-user-role.ts <email> <role>');
    console.log('Roles: USER, LAB, ADMIN');
    process.exit(1);
  }

  const email = args[0];
  const role = args[1] as UserRole;

  if (!['USER', 'LAB', 'ADMIN'].includes(role)) {
    console.error('Invalid role. Must be USER, LAB, or ADMIN');
    process.exit(1);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`User with email ${email} not found`);
      process.exit(1);
    }

    console.log(`Current role: ${user.role}`);
    console.log(`Updating to: ${role}`);

    const updated = await prisma.user.update({
      where: { email },
      data: { role },
    });

    console.log(`Successfully updated user ${email} to role ${updated.role}`);
  } catch (error) {
    console.error('Error updating user role:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateUserRole();
