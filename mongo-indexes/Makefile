build:
	npm install

prepare:
	mkdir -p mongo-data
	docker ps | grep some-mongo || \
		docker run -v `pwd`/mongo-data:/data/db -d --name some-mongo --hostname my-mongo -p 27017:27017 mongo:4.2.6-bionic

test:
	node test.js

.PHONY: report
report:
	node ../tools/report.js ./ svg

report_test:
	node ../tools/report.js ./ png

purge:
	docker stop some-mongo
	docker rm some-mongo