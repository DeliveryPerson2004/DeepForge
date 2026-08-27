#rm -rf ./generate dev.db ./prisma/migrations
prisma migrate dev --name init
prisma generate