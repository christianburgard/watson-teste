const passport = require('passport');
const routes = require('../../routes');
const http = require('http');

//DATABASE
//**************** DB ********************//

var db = new(require('../../db'))();
db.init('data');

/******************************************/


function initAddresses (app) {
  app.get('/addresses', passport.authenticationMiddleware(), routes.addresses)
  app.get('/addresses/sync', function(req, res){

    var http = require('http');
    var googleMapsClient = require('@google/maps').createClient({
      key: 'AIzaSyD7yHgFYKXzy0cbhulswqPEQN7kTFRFE_g'
    });

    var totalInsertedRows = 0;

    var username = 'psf.ginfo';
    var password = 'xisto917';
    var options = {
      host: 'wwwapp.sistemafiergs.org.br',
      port: 7880,
      path: '/psf/api/senai/unidades',
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
        var addresses_json = JSON.parse(data);
        for(var i = 0; i < addresses_json.length; i++) {
          googleMapsClient.geocode({
            address: addresses_json[i].nome
          }, function(err, response) {
            if (!err) {
              this.address.geometry = {type: "Point",coordinates: [response.json.results[0].geometry.location.lng,response.json.results[0].geometry.location.lat]};
              this.address.type = "Unidade";
              console.log("Google Geo API Result: geometry=",this.address.geometry);

              db.insert(this.address,this.address.id,function(err, body, header) {
                if (err) {
                  return console.log('[data.insert] ', err.message);
                } else {
                  totalInsertedRows++;
                }
                console.log(body);
              });
            }
          }.bind({ address: addresses_json[i] }));
        }
        console.log("Response finished! Inserted ",totalInsertedRows," rows into Cloudant of a total of ",addresses_json.length," elements that came in JSON.");
      });
    }).on("error", (err) => {
      console.log("Error: " + err.message);
    });
    res.redirect("/");
  });
}

module.exports = initAddresses
