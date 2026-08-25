import {prisma} from "./prisma-client.ts";



async function main() {
    // Delete all data (logs first due to FK, then sessions)
    await prisma.log.deleteMany();
    await prisma.session.deleteMany();
    // Reset auto-increment counters so new ids start from 1
    await prisma.$executeRawUnsafe("DELETE FROM sqlite_sequence;");
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
