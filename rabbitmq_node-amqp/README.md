Test Objective
==============

Message consumer throughput for different prefetch settings

Results
=======

![prefetch tps](report/prefetch_tps_n_test.svg)
![prefetch p95](report/prefetch_p95_n_test.svg)
![prefetch min](report/prefetch_min_n_test.svg)
![prefetch max](report/prefetch_max_n_test.svg)

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
