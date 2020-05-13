Performance tests
=================

Measure rather than assume! The idea behind this project is to build a set of tools to easily
evaluate various performance concerns and stop guessing.
Initial focus is on languages such as JavaScript on Node.js and Rust, combined with such technologies
as RabbitMQ, MongoDB, Postgres.

By building a large number of various benchmarks I hope to reach a point where creating another
benchmark will be efortless.

Available benchmarks
--------------------

* [Postgres: Number of batch rows vs. insert performance](postgres-insert-many/README.md)
* [Postgres: Index, sorting and random values impact vs. insert performance](postgres-insert-into-index/README.md)
* [Postgres: Indexing uuid and bigint vs. select performance](postgres-indexes/README.md)
* [Rabbitmq: prefetch - node.js/amqplib](rabbitmq/README.md)
* [Rabbitmq: prefetch - node.js/amqp](rabbitmq_node-amqp/README.md)
* [Rabbitmq: prefetch - rust](rabbitmq-rust/README.md)
* [Mongodb: Text search vs regex](mongo-indexes/README.md)
* [Elastic: Text search: term vs regexp vs wildcard](elastic-search/README.md)