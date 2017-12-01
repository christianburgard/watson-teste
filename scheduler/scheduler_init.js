const {spawn} = require('child_process');
const path=require('path');


/*
    VERIFICAR!
    quando o agendador iniciar, não pode haver nenhuma tarefa 'running';
*/
var scheduler_init=function(params) {
    const dbPath=params.dbPath;
    const dbName=params.dbName;
    const app=params.app;
    const path1=path.join(__dirname,'scheduler.js');
    const scheduleProc=spawn('node',[ path1],{
        env:Object.assign({},process.env,{dbPath,dbName})
    });


    // criando endpoint p/ agenda
    app.post('/api/scheduler',function(req,res) {
        const Schedule=require(path.join(__dirname,'schedule'));
        var obj=req.body.objSchedule;
        const db=new require(dbPath)();
        db.init(dbName);
        try {

            var schedule=new Schedule(obj);
            schedule.toSave({db}).then(ret=>{
                const {toSaveObj}=ret;

                return db.insert2(toSaveObj,toSaveObj._id);
            }).then(ret=>{
                // salvou;
                var rev=ret.body.rev;
                var id=ret.body.id;
                return res.send({ok:true,rev,id});
            },err=>{
                // deu erro ao salvar;
                throw {
                    error:'Não foi possível salvar a agenda!',
                    stack:err
                }
            })
            .catch(err=>{
                // aqui o objeto err deve estar montando direito com ao menos uma prop "error" com a string de erro ao user;
                return res.status(400).send(err);
            });
        } catch(e) {
            return res.status(400).send({error:e.message,stack:e});
        }

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
            throw 'Não foi possível inicar o agendador!';
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
