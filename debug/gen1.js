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


/*
function(err, response) {
    if (err) {
        console.log('$$$$$$$$$ ERRO COM O googleMpasClient.geocode',err);
        return rej('$$$$$$$$$ ERRO COM O googleMpasClient.geocode');
    }
    let coords=[response.json.results[0].geometry.location.lng,response.json.results[0].geometry.location.lat];
    address2.geometry = {type: "Point",coordinates: coords};
    address2.type = "Unidade";
    // console.log("Google Geo API Result: geometry=",this.address.geometry);

    / * addToCoord.push({
        nome:nome,
        municipio:municipio,
        coordinates:coords
    }); * /
    arrAddresses.push(addresses2);
    return res({ok:true});
    
}
*/