const passport = require('passport');
const routes = require('../../routes');
const http = require('http');

//DATABASE
//**************** DB ********************//

var db = new(require('../../db'))();
db.init('data');

/******************************************/

function initCourses (app) {
  app.get('/courses', passport.authenticationMiddleware(), routes.courses)
  app.get('/courses/sync', function(req, res){

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
        var current_batch = [];
        var batch_number = 0;
        var courses = {};
        var addresses = {};

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
          current_batch.push (courses[key]);
          if ((current_batch.length >= 300)||(j == (Object.keys(courses).length-1))) {
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
          j++;
        }
        batch_number = 200;
        current_batch = [];
        var l = 0;
        for (var key in addresses) {
          googleMapsClient.geocode({
            address: addresses[key].nome+", "+addresses[key].municipio+", Rio Grande do Sul"
          }, function(err, response) {
            if (!err) {
              this.address.geometry = {type: "Point",coordinates: [response.json.results[0].geometry.location.lng,response.json.results[0].geometry.location.lat]};
              this.address.type = "Unidade";
              console.log("Google Geo API Result: geometry=",this.address.geometry);

              db.insert(this.address,this.address.id,function(err, body, header) {
                if (err) {
                  console.log('[data.insert] ', err.message);
                } else {
                  console.log(body);
                }
              });
            }
          }.bind({ address: addresses[key] }));

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
        }
        console.log("Response finished!");
      });
    }).on("error", (err) => {
      console.log("Error: " + err.message);
    });
    res.redirect("/");
  });
}

module.exports = initCourses
