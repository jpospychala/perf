Test Objective
==============

1. What is the difference between inserting to table with index vs without index?
 a) similar values
 b) random values
2. What is the difference between inserting single object vs many objects?
 a) similar values
 b) random values

Results
=======

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
