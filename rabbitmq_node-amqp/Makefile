build:
	npm install

prepare:
	docker ps | grep some-rabbit || \
		docker run -d --name some-rabbit --hostname my-rabbit -p 5672:5672 -p 8080:15672 rabbitmq:3-management

test:
	node test.js

.PHONY: report
report:
	node ../tools/report.js ./ svg

report_test:
	node ../tools/report.js ./ png

purge:
	docker stop some-rabbit
	docker rm some-rabbit