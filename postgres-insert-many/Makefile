install:
	npm install

prepare:
	mkdir -p postgres-data
	docker inspect some-postgres >/dev/null || \
		docker run -d --name some-postgres -p 5433:5432 -e POSTGRES_PASSWORD=pwd -d \
			--mount type=bind,source=`pwd`/postgres-data,target=/var/lib/postgresql/data \
			--mount type=bind,source=`pwd`,target=/test \
			postgres

test:
	PGUSER=postgres PGDATABASE=postgres PGPASSWORD=pwd PGPORT=5433 node_modules/.bin/perf-lane *.perf.js

.PHONY: report
report:
	node_modules/.bin/perf-lane -r

purge:
	docker stop some-postgres
	docker rm some-postgres
