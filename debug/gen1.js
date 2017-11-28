function conn(tm) {
    return new Promise((res,rej)=>{
        return setTimeout(()=>{
            if(tm < 200) {
                return rej(tm);
            }
            return res(tm);
        },tm);
    });
}

var arr1=[
    conn(300),
    conn(150),
    conn(150)
];

Promise.all(arr1).then(ret=>{
    console.log('RET',ret);    
}).catch(err=>{
    console.log('err',err);
});