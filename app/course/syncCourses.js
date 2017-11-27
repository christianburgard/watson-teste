const http = require('http');

/*
tirar o set status "running"/(done) do scheduler e passar para o cá (syncCourse);
terminar a questão da replicação de data2=>data
*/

//DATABASE
//**************** DB ********************//

const {initDb}=require('../../dbInit');

/******************************************/
function syncCourses(app) {
    var doc; // documento que contém o registro da task, o schedule da task;
    var log; // log final a ser "resolved" pela Promise e retornado a quem evocou a func.
    var dbSchedule=new(require('../../db'))();
    dbSchedule.init('general_settings');
    var setRunningStatus=(params)=>{
        if(!params) params={};
        var db=params.db;
        if(!db) {
            db = dbSchedule;
        }
        doc=params.doc;
        if(!doc) {
            doc=new Promise((res,rej)=>{
                db.find({selector:{
                    type:"parameter",
                    schedule:{$type:"object"},
                    "schedule.task":"syncCourses"
                }},function(err,result) {
                    if(err) {
                        return rej(err);
                    }
                    return res(result);
                });
            });
        }

        return Promise.resolve(doc).then(ret=>{
            if(ret && ret.docs) {
                if(ret.docs.length)
                    doc=ret.docs[0];
                else
                    throw {error:'Não foi encontrado registro da tarefa sincronizadora de cursos!! Contate o suporte.'}
            }

            // antes de iniciarmos a execução da tarefa, setamos p/ 'running'
            return new Promise((res,rej)=>{
                doc.schedule.status='running';
                return db.insert(doc,(err,body)=>{
                    if(err) {
                        return rej(err);
                    }
                    // quando salvar com sucesso, precisamos re-setar o rev
                    /*
                    SCHEDULE.STDOUT ######### retorno salvo do setRunningStatus { ok: true,
                        id: 'e163d21160d0ed307942f4611237a3a5',
                        rev: '73-f87b77c9d2856555319d75d1d5fcab9f' }
                    */
                    doc._rev=body.rev;
                    // consoleLog1('######### retorno salvo do setRunningStatus',body);
                    return res({ok:true});
                });
                
            });
        });
    } // setRunningStatus

    var saveExec=(params)=>{
        // essa func será executada após a task ter sido concluída (success or fail);
        // now2: obj Date a ser criado no momento em que a tarefa terminar;
        var now2=params.now2;
        var db=params.db;
        if(!db) {
            db = dbSchedule;
        }
        var status=params.status;
        var error=params.error || "";
        now2.setSeconds(0,0);
        var lastExec=now2.getTime(); // epoch do término da tarefa;
        return new Promise((res,rej)=>{

            if(!doc || ! doc.schedule) {
                // não há como salvar log principal, pq não há registro schedule dessa tarefa
                return rej({error:'Não é possível salvar log, não há registro da tarefa!'});
            }

            doc.schedule.lastExec=lastExec;
            doc.schedule.status=status;
            doc.schedule.error=error;
            return db.insert(doc,(err,body)=>{
                if(err) {
                    return rej(err);
                }
                return res({ok:true});
            });

        });
    }


    
    var db = new(require('../../db'))();
    // db.init('data');
    
    /**
     * aqui estamos deletando a "data2" e recriando para podemos injetar os dados oriundos do webservice
     */
    var removeCreateDatas=function(dbName) {
        return new Promise((res,rej)=>{
            console.log('########## REMOVENDO DB \''+dbName+'\'...');
            return db.native.db.destroy(dbName,function(err) {
                if(err) {
                    if(err.statusCode==404)
                        return res({ok:true,msg:'Database not found'});
                    
                    return rej({error:err});
                } else {
                    console.log('########## DB \'data2\' REMOVIDA COM SUCESSO! ########## ');
                }
                return res({ok:true});
            });
        }).then(ret=>{
            return new Promise((res,rej)=>{
                return db.native.db.create(dbName, function (err, resultCreated) {
                    if(err) {
                        if(err.error=='file_exists')
                            return res('Db "'+dbName+'" já criada!');
                            
                        return rej(err);
                    }
                    
                    // createIndex('data2');
                    return res('Db "'+dbName+'" criada com sucesso!');
                    
                });
            });
        });
    } // removeCreateDatas


    /**
     * Replica db: "data2" => "data"
     */
    var replicateDATA=function() {
        console.log('########################### REPLICAÇÃO Inicio ###########################');
        // return removeCreateDatas(['data2']).then(ret=>{
        const {initDb}=require('../../dbInit');
        initDb(['initData'],{remove:['data']});
        return Promise.resolve(1).then(ret=>{
                return new Promise((res,rej)=>{
                    return db.native.db.replicate('data2','data',{create_target:true},function(err,body) {
                        console.log('#################################################################');
                        console.log('########################### REPLICAÇÃO ###########################');
                        console.log('#################################################################');
                        if(err) {
                            console.log('(ERROR)(ERROR)(ERROR)(ERROR)(ERROR)(ERROR)(ERROR)(ERROR)(ERROR)(ERROR)',err);
                            return rej(err);
                        }
                        console.log('(BODYYYY)(BODYYYY)(BODYYYY)(BODYYYY)(BODYYYY)(BODYYYY)(BODYYYY)(BODYYYY)(BODYYYY)(BODYYYY)',body.ok);
                        return res(body);
                    });
            });
        });
    }





    const dbLog=new(require('../../db'))();
    dbLog.init('general_log');
    return setRunningStatus()
    .then(ret=>{
        return new Promise((resMaster,rejMaster)=>{

            var http = require('http');
            var googleMapsClient = require('@google/maps').createClient({
                key: 'AIzaSyD7yHgFYKXzy0cbhulswqPEQN7kTFRFE_g'
            });

            var username = 'psf.ginfo';
            var password = 'xisto917';
            var options = {
                host: 'wwwapp.sistemafiergs.org.br',
                port: 7880,
                path: '/psf/api/senai/programacao-cursos',
                headers: {
                    'Authorization': 'Basic ' + new Buffer(username + ':' + password).toString('base64')
                }
            };
            // auth is: 'Basic VGVzdDoxMjM='

            http.get(options, (resp) => {
                let data = '';

                // A chunk of data has been recieved.
                resp.on('data', (chunk) => {
                    data += chunk;
                });

                // The whole response has been received. Print out the result.
                resp.on('end', () => {
                    var classrooms_json = JSON.parse(data);

                    // validações aqui!
                    if(classrooms_json.length < 2) {
                        return rejMaster({error:'Resposta inválida, não há dados!'});
                    }


                    // OS DADOS JÁ DEVEM ESTAR VALIDADOS AQUI!
                    // a partir daqui, zeramos o banco ("data2" que será replicado p/ db "data"(oficial) ) e vamos fazer todo o procedimento de reinserção do dados
                    return removeCreateDatas('data2').then(ret=>{
                        db.init('data2');
                        var current_batch = [];
                        var batch_number = 0;
                        var courses = {};
                        var addresses = {};
                        // armazenará todos os processos asyncs, para sabermos quando realmente terminou tudo...
                        // será uma array de Promise's
                        var arrPromises=[];

                        // resultados
                        var resultsGeral=[];
                        var resultsCourses=[];
                        var resultsAddresses={repetidos:0,novos:0};


                        for(var i = 0; i < classrooms_json.length; i++) {
                            classrooms_json[i]._id = "T"+classrooms_json[i].id.toString();
                            classrooms_json[i].type = "Turma";

                            addresses["U"+classrooms_json[i].unidade.id] = classrooms_json[i].unidade;
                            addresses["U"+classrooms_json[i].unidade.id].type = "Unidade";
                            addresses["U"+classrooms_json[i].unidade.id]._id = "U"+classrooms_json[i].unidade.id;

                            classrooms_json[i].unidade = "U"+classrooms_json[i].unidade.id;
                            courses["C"+classrooms_json[i].idCurso] = {
                                _id: "C"+classrooms_json[i].idCurso,
                                titulo: classrooms_json[i].titulo,
                                nivel: classrooms_json[i].nivel,
                                type: "Curso",
                                escolaridadeMinima: classrooms_json[i].escolaridadeMinima,
                                idadeMinima: classrooms_json[i].idadeMinima,
                                areaAtuacao: classrooms_json[i].areaAtuacao,
                                perfilConclusao: classrooms_json[i].perfilConclusao
                            }

                            //console.log("Inserting '",classrooms_json[i].titulo,"' classroom...");
                            var classroom = classrooms_json[i];
                            current_batch.push(classroom);
                            if ((current_batch.length >= 300)||(i == (classrooms_json.length-1))) {
                                // console.log("Batch #",batch_number," = ",current_batch.length);
                                batch_number++;
                                arrPromises.push(new Promise((res,rej)=>{
                                    return db.bulk({docs: current_batch},function (er, result) {
                                        resultsGeral.push(result);
                                        if (er) {
                                            console.log("Error: ",er);
                                            return rej(er);
                                        } else {
                                            // console.log("Result: ",result);
                                                return res({ok:true});
                                        }
                                    });
                                }));
                                    current_batch = [];
                                }
                                /*
                                db.insert(classroom,"T"+classrooms_json[i].id.toString(),function (er, result) {
                                    if (er) {
                                        console.log("Error: ",er);
                                    }
                                    console.log("Result: ",result);
                                });
                                */
                            } // end of for
                            batch_number = 100;
                            current_batch = [];
                            var j = 0;
                            for (var key in courses) {
                                current_batch.push(courses[key]);
                                if ((current_batch.length >= 300)||(j == (Object.keys(courses).length-1))) {
                                    // console.log("Batch #",batch_number," = ",current_batch.length);
                                    batch_number++;
                                    arrPromises.push(new Promise((res,rej)=>{
                                        return db.bulk({docs: current_batch},function (er, result) {
                                            resultsCourses.push(result);
                                            if (er) {
                                                // console.log("Error: ",er);
                                                return rej(er);
                                            } else {
                                                // console.log("Result: ",result);
                                                if(result && result.error=='conflict')
                                                    resultsCourses.repetidos++;
                                                else
                                                    resultsCourses.novos++;
                                                
                                                return res({ok:true});
                                            }
                                        });
                                    }));
                                    current_batch = [];
                                }
                            j++;
                        }
                        batch_number = 200;
                        current_batch = [];
                        var l = 0;
                        for (var key in addresses) {
                            arrPromises.push(new Promise((res,rej)=>{
                                return googleMapsClient.geocode({
                                    address: addresses[key].nome+", "+addresses[key].municipio+", Rio Grande do Sul"
                                }, function(err, response) {
                                    if (!err) {
                                        this.address.geometry = {type: "Point",coordinates: [response.json.results[0].geometry.location.lng,response.json.results[0].geometry.location.lat]};
                                        this.address.type = "Unidade";
                                        // console.log("Google Geo API Result: geometry=",this.address.geometry);

                                        return db.insert(this.address,this.address.id,function(err, body, header) {
                                            if(err) {
                                                // console.log('[data.insert] ', err.message);
                                                // console.log('[statusCode] ', err.statusCode);

                                                if(!(err.error=='conflict' && err.statusCode===409)) {
                                                    return rej(err);
                                                } else {
                                                    resultsAddresses.repetidos++;
                                                }
                                            } else {
                                                resultsAddresses.novos++;
                                                // console.log(body);
                                            }
                                            return res({ok:true});
                                        });
                                    } else {
                                        console.log('$$$$$$$$$ ERRO COM O googleMpasClient.geocode',err);
                                        return rej('$$$$$$$$$ ERRO COM O googleMpasClient.geocode');
                                    }
                                }.bind({ address: addresses[key] }));
                            }));

                            /*
                            current_batch.push (addresses[key]);
                            if ((current_batch.length >= 300)||(l == (Object.keys(addresses).length-1))) {
                            console.log("Batch #",batch_number," = ",current_batch.length);
                            batch_number++;
                            db.bulk({docs: current_batch},function (er, result) {
                            if (er) {
                            console.log("Error: ",er);
                            } else {
                            //                console.log("Result: ",result);
                            }
                            });
                            current_batch = [];
                            }
                            l++;
                            */
                        } // loop em addresses

                        Promise.all(arrPromises)
                        .then((ret)=>{
                            // tratar o resultsCourses e resultsGeral que são arrays de arrays de objs com {error:'conflict'}

                            var fncArray=function(elem) {
                                var arrayIn=this.arrayIn;
                                if(Array.isArray(elem)) {
                                    elem.forEach(fncArray.bind({arrayIn:arrayIn}));
                                } else {
                                    if(elem.error=='conflict') {
                                        arrayIn.repetidos++;
                                    } else {
                                        arrayIn.novos++;
                                    }
                                }
                            }

                            var resultsCourses2={repetidos:0, novos:0}
                            var resultsGeral2={repetidos:0, novos:0}
                            resultsCourses.forEach(fncArray.bind({arrayIn:resultsCourses2}));
                            // resultsCourses=null;
                            resultsGeral.forEach(fncArray.bind({arrayIn:resultsGeral2}));
                            console.log('###########################################################');
                            console.log('OPERAÇÃO DE SINC ENCERRADA!!!');
                            // console.log('resultsGeral2',resultsGeral2);
                            // console.log('resultsCourses2',resultsCourses2);
                            // console.log('resultsAddresses',resultsAddresses);
                            return resMaster([resultsGeral2,resultsAddresses,resultsCourses2]);
                        },err=>{
                            console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
                            console.log('erro na execução de sinc',err);
                            return rejMaster(err);
                            // process.exit(2);
                        });

                    },err=>{
                        // problema ao remover/recriar a db "data2"
                        // throw err;
                        return rejMaster(err);
                    });

                    // console.log("Response finished!");
                }); // res.on('end')
            }).on("error", (err) => {
                const errCode=err.code;
                var error={error:'Houve um erro de rede!'}
                if(errCode == 'ENOTFOUND') {
                    error.error='Não foi possível acessar o Webservice, houve um problema de rede.'
                }
                console.log("event error on http.get",err);
                return rejMaster(error);
            });
        }) // Promise principal
    },err=>{
        // aqui não conseguimos setar o runningStatus, devemos parar...
        throw err;
    })
    .then(ret=>{
        // aqui a func foi concluída com sucesso!! Agora começa a etapa de log;
        // console.log('capturando o resolved pra gerar log*****',ret);

        var total=ret[0].novos;
        var totalAddress=ret[1].novos;
        var totalCourses=ret[2].novos;
        log={
            ret:ret,
            type:'log',
            task:'syncCourses',
            status:'success',
            msg:`Registros: (${total})Geral; (${totalAddress})Endereços; (${totalCourses})Cursos;`
        }
        var log2=Object.assign({},log);
        delete log2.ret;
        dbLog.insert2(log2,0,{makeId:1});
        return saveExec({
            now2:new Date(),
            status:'success'
        });
    })
    .then(ret=>{
        // etapa da replicação
        return replicateDATA();
    })
    .then(ret=>{
        // aqui já temos a func executada com sucesso e o status passado de "running" de volta à "success"
        // o retorno de "saveExec"(ret) não é relevante, contanto que seja resolved
        const obj={
            ok:true,
            general:log.ret[0].novos,
            addresses:log.ret[1].novos,
            courses:log.ret[2].novos,
            msg:log.msg
        }
        return obj;
    })
    .catch(err=>{
        // console.log('capturando o erro pra gerar log$$$$$$$$$$$',err);
        var error={
            msg:err.error,
            type:'log',
            task:'syncCourses',
            status:'fail'
        }
        saveExec({
            now2:new Date(),
            status:'fail',
            error:err.error
        });
        dbLog.insert2(error,0,{makeId:1}).then(ret=>{
            console.log('dbLog.insert2 RESOLVED');
            throw ret;
        },err=>{
            console.log('dbLog.insert2 REJECTED');
            throw err;
        });
        throw err;
    });
} // syncCourses


module.exports = {syncCourses};