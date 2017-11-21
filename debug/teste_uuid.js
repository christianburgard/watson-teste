const uuidv1=require('uuid/v1');

const uuid=uuidv1();
get_time_int = function (uuid_str) {
    var uuid_arr = uuid_str.split( '-' ),
        time_str = [
            uuid_arr[ 2 ].substring( 1 ),
            uuid_arr[ 1 ],
            uuid_arr[ 0 ]
        ].join( '' );
    return parseInt( time_str, 16 );
};

get_date_obj = function (uuid_str) {
    var int_time = this.get_time_int( uuid_str ) - 122192928000000000,
        int_millisec = Math.floor( int_time / 10000 );
    return new Date( int_millisec );
};


var ts=get_time_int(uuid);
// var date=new Date((ts/1000000));

var date=get_date_obj(uuid);

console.log(ts);
console.log(uuid);
console.log(date);