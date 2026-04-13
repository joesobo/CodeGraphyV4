use crate::util::run;

mod inner;

fn main() {
    run();
    inner::helper();
}

struct App;

enum Status {
    Ready,
}

trait Service {}
