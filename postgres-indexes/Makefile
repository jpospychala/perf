build:
	npm install

prepare:
	docker inspect some-postgres >/dev/null || \
		docker run -d --name some-postgres -p 5433:5432 -e POSTGRES_PASSWORD=pwd -d postgres

test:
	PGUSER=postgres PGDATABASE=postgres PGPASSWORD=pwd PGPORT=5433 node ./test.js

shutdown:
	docker stop some-postgres
	docker rm some-postgres