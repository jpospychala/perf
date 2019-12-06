extern crate amqp;

use amqp::{Session, Options, Table, Basic, protocol, Channel, TableEntry};
use amqp::TableEntry::LongString;
use amqp::protocol::basic;
use std::default::Default;
use std::fs::File;
use std::io::prelude::*;
use std::thread;
use std::sync::mpsc;
use std::time::{SystemTime, UNIX_EPOCH};

pub fn test_prefetch() -> std::io::Result<()> {
    let n = 1000;
    let mut b: Benchmark = Benchmark::new()?;
    b.test("prefetch", "1", n, || {
        let durable = false;
        let qn = "q1";
        produce(qn, n, durable);
        consume(qn, n, 1, false, durable);
    });
    b.test("prefetch", "10", n, || {
        let durable = false;
        let qn = "q1";
        produce(qn, n, durable);
        consume(qn, n, 10, false, durable);
    });
    b.test("prefetch", "100", n, || {
        let durable = false;
        let qn = "q1";
        produce(qn, n, durable);
        consume(qn, n, 100, false, durable);
    });
    b.test("prefetch", "unlimited", n, || {
        let durable = false;
        let qn = "q1";
        produce(qn, n, durable);
        consume(qn, n, 0, false, durable);
    });
    b.test("prefetch", "unlimited noAck", n, || {
        let durable = false;
        let qn = "q1";
        produce(qn, n, durable);
        consume(qn, n, 0, true, durable);
    });
    b.test("prefetch", "1 persistent msgs", n, || {
        let durable = true;
        let qn = "q2";
        produce(qn, n, durable);
        consume(qn, n, 1, false, durable);
    });
    b.test("prefetch", "unlimited persistent msgs", n, || {
        let durable = true;
        let qn = "q2";
        produce(qn, n, durable);
        consume(qn, n, 0, false, durable);
    });

    Ok(())
}

pub fn produce(queue_name: &str, n: u32, durable: bool) {
    let mut session = Session::new(Options{vhost: "/".to_string(), .. Default::default()}).ok().expect("Can't create session");
    let mut channel = session.open_channel(1).ok().expect("Can't open channel");
    
    let _queue_declare = channel.queue_declare(queue_name, false, durable, false, false, false, Table::new()).ok().expect("Can't create queue");
    
    for _i in 0..n {
        let mut headers = Table::new();
        let field_array = vec![TableEntry::LongString("Foo".to_owned()), TableEntry::LongString("Bar".to_owned())];
        let properties = protocol::basic::BasicProperties { content_type: Some("text".to_owned()), headers: Some(headers), ..Default::default() };
        channel.basic_publish("", queue_name, false, false,
            properties,
            (b"something to do").to_vec()).ok().expect("Failed publishing");
    }

    channel.close(200, "Bye");
    session.close(200, "Good Bye");
}

pub fn consume(queue_name: &str, n: u32, prefetch: u16, no_ack: bool, durable: bool) {
    let mut props = Table::new();
    props.insert("example-name".to_owned(), LongString("consumer".to_owned()));
    let mut session = Session::new(Options{
        properties: props,
        vhost: "/".to_string(),
        .. Default::default()
    }).ok().expect("Can't create session");
    let mut channel = session.open_channel(1).ok().expect("Error openning channel 1");

    let _queue_declare = channel.queue_declare(queue_name, false, durable, false, false, false, Table::new()).ok().expect("Can't create queue");

    channel.basic_prefetch(prefetch).ok().expect("Failed to prefetch");
    
    let mut msgs_count = 0;
    let (tx, rx) = mpsc::channel();
    let closure_consumer = move |chan: &mut Channel, deliver: basic::Deliver, headers: basic::BasicProperties, data: Vec<u8>|
    {
        msgs_count += 1;
        if !no_ack {
            chan.basic_ack(deliver.delivery_tag, false);
        }
        if msgs_count == n {
            tx.send(1).unwrap();
        }
    };
    let _consumer_name = channel.basic_consume(closure_consumer, queue_name, "", false, no_ack, false, false, Table::new());

    let t = thread::spawn(move || {
        channel.start_consuming();
    });

    rx.recv().unwrap();

    session.close(200, "Good Bye");
}

struct Benchmark {
    file: File,
}

impl Benchmark {
    pub fn new() -> std::io::Result<Benchmark> {
        let start = SystemTime::now();
        let since_the_epoch = start.duration_since(UNIX_EPOCH)
            .expect("Time went backwards");
        let filename = format!("results/runs/{}.ndjson", since_the_epoch.as_millis());

        Ok(Benchmark {
            file: File::create(filename)?
        })
    }
    
    pub fn test<T>(&mut self, name: &str, serie: &str, trn_per_test: u32, f: T) -> std::io::Result<()> 
    where T: Fn() -> ()
    {
        println!("{}", serie);
        let mut runs: Vec<u128> = vec![];
        let tries = 30;
        let n = 1;
        for i in 0..tries {
            let s = SystemTime::now();
            f();
            let elapsed = s.elapsed().unwrap().as_millis();
            runs.push(elapsed);
        }

        runs.sort();

        let env = "test";
        let ms_sum = runs.iter().fold(0, |sum, i| sum + i);
        let tps = tries * trn_per_test as u128 * 1000 / ms_sum;
        let min = runs[0];
        let max = runs[runs.len() - 1];
        let p95idx = (0.95 * runs.len() as f32).floor() as usize;
        let p95 = runs[p95idx];
        let s: String = format!("{{\"name\":\"{}\",\"serie\":\"{}\",\"env\":\"{}\",\"n\":{},\"tps\":{},\"min\":\"{}\",\"max\":\"{}\",\"p95\":\"{}\"}}\n", name, serie, env, n, tps, min, max, p95);
        self.file.write_all(s.as_bytes())?;
        Ok(())
    }
}
