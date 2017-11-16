const {initDb,getCloudant,isLocal} = require('./dbInit')


function db(){

    // var fs = require('fs');
    // var cloudant, db, cidades_rs;
    // var util = require('util');
    // var bcrypt = require('bcrypt');

    const {cloudant}=getCloudant();


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

        // this.db = cloudant.use(dbCredentials.dbName);
        this.db = cloudant.use(dbName);
        this.find = this.db.find;
        this.get = this.db.get;
        this.insert = this.db.insert;
        this.destroy = this.db.destroy;
        this.bulk = this.db.bulk;

        this.getRevision = function (id, rev, callback){
            
                // cloudant.request({ db: dbCredentials.dbName,
                cloudant.request({ db: dbName,
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
