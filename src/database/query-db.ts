import {prisma} from "./prisma-client.ts";
import {ContentLevel} from "../../generated/prisma/enums.ts";


async function main() {
    // Delete all data (logs first due to FK, then sessions)
    await prisma.log.deleteMany();
    await prisma.session.deleteMany();
    // Reset auto-increment counters so new ids start from 1
    await prisma.$executeRawUnsafe("DELETE FROM sqlite_sequence;");
    console.log("All data deleted");

    // Create an empty session
    const session = await prisma.session.create({
        data: {},
    });
    console.log("Created empty session:", session);

    // Create logs one by one, passing session.id
    const log1 = await prisma.log.create({data: {content: "log 1", content_level: ContentLevel.warn, session_id: session.id}});
    const log2 = await prisma.log.create({data: {content: "log 2", content_level: ContentLevel.info, session_id: session.id}});
    const log3 = await prisma.log.create({data: {content: "log 3", content_level: ContentLevel.warn, session_id: session.id}});
    console.log("Created logs:", [log1, log2, log3]);

    // Verify: fetch the session with its logs
    const withLogs = await prisma.session.findUnique({
        where: {id: session.id},
        include: {logs: true},
    });
    console.log("Session with logs:", JSON.stringify(withLogs, null, 2));
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
