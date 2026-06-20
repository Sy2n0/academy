const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMachineData() {
  try {
    const machines = await prisma.machine.findMany({
      select: {
        id: true,
        title: true,
        type: true,
      },
      take: 10,
    });

    console.log('Existing Machine data:');
    console.log(JSON.stringify(machines, null, 2));
    console.log(`\nTotal machines: ${machines.length}`);

    // Type 값 분포 확인
    const typeCounts = {};
    machines.forEach((m) => {
      typeCounts[m.type] = (typeCounts[m.type] || 0) + 1;
    });
    console.log('\nType distribution:', typeCounts);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkMachineData();
