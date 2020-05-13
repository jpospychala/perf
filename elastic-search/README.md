Test Objective
==============

Elastic: Text search: term vs regexp vs wildcard

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
$ make prepare  # start postgres docker container
$ make test     # run tests, run multiple times for bigger data sets
$ make report   # produce charts from test results
$ make purge    # cleanup leftover files produced during tests (eg. databases)
```
