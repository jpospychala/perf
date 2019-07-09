

Memory usage
`
ps -eo rss,pid,euser,args:100 --sort %mem | grep -v grep | grep -i postgres | awk '{printf $1/1024 "MB"; $1=""; print }'
`

Disks
`
hdparm -t /dev/sdXX

/dev/sda1:
 Timing buffered disk reads: 1446 MB in  3.00 seconds = 481.35 MB/sec

 /dev/sdb1:
 Timing buffered disk reads:  94 MB in  3.01 seconds =  31.20 MB/sec

`
