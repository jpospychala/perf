Test Objective
==============

Mongodb text search using regex vs text index

Results
=======

![prefetch tps](perf-lane/search_tps_n_unknown.svg)
![prefetch p95](perf-lane/search_p95_n_unknown.svg)
![prefetch min](perf-lane/search_min_n_unknown.svg)
![prefetch max](perf-lane/search_max_n_unknown.svg)

Usage
=====

docker, make, nodejs are required
```
$ make build    # installs nodejs dependencies
$ make prepare  # start mongo docker container
$ make test     # run tests
$ make purge    # cleanup leftover files produced during tests (eg. databases)
```
