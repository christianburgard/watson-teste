const Schedule=require('./schedule');
const uuidv1=require('uuid/v1');

const dbPath=process.env.dbPath;

// nome da db onde estarão os agendamentos;
const dbName=process.env.dbName;
if(!dbName || dbName === 'undefined') {
    throw new Error('dbName não fornecido! (database onde ficam os agendamentos)');
}


const {cloudant}=require(dbPath);



const now=new Date();
// console.log(cloudant)

/* const DBNAME='eds_teste_task_scheduler';
var cloudant2=cloudant.db.use(DBNAME);
cloudant2.find({selector:{
    type:"parameter",
    schedule:{$type:"object"}
}},function(err,result) {
    if(err) {
        console.log(err);
        throw err;
    }
    // console.log(result);
    for(var i in result.docs) {

        // console.log(result.docs[i]);
    }
}); */



// return 1;
/**
 * apenas p/ centralizar o processo de log
 */
function consoleLog1(msg,msg2) {
    console.log(msg,msg2);
}


var dbLog; // conterá um obj db já apontando p/ a db de log "schedule_logs"

function preConfig() {
    var dbLogName='schedule_logs';
    cloudant.db.create(dbLogName,function(err,body) {
        if(err && err.statusCode != 412) { // statusCode 412 = já existe a DB
            console.log('ERROR no pre-config',err);
            throw err;
            // process.abort();
        }
        // console.log('body da criação de "schedule_logs"',body);
        dbLog=cloudant.use(dbLogName);
    });
}

// pre-configurações - se falhar, mata o processo!
preConfig();

/**
 * cloudant - uma instância de Cloudant já conectada;
 * para ser uma agenda, um documento deve conter: {type:'parameter',schedule:(objeto no formato schedule)}
 */
function schedulerRun(cloudant,params) {
    var dbName=params.dbName;
    var db=cloudant.use(dbName);

    db.find({selector:{
        type:"parameter",
        schedule:{$type:"object"}
    }},function(err,result) {
        /* { docs: 
            [ { _id: 'e163d21160d0ed307942f4611237a3a5',
                _rev: '1-4083922b392f2422f386fa7d6ff975d7',
                name: 'teste1 - essa prop não é obrigatória, roda a cada 5 min',
                type: 'parameter',
                schedule: [Object] } ] } */
         
        if(err) {
            throw err;
        }

        result.docs.forEach((result)=>{

            var schedObj=result;
            /* var objLog={
                interval:schedObj.schedule.interval.value,
                task:schedObj.schedule.task
            }
            console.log('OBJLOG',objLog); */
            var schedule=new Schedule(schedObj);
            var ret=schedule.run();

            var taskReturn; // retornado pela função "task"
            if(ret.status) {
                // a tarefa deve ser executada;
                // var task=eval(schedule.task); // nome da função da tarefa, que será executada;
                
                // nome de um arquivo que será "required" no diretório ./tasks
                var task=require('./tasks/'+schedule.task); // nome da função da tarefa, que será executada;
                console.log('schedule.task',schedule.task);
                ret.setRunningStatus({db:db}).then(ret=>{
                    return task();
                },err=>{
                    // Não foi possível setar o status do agendamento p/ 'running'
                    console.log('ERROR: (não foi possível alterar o status p/ running)',err);
                }).then(resolved=>{
                    // task executada com sucesso;
                    // função pós-sucesso;
                    consoleLog1(`TASK(${schedule.task})  SUCESSO!`,resolved);

                    taskReturn=resolved;
                    return ret.saveExec({
                        now2:new Date(),
                        db:db,
                        status:'success'
                    });
                },err=>{
                    // ERRO NA EXECUÇÃO DA TASK!!
                    consoleLog1(`########### ERRO NA EXECUÇÃO DA TASK(${schedule.task})`,err);


                }).then(resolved=>{
                    // função pós-task executada com sucesso; agora vamos salvar na collection de logs

                    return ret.saveLog({
                        dbLog:dbLog,
                        msg:taskReturn.msg || '',
                        endTime:new Date(),
                        status:taskReturn.status
                    });
                },err=>{
                    // erro na hora de alterar a schedule p/ setar lastExec e status
                    consoleLog1(`########### ERRO AO SETAR lastExec e status`,err);
                }).then(resolved=>{
                    // log salvo com sucesso!
                    consoleLog1(`LOG SALVO COM SUCESSO!!`,err);


                },err=>{
                    // erro salvando o log
                    consoleLog1(`########### ERRO SALVANDO O LOG`,err);
                    
                });
            }
        });    


    });

} // schedulerRun


// return;
console.log('Inicio do setInterval');
setInterval(()=>{
    
    /* ret=sch1.run();
    if(ret.status) {
        console.log('MATCH!');
        // antes de executar temos que mudar o status p/ 'running';
        ret.saveExec();
    } */

    schedulerRun(cloudant,{dbName:dbName});
},60000);
