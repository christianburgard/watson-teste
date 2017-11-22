const {spawn} = require('child_process');
const path=require('path');


/*
    VERIFICAR!
    quando o agendador iniciar, não pode haver nenhuma tarefa 'running';
*/
var scheduler_init=function(params) {
    const dbPath=params.dbPath;
    const dbName=params.dbName;
    const path1=path.join(__dirname,'scheduler.js');
    const scheduleProc=spawn('node',[path1],{
        env:Object.assign({},process.env,{dbPath,dbName})
    });

    const now=new Date();
    const nowTime=now.getTime();
    const maxWait=20000;

    const handleError=(errOrCode,signal)=>{
        var msg,typeEvent;
        if(errOrCode instanceof Error) {
            msg=errOrCode.message;
            typeEvent='error';
        } else {
            typeEvent='exit';
            msg=errOrCode;
        }
        console.log(`CHILD EXITED!TYPE:(${typeEvent}) codeOrMsg: ${msg} --- signal: ${signal}`);
        const now2=new Date();
        if(now2.getTime() < (nowTime+maxWait)) {
            // throw 'Não foi possível inicar o agendador!';
        }

    }


    scheduleProc.on('error',handleError);
    scheduleProc.on('exit',handleError);
    scheduleProc.stdout.on('data',(data)=>{
        console.log('SCHEDULE.STDOUT',data.toString());
    });
    scheduleProc.stderr.on('data',(data)=>{
        console.log('SCHEDULE.STDERR',data.toString());
    });

} // scheduler_init

module.exports={scheduler_init}
