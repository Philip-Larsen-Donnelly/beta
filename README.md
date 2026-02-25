
## run with docker compose

Copy `env.example` to `.env` and change the settings you want, then:

```
docker compose up -d
```
Connect using the APP_HOST URL.

## simple development setup


Run just the DB service in docker (will expose port 5432 to local machine):

```
docker compose -f docker-compose.db.yml up -d
```

Import the attached DB (backup.sql) to the database (copy it to the root of the repository, where you run the commands, first):

```
# docker compose -f docker-compose.db.yml exec db pg_dump -U "${POSTGRES_USER:-beta}" "${POSTGRES_DB:-beta}" > backup.sql    # <-- this is to create a dump

docker compose -f docker-compose.db.yml exec -T db psql -U "${POSTGRES_USER:-beta}" -d "${POSTGRES_DB:-beta}" -f - < backup.sql  # <-- this is to restore a dump
```


Then you can run the service in dev mode:
```
pnpm install
```
to set up packages etc. , then
```
pnpm dev
```

You should then be able to open a browser.

You can leave pnpm dev running and it will rebuild on your changes.