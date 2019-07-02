build:
	npm install

prepare:
	docker inspect some-rabbit >/dev/null || \
		docker run -d --name some-rabbit --hostname my-rabbit -p 8080:15672 rabbitmq:3-management
	node ./prepare.js

test:
	node test.js

shutdown:
	docker stop some-rabbit
	docker rm some-rabbit