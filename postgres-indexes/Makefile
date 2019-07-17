build:
	npm install

prepare:
	mkdir -p postgres-data
	docker inspect some-postgres >/dev/null || \
		docker run -d --memory=128m --name some-postgres -p 5433:5432 -e POSTGRES_PASSWORD=pwd -d \
			--mount type=bind,source=`pwd`/postgres-data,target=/var/lib/postgresql/data \
			postgres

test:
	PGUSER=postgres PGDATABASE=postgres PGPASSWORD=pwd PGPORT=5433 node ./test.js \
	| tee results/runs/`date +%s`.ndjson

report:
	node report.js

purge:
	docker stop some-postgres
	docker rm some-postgres
