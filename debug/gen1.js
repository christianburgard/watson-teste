function conn() {
    return new Promise((res,rej)=>{
        var tm=Math.floor(Math.random()*800);
        return setTimeout(()=>{
            console.log('time: '+tm);
            if(tm > 549 && tm < 601) {
                return res(tm);
            }
            return rej(tm);
        },tm);
    });
}

function run(generator) {
    var it=generator(done);

    function done(promise) {
        if(promise instanceof Promise) {
            return promise.then(ret=>it.next(ret),err=>it.next({error:err}));
        }
        it.next();
    }
    done();
}

run(function* (done){
    var ret;
    while(true) {
        ret=yield done(conn());
        if(typeof ret == 'number') {
            console.log('RESOLVED',ret);
            break;
        }
    }
});