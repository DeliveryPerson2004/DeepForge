# 检查两个路径是否都存在（-e 支持文件或目录），若同时存在则执行删除
if [ -e "./generate" ] && [ -e "dev.db" ]; then
  rm -rf ./generate dev.db ./prisma/migrations
fi

prisma migrate dev --name init
prisma generate