const http = require('http');



//DATABASE
//**************** DB ********************//

const {initDb}=require('../../dbInit');
var db = new(require('../../db'))();
db.init('data');

/******************************************/

function syncCourses(app) {
    const dbLog=new(require('../../db'))();
    dbLog.init('general_log');
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
                // a partir daqui, zeramos o banco e vamos fazer todo o procedimento de reinserção do dados
                return initDb(['initData'],{remove:['data']}).then(ret=>{

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
                    // problema ao remover/recriar e inserir cidades na db 'data'
                    throw err;
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
    .then(ret=>{
        // console.log('capturando o resolved pra gerar log*****',ret);

        var total=ret[0].novos;
        var totalAddress=ret[1].novos;
        var totalCourses=ret[2].novos;
        var log={
            type:'log',
            task:'syncCourses',
            status:'success',
            msg:`Registros: (${total})Geral; (${totalAddress})Endereços; (${totalCourses})Cursos;`
        }
        dbLog.insert2(log,0,{makeId:1});
        return ret;
    })
    .catch(err=>{
        // console.log('capturando o erro pra gerar log$$$$$$$$$$$',err);
        var error={
            msg:err.error,
            type:'log',
            task:'syncCourses',
            status:'fail'
        }
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