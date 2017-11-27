/*
views do cloudant; mais para ajudar em debug's

p/ copiar e colar no cloudant...
*/

// ############ general_log
// byTime
function (doc) {
    var get_time_int = function (uuid_str) {
      var uuid_arr = uuid_str.split( '-' ),
          time_str = [
              uuid_arr[ 2 ].substring( 1 ),
              uuid_arr[ 1 ],
              uuid_arr[ 0 ]
          ].join( '' );
      return parseInt( time_str, 16 );
    };
  
    var get_date_obj = function (uuid_str) {
        var int_time = get_time_int( uuid_str ) - 122192928000000000,
            int_millisec = Math.floor( int_time / 10000 );
        return new Date( int_millisec );
    };
    
    var padNum=function(num) {
      if(parseInt(num) < 10) {
        num='0'+num;
      }
      return num;
    }
    
    var _id=doc._id;
    var time=get_time_int(_id);
    var date=get_date_obj(_id);
    date.setHours((date.getHours()-2));
    var dateStr=date.getFullYear()+'-'+padNum(date.getMonth()+1)+'-'+padNum(date.getDate())+' '+padNum(date.getHours())+':'+padNum(date.getMinutes())+':'+padNum(date.getSeconds());
    emit(time,{dateStr:dateStr});
  }


  // ############ schedule_logs
  // byTime
  function (doc) {
    var padNum=function(num) {
      if(parseInt(num) < 10) {
        num='0'+num;
      }
      return num;
    }
    var makeTime=function(dateObj) {
      dateObj.setHours((dateObj.getHours()-2));
      var time=dateObj.getFullYear()+'-'+padNum(dateObj.getMonth()+1)+'-'+padNum(dateObj.getDate())+' '+padNum(dateObj.getHours())+':'+padNum(dateObj.getMinutes())+':'+padNum(dateObj.getSeconds());
      return time;
    }
    var beginTime=doc.beginTime;
    var begin=new Date(doc.beginTime);
    var end=new Date(doc.endTime);
    var value={
      begin:makeTime(begin),
      end:makeTime(end),
      task:doc.task,
      msg:doc.msg
    }
    emit(beginTime, value);
  }