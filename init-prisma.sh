rm -rf ./prisma/migrations
rm -f ./dev.db
pnpm dlx prisma migrate dev --name init
pnpm dlx prisma generate