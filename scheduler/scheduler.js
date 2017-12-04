const Schedule=require('./schedule');
const uuidv1=require('uuid/v1');

const dbPath=process.env.dbPath;

// nome da db onde estarão os agendamentos;
const dbName=process.env.dbName;
if(!dbName || dbName === 'undefined') {
    throw new Error('dbName não fornecido! (database onde ficam os agendamentos)');
}



// aqui vamos precisar de um função que centraliza o tratamento o obj db
// se tiver método "init", ou se for nativo, enfim, precisamos padronizar o formato dentro do agendador;
function getDb(db) {
    var retDbObj;
    if(typeof db == 'function') {
        retDbObj=new db();
    } else {
        retDbObj=db;
    }
    if(!retDbObj.init) {
        retDbObj.init=retDbObj.use;
    }
    return retDbObj;
}


const preDb=require(dbPath);

const cloudant=getDb(preDb);
// console.log(cloudant.native);

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
    // return true;
    if(msg2 != undefined) {
        console.log(msg,msg2);
    } else {
        console.log(msg);
    }
}


var dbLog; // conterá um obj db já apontando p/ a db de log "schedule_logs"

function preConfig() {
    var dbLogName='schedule_logs';
    cloudant.native.db.create(dbLogName,function(err,body) {
        if(err && err.statusCode != 412) { // statusCode 412 = já existe a DB
            console.log('ERROR no pre-config',err);
            throw err;
            // process.abort();
        }
        // console.log('body da criação de "schedule_logs"',body);
        dbLog=getDb(preDb);
        dbLog.init(dbLogName);
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
    var db;
    
    // aqui temos que ver o formato
    if(cloudant.init) {
        db=cloudant.init(dbName);
    } else {
        db=cloudant.use(dbName);
    }

    db.find({selector:{
        type:"parameter",
        schedule:{$type:"object"},
        "schedule.on":true
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

            var schedule=new Schedule(schedObj);
            var ret=schedule.run();

            var taskReturn; // retornado pela função "task"
            if(ret.status) {
                // a tarefa deve ser executada;
                // var task=eval(schedule.task); // nome da função da tarefa, que será executada;
                let task;
                try {
                    // nome de um arquivo que será "required" no diretório ./tasks
                    task=require('./tasks/'+schedule.task); // nome da função da tarefa, que será executada;
                    console.log('schedule.task',schedule.task);
                    if(typeof task != 'function') {
                        throw new Error('A task não é uma "function"!');
                    }

                } catch(e) {

                    const error={
                        stack:e,
                        msgScheduleLog:e.message,
                        scheduleStatus:'fail'
                    }
                    task=()=>Promise.reject(error);
                }

                // esse trecho de código não fica mais aqui, cada task que cuide de seu status
                /* ret.setRunningStatus({db:db}).then(ret=>{
                    return task();
                },err=>{
                    // Não foi possível setar o status do agendamento p/ 'running'
                    console.log('ERROR: (não foi possível alterar o status p/ running)',err);
                }). */
                task().then(resolved=>{
                    // task executada com sucesso;
                    // função pós-sucesso;
                    consoleLog1(`(SUCESSO)(SUCESSO)(SUCESSO)(SUCESSO)(SUCESSO)TASK(${schedule.task})  SUCESSO!`,resolved);

                    /* taskReturn=resolved;
                    return ret.saveExec({
                        now2:new Date(),
                        db:db,
                        status:'success'
                    }); */
                    /*
                    resolved={ geral: 1403, courses: 702, addresses: 58 }
                    acrescentar .msgScheduleLog com uma msg a ser logada no schedule_logs
                    */
                    return ret.saveLog({
                        dbLog:dbLog,
                        msg:resolved.msgScheduleLog || '',
                        endTime:new Date(),
                        status:resolved.scheduleStatus || 'N/D'
                    });
                },err=>{
                    // ERRO NA TASK! Vamos salvar o erro que task nos passou;
                    consoleLog1(`########### ERRO AO EXECUTAR A TASK!!!!!!!!`,err);
                    return ret.saveLog({
                        dbLog:dbLog,
                        msg:err.msgScheduleLog || '',
                        endTime:new Date(),
                        status:err.scheduleStatus || 'N/D'
                    });
                }).then(resolved=>{
                    // log salvo com sucesso!
                    consoleLog1(`LOG SALVO COM SUCESSO!!`,resolved);
                    return true;
                },err=>{
                    // erro salvando o log
                    consoleLog1(`########### ERRO SALVANDO O LOG`,err);
                    throw err;
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
