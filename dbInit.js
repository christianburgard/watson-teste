const isLocal=process.env.DBLOCAL;
const fs=require('fs');
function getCloudant() {
    var getDBCredentialsUrl = function (jsonData) {
        var vcapServices = JSON.parse(jsonData);
        // Pattern match to find the first instance of a Cloudant service in
        // VCAP_SERVICES. If you know your service key, you can access the
        // service credentials directly by using the vcapServices object.
        for (var vcapService in vcapServices) {
            if (vcapService.match(/cloudant/i)) {
                return vcapServices[vcapService][0].credentials.url;
            }
        }
    } // getDBCredentialsUrl

    /* var dbCredentials = {
        dbName: dbName
    }; */
    var dbCredentials={};
    //When running on Bluemix, this variable will be set to a json object
    //containing all the service credentials of all the bound services
    if (process.env.VCAP_SERVICES) {
        dbCredentials.url = getDBCredentialsUrl(process.env.VCAP_SERVICES);
    } else { //When running locally, the VCAP_SERVICES will not be set

        // When running this app locally you can get your Cloudant credentials
        // from Bluemix (VCAP_SERVICES in "cf env" output or the Environment
        // Variables section for an app in the Bluemix console dashboard).
        // Once you have the credentials, paste them into a file called vcap-local.json.
        // Alternately you could point to a local database here instead of a
        // Bluemix service.
        // url will be in this format: https://username:password@xxxxxxxxx-bluemix.cloudant.com

        // queremos acessar
        
        var confs;
        if(isLocal) {
            confs=JSON.stringify({"cloudantNoSQLDB": [{"credentials": {"username": "admin","password": "admin","host": "localhost","port": 5984,"url": "http://admin:admin@localhost:5984"}}]})
        } else {
            confs=fs.readFileSync("vcap-local.json", "utf-8")
        }
        dbCredentials.url = getDBCredentialsUrl(confs);
    }
    //cloudant = require('cloudant')(dbCredentials.url);
    //Incluindo Retry!
    var cloudant = require('cloudant')({url: dbCredentials.url, plugin:'retry', retryAttempts:20, retryTimeout:1000 });

    return {
        cloudant:cloudant
    }

} // getCloudant



/**
 * serve p/ iniciar as db's necessárias e eventualmente inserir dados, será chamado uma vez só ao iniciar;
 * retorna promise, se rejeitar, derruba a aplicação!
 * @argument funcs - array opcional com lista de funcs que devem ser executadas ['initChatlog'|'initData'|'initUser'];
 * @argument params - obj de parâmetros {remove:['chatlog'|'data'|'users']}; db's a serem removidas antes de serem criadas;
 * **APENAS A REMOÇÃO DA DB 'data' ESTÁ IMPLEMENTADA**
 */
function initDb(funcs,params) {
    if(!params) params={}
    var removeDb=params.remove || [];
    var fs = require('fs');
    var cidades_rs;
    const {cloudant}=getCloudant();
    var util = require('util');
    var bcrypt = require('bcrypt');

    /* cloudant.db.create(dbCredentials.dbName, function (err, resMaster) {
        if (err) {
            console.log('Could not create new db: ' + dbCredentials.dbName + ', it might already exist.');
            console.log(`code: ${err.headers.statusCode} --- error: ${err.error}`);
        } else {
            console.log('Created a new db: ' + dbCredentials.dbName + ', because it wasnt found.');
            // var mydb = cloudant.use(dbCredentials.dbName);
            

        }
    }); */


    /**
     * será chamado na criação de todas as bases
     * @param {*nome da db a ter seu index criado} dbName 
     */
    const createIndex=function(dbName) {
        const mydb=cloudant.use(dbName);
        const full_text_index = { "index": {}, "type": "text" };
        return new Promise((res,rej)=>{
            return mydb.index(full_text_index,function(er, result) {
                if (er) {
                    if(er.headers.statusCode === 503 && er.message == 'text') {
                        console.log(`############## ERRO SOMENTE LOCAL ##########`);
                        console.log(er.error);
                        console.log(`############## ERRO SOMENTE LOCAL ##########`);
                    } else {
                        // throw er;
                        return rej(er);
                    }
                }
                if(result) {
                    if (result.result == "exists") {
                        console.log('Index already existed: ', result);
                    } else if (result.result == "created") {
                        console.log('Index was created: ', result);
                    }
                }
                return res({ok:true});
            });
        });
    }




    /**
     * apenas cria a db "general_settings", se não existir...
     * essa db armazenará confs gerais, por enquanto, apenas registros de agendamentos;
     */
    const initGeneralSettings=function() {

        function run(generator) {
            var it=generator(done);
            function done(promise) {
                if(promise instanceof Promise) {
                    return promise.then(ret=>it.next(ret),err=>it.throw(err));
                }
                return it.next();
            }

            return done();
        }

        var create=new Promise((res,rej)=>{
            return cloudant.db.create('general_settings', function (err, resultCreated) {
                if(err) {
                    if(err.error=='file_exists')
                        return res('Db "general_settings" já criada!');
                        
                    return rej(err);
                }
                    
                // const mydb=cloudant.use('chatlog');            
                createIndex('general_settings');
                return res('Db "general_settings" criada com sucesso!');
                
            });
        });

        var getGeneralSettings=function(db) {
            return new Promise((res,rej)=>{
                return db.find({
                    "selector": {
                       "type": "parameter",
                       "schedule": {
                          "$type": "object"
                       },
                       "schedule.task": "syncCourses"
                    }
                 },function(err,results) {
                    if(err) {
                        return rej(err);
                    }
                    const docs=results.docs;
                    if(docs.length > 1) {
                        return rej({error:'Há mais de um registro de agendamento para sincronização de cursos'});
                    }
                    if(!docs.length) {
                        return res(0);
                    }
                    return res(docs[0]);
                 });
            });
        } // getGeneralSettings

        // criação do syncCourses (apenas se já não existir...)
        var createSyncCourses=function(db) {
            const syncCoursesObj={
                type:"parameter",
                name:"Sincronização de cursos",
                schedule:{
                    task:"syncCourses",
                    on:0,
                    status:'',
                    interval:{
                        value:300,
                        cond:null
                    }
                }
            }
            return new Promise((res,rej)=>{
                db.insert(syncCoursesObj,function(err,body,header) {
                    if(err) {
                        return rej({error:'Não foi possível criar a tarefa de sincronização',errNative:err});
                    }
                    return res('Tarefa de sincronização de cursos criada com sucesso!');
                });
            });
        }

        return new Promise((res,rej)=>{

            return run(function*(done) {
                try {
                    let criacao=yield done(create);
                    const db=cloudant.use('general_settings');
                    let syncCourseSchedule=yield done(getGeneralSettings(db));

                    if(syncCourseSchedule && syncCourseSchedule.schedule.status=="running") {
                        // ZERANDO STATUS TRAVADO EM "running"
                        syncCourseSchedule.schedule.status='renew';
                        db.insert(syncCourseSchedule,syncCourseSchedule._id,function(err, body, header) {
                            if(err) {
                                return rej(err);
                            }
                            console.log('zerando status de syncCourses em general_settings',body);
                            return res('Status de syncCourses zerada!!');
                        });
                    } else if(!syncCourseSchedule) {
                        // não há registro de tarefa do "syncCourses", vamos criar!
                        yield done(createSyncCourses(db));
                    } else {
                        return res('general_setting criada e syncCourses verificado.');
                    }
                } catch(e) {
                    return rej(e);
                }
            });
        });
    } // initGeneralSettings


    /**
     * apenas cria a db "general_log", se não existir...
     */
    const initGeneralLog=function() {

        const createView=(db)=>{
            const obj={
                "_id": "_design/total-docs",
                "views": {
                    "total-docs": {
                        "map": "function(doc) {return emit(doc.task,1)}",
                        "reduce": "_count"
                    }
                }
            }
            return new Promise((res,rej)=>{
                return db.insert(obj,function(err,body) {
                    if(err) {
                        if(err.statusCode == 409 && err.error=='conflict') 
                            return res('View "general_log/total-docs" já criada!');
                        
                        return rej(err);
                    }
                    return res({ok:true,msg:'View "general_log/total-docs" criada com sucesso!!'});
                });
            });
        } // createView

        return new Promise((res,rej)=>{
            return cloudant.db.create('general_log', function (err, resultCreated) {
                if(err) {
                    if(err.error=='file_exists') {
                        return res('Db "general_log" já criada!');
                    }
                        
                    return rej(err);
                }
                // const mydb=cloudant.use('chatlog');            
                createIndex('general_log');
                return res('Db "general_log" criada com sucesso!');
            });
        }).then(ret=>{
            return createView(cloudant.use('general_log'));
        });
    } // initGeneralLog

    /**
     * apenas cria a db "chatlog", se não existir...
     */
    const initChatlog=function() {
        return new Promise((res,rej)=>{
            return cloudant.db.create('chatlog', function (err, resultCreated) {
                if(err) {
                    if(err.error=='file_exists')
                        return res('Db "chatlog" já criada!');
                        
                    return rej(err);
                }
                
                // const mydb=cloudant.use('chatlog');            
                createIndex('chatlog');
                return res('Db "chatlog" criada com sucesso!');
                
            });
        }); // initChatLog
    }


    /**
     * serve para zerar a db "data", opcional;
     * no start da aplicação, logicamente, isso não é acionado, apenas quando executamos o sync de dados com o webservice
     */
    var removeData=function() {
        return new Promise((res,rej)=>{
            if(removeDb.indexOf('data') > -1) {
                console.log('########## REMOVENDO DB \'data\'...');
                return cloudant.db.destroy('data',function(err) {
                    if(err) {
                        if(err.statusCode==404)
                        return rej(err);
                    } else {
                        console.log('########## DB \'data\' REMOVIDA COM SUCESSO! ########## ');
                    }
                    return res({ok:true});
                });
            } else {
                return res({ok:true});
            }
        });
    }

    /**
     * inicia a db "data", opcionalmente apagando-a totalmente (usado somente no sync de dados com o webservice)
     */
    var initData=function() {
        var mydb;
        return removeData()
        .then(ret=>{
            // removemos com sucesso a db 'data', ou não fomos solicitados a remover;
            return new Promise((res,rej)=>{
                cloudant.db.create('data', function (err, resultCreated) {
                    if(err) {
                        if(err.error=='file_exists') {
                            // replicateDATA();
                            return res({msg:'Db "data" já criada!',exists:true});
                        }
                        
                        return rej(err);
                    }
                    return res({ok:true});
                });
            });
        })
        .then(ret=>{
            // db data criada com sucesso!
            mydb=cloudant.use('data');
            if(ret && ret.exists) {
                // não devemos inserir cidades, a db "data" já existe;
                return ret;
            }

            // inserindo dados de cidades;
            return new Promise((res,rej)=>{
                // console.log('#################################################################');
                // console.log('########################### DATA AQUI ###########################');
                // console.log('#################################################################');
                console.log('Since its a new "data" database, populating with cidades_rs.json data...');
                cidades_rs = require('./cidades_rs.json');
                console.log('ID 0 = ',cidades_rs[0]);
                return mydb.bulk({docs:cidades_rs}, function(err, body) {
                    if (err) {
                        console.log("Error: ",err);
                        return rej(err);
                    }
                    //   console.log("Body: ",body);
                    console.log("TOTAL DE CIDADES INSERIDAS: ",body.length);
                    // replicateDATA();
                    return res({totalCities:body.length});
                });
            });
        })
        .then(ret=>{
            // criando indice
            return createIndex('data');
        })
        .then((ret)=>{
            // indice de cidades
            return new Promise((res,rej)=>{
                // CITY INDEXER [Inicio]
                var city_indexer = function(doc) {
                    if ((doc.type == "Unidade") && doc.geometry && doc.geometry.coordinates) {
                        st_index(doc.geometry);
                    }
                };
                var ddoc = {
                    _id: '_design/address',
                    st_indexes: {
                        address_points: {
                            index: city_indexer
                        }
                    }
                };
                return mydb.insert(ddoc, function (er, result) {
                    if(er) {
                        if(er.statusCode==409 && er.error=='conflict') {
                            return res({msg:'Index already exists!'});
                        }
                        return rej(er);
                        // throw er;
                    } else {
                        console.log('Created design document with city index');
                        return res({result});
                    }
                });
                // CITY INDEXER [Fim]
            });
        })
        .catch(err=>{
            // catch geral;
            throw err;
            // return rej(err);
        }); // initData
    } // initData


    /**
     * inicia a db "users"
     */
    var initUser=function() {
        return new Promise((res,rej)=>{
            // return rej('error 1');
            return cloudant.db.create('users', function (err, resultCreated) {
                if(err) {
                    if(err.error=='file_exists')
                    return res('Db "users" já criada!');
                    
                    return rej(err);
                }
                const mydb=cloudant.use('users');
                var saltRounds = 10;
                var salt = bcrypt.genSaltSync(saltRounds);
                
                var hash = bcrypt.hashSync("eds@2017", salt);
                var user = {
                    type: "user",
                    name: "Admin",
                    email: "admin@extremedigital.com.br",
                    username: "admin",
                    password: hash
                }
                mydb.insert(user,function(err,result){
                    if(err) {
                        return rej(err);
                    }
                    console.log('Since its a new "users" database, admin user created with default password!');
                    return res(result);
                });
                createIndex('users');
            });
        }); // initUser
    }

    var arr=[];
    if(funcs) {
        try {
            funcs.forEach(elem=>{
                arr.push(eval(elem)());
            });
        } catch(e) {
            return Promise.reject({error:'Argumento "funcs inválido. [initChatlog|initData|initUser]"'});
        }
    } else {
        arr=[
            initGeneralSettings(),
            initChatlog(),
            initData(),
            initUser(),
            initGeneralLog()
        ]
    }
    return Promise.all(arr);
} // initDb

module.exports={initDb,getCloudant,isLocal};