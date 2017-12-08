const {spawn} = require('child_process');
const path=require('path');

// prepara um schedule p/ ser salvo
function toSave(params) {
    if(!params) params={};
    const db=params.db;

    let doc=params.doc;

    var th=this;
    const docNative=doc || th.docNative;
    var scheduleFinal={};
    var toSaveObj; // objeto que será salvo; vamos ler o que já tem para fazer "merge";
    toSaveObj=docNative;

    var id=toSaveObj._id || toSaveObj.id;
    if(!id) {
        id='non_existentID-9kY**';
    }
    toSaveObj._id=id;
    return new Promise((res,rej)=>{
        return db.find({selector:{
            _id:id,
            type:"parameter"
        }},function(err,result) {
            if(err) {
                return rej(err);
            }
            if(result && result.docs && result.docs.length) {
                var docs=result.docs;
                if(docs.length > 1) {
                    return rej({error:'Há mais de um registro com mesmo ID!!'});
                }
                var document=docs[0];
                scheduleFinal=Object.assign(document.schedule,docNative.schedule);
                // scheduleFinal=scheduleFinal.schedule;

                toSaveObj=Object.assign(document,docNative);
            } else {
                // não há registros...
                toSaveObj._id=-1; // p/ criarmos id no momento de salvar no banco (db.js->this.insert2)
            }
            

            // props que são arrays numéricas e que devem ser ordenadas;
            var arrToOrder=['daysOfWeek','daysOfMonth','months','minutes','hours'];

            // limpando
            /* for(var i in scheduleFinal) {
                if(typeof scheduleFinal[i] == 'function' || scheduleFinal[i] === null) {
                    delete scheduleFinal[i];
                } else {
                    if(arrToOrder.indexOf(i) > -1) {
                        scheduleFinal[i].map(elem=>parseInt(elem));
                        scheduleFinal[i].sort((a,b)=>a-b);
                    }
                }
            } */

            // delete scheduleFinal.docNative;
            toSaveObj.schedule=scheduleFinal;
            return res({toSaveObj});
        });
    });
} // toSave









/*
    VERIFICAR!
    quando o agendador iniciar, não pode haver nenhuma tarefa 'running';
*/
var scheduler_init=function(params) {
    const dbPath=params.dbPath;
    const dbName=params.dbName;
    const dbLogName=params.dbLogName;
    const app=params.app;
    const path1=path.join(__dirname,'scheduler.js');
    const scheduleProc=spawn('node',[ path1],{
        env:Object.assign({},process.env,{dbPath,dbName})
    });


    // criando endpoint p/ agenda
    // insert/update de agenda
    app.post('/api/scheduler',function(req,res) {
        const Schedule=require(path.join(__dirname,'schedule'));
        var obj=req.body.objSchedule;
        if(!obj) {
            return res.status(400).send({error:'Requisição inválida! (Propriedade "objSchedule" não fornecida!)'});
        }
        const db=new require(dbPath)();
        db.init(dbName);
        try {
            const params={isInsert:true};
            toSave({db,doc:obj}).then(ret=>{
                const {toSaveObj}=ret;
                var schedule=new Schedule(toSaveObj,params);

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


    // listando agendamentos
    app.get('/api/scheduler',function(req,res) {
        const db=new require(dbPath)();
        db.init(dbName);

        let selector={
            type:"parameter",
            schedule:{$type:"object"}
        }
        if(req.query && req.query.selector) {
            try {
                const selector2=JSON.parse(req.query.selector);
                selector=Object.assign(selector,selector2);
            } catch(e) {
                return res.status(400).send({error:'Parâmetro de busca inválido!'});
            }
        }
        // listando schedules
        return db.find({selector},function(err,result) {
            if(err) {
                return res.status(500).send(err);
            }
            const docs=result.docs;
            
            const Schedule=require('./schedule');            
            let retDocs=[];
            let arrErrors=[];
            if(docs && docs.length) {
                docs.forEach(elem=>{
                    try {
                        let schedule=new Schedule(elem);
                        const schedule2=schedule.toLoad();
                        retDocs.push(schedule2);
                    } catch(e) {
                        // aqui vemos depois, se vamos mandar como "agenda inválida"
                        arrErrors.push(e);
                    }

                });
            }
            
            return res.send({schedules:retDocs,errors:arrErrors});
        });
    }); // listando agendamentos

    // listando logs
    app.get('/api/scheduler-logs',function(req,res) {
        const db=new require(dbPath)();
        db.init(dbLogName);

        const createIndex=(function() {
            var created=0;
            return function() {
                if(created) {
                    return Promise.resolve({ok:true});
                }
                return new Promise((res,rej)=>{

                    const time_index = {name:"by-time", type:"json", index:{fields:["time"]}}
                    return db.db.index(time_index,function(err,result) {
                        if(err) {
                            return rej(err);
                        }

                        created=1;
                        return res({ok:true});
                    });
                });
            }
        })(); // createIndex

        // aqui vamos consultar uma view feita só p/ guardar o total de docs;
        const getTotal=()=>{
            const viewname='total-docs';
            return new Promise((res,rej)=>{
                return db.db.view(viewname, viewname, {key:'syncCourses'}, function(err,body) {
                    if(err) {
                        return rej(err);
                    }
                    const total=body.rows[0].value;
                    return res({ok:true,total});
                });
            });
        }

        let selector={
            type:"log"
        }
        let sort=null,limit=null,skip=null,pag=null,perPage=null;
        if(req.query && req.query.selector) {
            try {
                const selector2=JSON.parse(req.query.selector);
                selector=Object.assign(selector,selector2);
                if(req.query.sort) {
                    sort=JSON.parse(req.query.sort);
                }
                if(req.query.limit) {
                    limit=parseInt(req.query.limit);
                }
                if(req.query.skip) {
                    skip=parseInt(req.query.skip);
                } else {
                    if(req.query.pag) {
                        pag=parseInt(req.query.pag) || 1;
                        perPage=parseInt(req.query.perPage) || 10;
                        skip=(pag-1)*perPage;
                        limit=perPage;
                    }
                }
            } catch(e) {
                return res.status(400).send({error:'Parâmetro de busca inválido!'});
            }
        }
        let queryObj={selector}
        if(sort)
            queryObj.sort=sort;
        if(limit)
            queryObj.limit=limit;
        if(skip)
            queryObj.skip=skip;

        createIndex()
            .then(getTotal)
            .then(ret=>{
                const total=ret.total;
                db.find(queryObj,function(err,result) {
                    if(err) {
                        return res.status(500).send(err);
                    }
                    result.info={
                        total
                    }
                    return res.send(result);
                });
            });

    }); // /api/scheduler-logs

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
