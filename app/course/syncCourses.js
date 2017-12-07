const http = require('http');
const fs=require('fs');
const path=require('path');

var addToCoord=[]; // dados a serem acrescentados no arq coodinates_rs.json

const coordFileName='./coordinates_rs.json';
var getCoordinates=function() {
    var coordinates=fs.readFileSync(coordFileName);
    if(!coordinates) {
        coordinates=[];
    } else {
        coordinates=JSON.parse(coordinates);
    }
    return coordinates;
}
var coordinates=getCoordinates();



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
                if(ret.docs.length) {
                    doc=ret.docs[0];
                    if(doc.schedule.status == 'running') {
                        throw {error:'Tarefa em execução',status:'running'}
                    }
                } else {
                    throw {error:'Não foi encontrado registro da tarefa sincronizadora de cursos!! Contate o suporte.'}
                }
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


    var db = new(require('../../db'))();
    
    // apenas centralização do processo de bulk
    var saveBulk=function(array) {
        db.init('data');
        const maxBulk=300;
        var miniBulk=function(array) {
            return new Promise((res,rej)=>{
                return db.bulk({docs: array},function (er, result) {
                    if (er) {
                        // console.log("Error: ",er);
                        return rej({error:er});
                    } else {
                        return res({ok:true});
                    }
                });
            });
        }
        const peaces=Math.ceil(array.length/maxBulk);
        var begin=0
        var end=maxBulk;
        var arrays=[]; // será blocos de informações a serem salvos; blocos de "maxBulk"
        for(var i=1;i<=peaces;i++) {
            arrays.push(array.slice(begin,end));
            begin=maxBulk*i;
            end=begin+maxBulk;
        }
        
        return new Promise((res,rej)=>{
            run(function*(done) {
                var i=0;
                var ret;
                while(i<arrays.length) {
                    ret=yield done(miniBulk(arrays[i]));
                    if(ret && ret.error) {
                        // deu erro, para tudo
                        return rej(ret.error)
                    }
                    i++;
                }
                return res({ok:true})
            });
        });

    } // saveBulk

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


    
    // db.init('data');
    
    /**
     * aqui estamos deletando a "data2" e recriando para podemos injetar os dados oriundos do webservice
     */
    /* var removeCreateDatas=function(dbName) {
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
    */

    /**
     * Replica db: "data2" => "data"
     */
    /* var replicateDATA=function() {
        console.log('########################### REPLICAÇÃO Inicio ###########################');
        // return removeCreateDatas(['data2']).then(ret=>{
        var promise=initDb(['initData'],{remove:['data']});
        return Promise.resolve(promise).then(ret=>{
            return new Promise((res,rej)=>{
                return db.native.db.replicate('data2','data',{create_target:true},function(err,body) {

                    if(err) {
                        console.log('(ERROR)(ERROR)(ERROR)(ERROR)(ERROR)(ERROR)(ERROR)(ERROR)(ERROR)(ERROR)',err);
                        return rej(err);
                    }
                    console.log('(BODYYYY)(BODYYYY)(BODYYYY)(BODYYYY)(BODYYYY)(BODYYYY)(BODYYYY)(BODYYYY)(BODYYYY)(BODYYYY)',body.ok);
                    return res(body);
                });
            });

        });
    } */


    // traz as 3 arrays de dados do webservice;
    var getData=()=>{
        return new Promise((resMaster,rejMaster)=>{         
            var http = require('http');
            var googleMapsClient = require('@google/maps').createClient({
                key: 'AIzaSyD7yHgFYKXzy0cbhulswqPEQN7kTFRFE_g',
                Promise:Promise
            });

            var username = 'psf.ginfo';
            var password = 'xisto917';
            var options = {
                host: 'wwwapp.sistemafiergs334.org.br',
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

                    var arrClassrooms=[]; // array de informações principais/gerais;
                    var courses = {};
                    var arrCourses=[]; // array de cursos;
                    var addresses = {};
                    var arrAddresses=[]; // array de endereços;

                    // possível array com processamento de todas as coordenadas não encontradas no arquivo;
                    // rodará uma vez, e raramente quando uma nova unidade for adicionada à lista;
                    var arrAddrPromises=[];

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
                        arrClassrooms.push(classroom);
                    } // loop principal

                    for(var key in courses) {
                        arrCourses.push(courses[key]);
                    }

                    for (var key in addresses) {
                        let nome=addresses[key].nome;
                        let municipio=addresses[key].municipio;
                        let coordObj=coordinates.find(elem=>elem.nome==nome && elem.municipio==municipio);
                        if(coordObj) {
                            addresses[key].geometry={type: "Point",coordinates: coordObj.coordinates};
                            addresses[key].type="Unidade";
                            arrAddresses.push(addresses[key]);
                        } else {
                            arrAddrPromises.push(new Promise((res,rej)=>{
                                var address2=Object.assign({},addresses[key]);

                                return googleMapsClient.geocode({
                                    address: address2.nome+", "+address2.municipio+", Rio Grande do Sul"
                                },function(err,response) {
                                    if(err) {
                                        console.log('########################### erro no GEOCODE',err);
                                        return rej(err);
                                    }
                                    let coords=[response.json.results[0].geometry.location.lng,response.json.results[0].geometry.location.lat];
                                    address2.geometry = {type: "Point",coordinates: coords};
                                    address2.type = "Unidade";
                                    // console.log("Google Geo API Result: geometry=",this.address.geometry);
                                
                                    addToCoord.push({
                                        nome:nome,
                                        municipio:municipio,
                                        coordinates:coords
                                    });
                                    arrAddresses.push(address2);
                                    return res({ok:true});
                                });
                            }));
                        }

                    } // loop em addresses

                    // vamos começar processando as possíveis coordenadas não encontradas no arquivo;
                    Promise.all(arrAddrPromises)
                    .then(ret=>{
                        // aqui a "data" já foi deletada;
                        // essas 3 arrays arrClassrooms,arrCourses,arrAddresses contém as informações que deverão ser inseridas no "data"
                        
                        // retorno final
                        return resMaster({
                            arrays:[arrClassrooms,arrCourses,arrAddresses]
                        });
                    },err=>{
                        // aqui houve um erro na parte dos addresses
                        return rejMaster(err);

                    })
                }); // res.on('end')
            }).on("error", (err) => {
                const errCode=err.code;
                var error={error:'Houve um erro de rede!',errNative:err}
                if(errCode == 'ENOTFOUND') {
                    error.error='Não foi possível acessar o Webservice, houve um problema de rede.'
                }
                console.log("event error on http.get aqui ERROR será logado: ->",error);
                return rejMaster(error);
            });
        }) // Promise principal
    } // getData


    const dbLog=new(require('../../db'))();
    dbLog.init('general_log');
    const makeLog=(params)=>{
        if(!params) params={};
        let toMerge=params.toMerge || {};

        const now=Date.now();
        let toSave={
            type:'log',
            task:'syncCourses',
            status:'fail',
            time:now
        }
        toSave=Object.assign(toSave,toMerge);
        return dbLog.insert2(toSave,0,{makeId:1});
    }


    // generator
    function run(generator) {
        var it=generator(done);

        function done(promise) {
            if(promise instanceof Promise) {
                return promise.then(ret=>it.next(ret),err=>it.next(err));
            }
            it.next();
        }
        done(1);
    }

    return setRunningStatus()
    .then(ret=>{
        // vamos pegar os dados do webservice;
        return getData();
    },err=>{
        // aqui não conseguimos setar o runningStatus, devemos parar...
        throw err;
    })
    .then(ret=>{
        // aqui conseguimos pegar os dados e fazer os tratamentos, inclusive com coordinates
        var arrays=ret.arrays; // 3 arrays de dados que devem ser inseridas no "data"
        var geral=arrays[0];
        var courses=arrays[1];
        var addresses=arrays[2];
        var results={
            geral:geral.length,
            courses:courses.length,
            addresses:addresses.length,
            scheduleStatus:'success' // se falharmos, mudamos isso aqui antes de retornar a promise (p/ efeitos de log)
        };
        // em caso de sucesso, se não, mudamos a prop msgScheduleLog p/ logar a msg de erro;
        results.msgScheduleLog=`Registros: (${results.geral})Geral; (${results.addresses})Endereços; (${results.courses})Cursos;`;
        
        // função completa: apaga a "data", recria, insere cidades e então os dados em bulk;
        var execArrays=function() {
            return initDb(['initData'],{remove:['data']})
            .then(ret=>{
                    var arrayPromises=[
                        saveBulk(geral),
                        saveBulk(courses),
                        saveBulk(addresses)
                    ];
                    return  Promise.all(arrayPromises);
                });
        } // execArrays

        // inserindo possíveis novos dados de localidade (é raro...)
        if(addToCoord.length) {
            // addToCoord
            addToCoord=addToCoord.concat(coordinates);
            addToCoord=JSON.stringify(addToCoord);
            fs.writeFile(coordFileName,addToCoord,function(err) {
                if(err) {
                    console.log('#############################################');
                    console.log('(ERRO DO FSWRITE)(ERRO DO FSWRITE)(ERRO DO FSWRITE)',err);
                }
                addToCoord=[];
                return coordinates=getCoordinates();
            });
        }

        const now=Date.now();
        return new Promise((res,rej)=>{
            run(function*(done) {
                var ret,
                    retLog, // general_log
                    retLogExec; // o schedule em si, só p/ controlar o status da execução (se está running ou não);
                var id_ref=''; // id p/ vincular logs de uma mesma operação (várias tentativas de uma mesma operação)
                var tries=1;
                while(true) {
                    ret=yield done(execArrays());
                    if(Array.isArray(ret) && ret.length === 3) {
                        // SUCESSO!
                        retLogExec=yield done(saveExec({
                            now2:new Date(),
                            status:'success',
                            error:""
                        }));
                        retLog=yield done(makeLog({toMerge:{
                            status:'success',
                            msg:results.msgScheduleLog, // por acaso a msg é a mesma do scheduler, mas poderia ser outra;
                            id_ref:id_ref,
                            tries:tries
                        }}));
                        break;
                    }

                    // se der erro, ret terá uma prop "error"
                    // registrando log da tentativa failed
                    retLog=yield done(makeLog({toMerge:{
                        status:'fail',
                        msg:ret.error, // aqui salvamos o erro;
                        id_ref:id_ref,
                        tries:tries
                    }}));
                    if(!id_ref) {
                        id_ref=retLog.id;
                    }
                    tries++;
                }
                // se chegamos até aqui, obtivemos sucesso;
                return res(results);
            });
        });

    })
    .catch(err=>{
        // console.log('capturando o erro pra gerar log$$$$$$$$$$$',err);
        var status=err.status ? err.status : 'fail';
        var error={
            msg:err.error,
            error:err,
            type:'log',
            task:'syncCourses',
            status:status,
            scheduleStatus:status,
            msgScheduleLog:err.error
        }
        saveExec({
            now2:new Date(),
            status:status,
            error:err.error
        });

        makeLog({toMerge:error})

        /* dbLog.insert2(error,0,{makeId:1}).then(ret=>{
            console.log('dbLog.insert2 RESOLVED');
            return ret;
        },err=>{
            console.log('dbLog.insert2 REJECTED');
            throw err;
        }); */
        throw error;
    });
} // syncCourses


module.exports = {syncCourses};



/*
log={
    ret:ret,
    type:'log',
    task:'syncCourses',
    status:'success',
    msg:`Registros: (${total})Geral; (${totalAddress})Endereços; (${totalCourses})Cursos;`
}
*/