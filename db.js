function db(){

    var fs = require('fs');
    var cloudant, db, cidades_rs;
    var util = require('util');
    var bcrypt = require('bcrypt');

    this.getDBCredentialsUrl = function (jsonData) {
        var vcapServices = JSON.parse(jsonData);
        // Pattern match to find the first instance of a Cloudant service in
        // VCAP_SERVICES. If you know your service key, you can access the
        // service credentials directly by using the vcapServices object.
        for (var vcapService in vcapServices) {
            if (vcapService.match(/cloudant/i)) {
                return vcapServices[vcapService][0].credentials.url;
            }
        }
    }

    this.saveDocument = function (id, obj, response) {

        var date = new Date();

        if (id === undefined || id === null) {
            // Generated random id
            id = '';
            obj.created = date;
        }
        
        obj.updated = date;

        this.db.insert(obj, id, function (err, doc) {
            console.log(JSON.stringify(doc));
            if (err) {
                console.log(err);
                response.sendStatus(500).end();
            } else {
                response.json(doc);
            }
        });

    }

    this.init = function(dbName) {

        var dbCredentials = {
            dbName: dbName
        };
        //When running on Bluemix, this variable will be set to a json object
        //containing all the service credentials of all the bound services
        if (process.env.VCAP_SERVICES) {
            dbCredentials.url = this.getDBCredentialsUrl(process.env.VCAP_SERVICES);
        } else { //When running locally, the VCAP_SERVICES will not be set

            // When running this app locally you can get your Cloudant credentials
            // from Bluemix (VCAP_SERVICES in "cf env" output or the Environment
            // Variables section for an app in the Bluemix console dashboard).
            // Once you have the credentials, paste them into a file called vcap-local.json.
            // Alternately you could point to a local database here instead of a
            // Bluemix service.
            // url will be in this format: https://username:password@xxxxxxxxx-bluemix.cloudant.com
            dbCredentials.url = this.getDBCredentialsUrl(fs.readFileSync("vcap-local.json", "utf-8"));
        }

        //cloudant = require('cloudant')(dbCredentials.url);
        
        //Incluindo Retry!
        cloudant = require('cloudant')({url: dbCredentials.url, plugin:'retry', retryAttempts:20, retryTimeout:1000 });
        
        // check if DB exists if not create
        cloudant.db.create(dbCredentials.dbName, function (err, res) {
            if (err) {
              console.log('Could not create new db: ' + dbCredentials.dbName + ', it might already exist.');
            } else {
              console.log('Created a new db: ' + dbCredentials.dbName + ', because it wasnt found.');
              var mydb = cloudant.use(dbCredentials.dbName);

              full_text_index = { "index": {}, "type": "text" };

              mydb.index(full_text_index,function(er, result) {
                if (er) {
                  throw er;
                }
                if (result.result == "exists") {
                  console.log('Index already existed: ', result);
                } else if (result.result == "created") {
                  console.log('Index was created: ', result);
                }
              }); 
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
                  throw er;
                } else {
                  console.log('Created design document with city index');
                }
              });

              if (dbCredentials.dbName == 'data') {
                console.log('Since its a new "data" database, populating with cidades_rs.json data...');
                cidades_rs = require('./cidades_rs.json');
                console.log('ID 0 = ',cidades_rs[0]);
                mydb.bulk({docs:cidades_rs}, function(err, body) {
                  if (err) {
                    console.log("Error: ",err);
                  }
                  console.log("Body: ",body);
                });
/*
                for(var i = 0; i < cidades_rs.length; i++) {
                  var cidade = cidades_rs[i];
                  console.log('Inserting ',cidade);
                  mydb.insert(cidade);
                }
*/
              } else if (dbCredentials.dbName = 'users') {
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
                mydb.insert(user);
                console.log('Since its a new "users" database, admin user created with default password!');
              }
            }
        });
        this.db = cloudant.use(dbCredentials.dbName);
        this.find = this.db.find;
        this.get = this.db.get;
        this.insert = this.db.insert;
        this.destroy = this.db.destroy;
        this.bulk = this.db.bulk;

        this.getRevision = function (id, rev, callback){
            
                cloudant.request({ db: dbCredentials.dbName,
                                   doc: id,
                                   method: 'GET',
                                   qs: { rev: rev }
                                 }, callback)
        }
//       this.db.index(function(er, result) {
//          if (er) {
//            throw er;
//          }
          //console.log('The database has %d indexes', result.indexes.length);
//          for (var i = 0; i < result.indexes.length; i++) {
            //console.log('  %s (%s): %j', result.indexes[i].name, result.indexes[i].type, result.indexes[i].def);
//          }
 
//        }); 
    }


    return this;

};
module.exports = db;
