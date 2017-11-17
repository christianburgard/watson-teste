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
        mydb.index(full_text_index,function(er, result) {
            if (er) {
                if(er.headers.statusCode === 503 && er.message == 'text') {
                    console.log(`############## ERRO SOMENTE LOCAL ##########`);
                    console.log(er.error);
                    console.log(`############## ERRO SOMENTE LOCAL ##########`);
                } else {
                    throw er;
                    // return rej(er);
                }
            }
            if(result) {
                if (result.result == "exists") {
                    console.log('Index already existed: ', result);
                } else if (result.result == "created") {
                    console.log('Index was created: ', result);
                }
            }
        });
    }




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
                
            });
        }); // initChatLog
    }
        


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
    var initData=function() {
        return removeData()
        .then(ret=>{
            // removemos com sucesso a db 'data', ou não fomos solicitados a remover;
            return new Promise((res,rej)=>{
                cloudant.db.create('data', function (err, resultCreated) {
                    if(err) {
                        if(err.error=='file_exists')
                            return res('Db "data" já criada!');
                        
                        return rej(err);
                    }             
                    const mydb=cloudant.use('data');
                    console.log('#################################################################');
                    console.log('########################### DATA AQUI ###########################');
                    console.log('#################################################################');
                    console.log('Since its a new "data" database, populating with cidades_rs.json data...');
                    cidades_rs = require('./cidades_rs.json');
                    console.log('ID 0 = ',cidades_rs[0]);
                    mydb.bulk({docs:cidades_rs}, function(err, body) {
                        if (err) {
                            console.log("Error: ",err);
                            return rej(err);
                        }
                        //   console.log("Body: ",body);
                        console.log("TOTAL DE CIDADES INSERIDAS: ",body.length);
                        return res({totalCities:body.length});
                    });
                    /*
                    for(var i = 0; i < cidades_rs.length; i++) {
                        var cidade = cidades_rs[i];
                        console.log('Inserting ',cidade);
                        mydb.insert(cidade);
                    }
                    */
                    createIndex('data');
                    
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
                    mydb.insert(ddoc, function (er, result) {
                        if (er) {
                            return rej(er);
                            // throw er;
                        } else {
                            console.log('Created design document with city index');
                            return res({result});
                        }
                    });
                    // CITY INDEXER [Fim]
                });
            },err=>{
                // erro ao remover a db 'data' e não é erro 404 (not found)...
                return rej(err);
            });

        }); // initData
    }

    
    // } else if (dbCredentials.dbName = 'users') {
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
            initChatlog(),
            initData(),
            initUser()
        ]
    }
    return Promise.all(arr);
} // initDb

module.exports={initDb,getCloudant,isLocal};