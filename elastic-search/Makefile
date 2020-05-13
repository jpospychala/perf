build:
	npm install

prepare:
	mkdir -p elastic-data
	docker ps | grep some-elastic || \
		docker run -v `pwd`/elastic-data:/usr/share/elasticsearch/data \
			-d --name some-elastic --hostname my-elastic \
			-p 9200:9200 -p 9300:9300 \
			-e "discovery.type=single-node" \
			docker.elastic.co/elasticsearch/elasticsearch:7.6.2

test:
	node search.perf.js

.PHONY: report
report:
	node ../tools/report.js ./ svg

report_test:
	node ../tools/report.js ./ png

purge:
	docker stop some-elastic
	docker rm some-elastic