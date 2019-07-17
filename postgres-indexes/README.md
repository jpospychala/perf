Test Objective
--------------

Compare different field types indexes in terms of insert and select speed using different hardware and table sizes.
Results can be seen as diagrams in report directory, raw results in results directory.


Usage
-----

Preparations before testing
```
$ make install  # installs dependencies
$ make prepare  # starts postgres docker container
```

Running tests

```
$ make test
```

Creating report (requires gnuplot)

```
$ make report
```