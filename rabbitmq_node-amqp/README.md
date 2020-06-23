Test Objective
==============

Message consumer throughput for different prefetch settings

Results
=======

![prefetch tps](perf-lane/prefetch_tps_n_unknown.svg)
![prefetch p95](perf-lane/prefetch_p95_n_unknown.svg)
![prefetch min](perf-lane/prefetch_min_n_unknown.svg)
![prefetch max](perf-lane/prefetch_max_n_unknown.svg)

Usage
=====

docker, make, nodejs are required
```
$ make build    # installs nodejs dependencies
$ make prepare  # start rabbitmq docker container
$ make test     # run tests
$ make purge    # cleanup leftover files produced during tests (eg. databases)
```
