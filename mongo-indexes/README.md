Test Objective
==============

Mongodb text search using regex vs text index

Results
=======

![prefetch tps](report/search_tps_n_test.svg)
![prefetch p95](report/search_p95_n_test.svg)
![prefetch min](report/search_min_n_test.svg)
![prefetch max](report/search_max_n_test.svg)

Usage
=====

docker, make, nodejs are required
```
$ make install  # installs nodejs dependencies
$ make prepare  # start mongo docker container
$ make test     # run tests
$ make report   # produce charts from test results
$ make purge    # cleanup leftover files produced during tests (eg. databases)
```
