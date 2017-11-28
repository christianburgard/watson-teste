const uuidv1=require('uuid/v1');
const {initDb,getCloudant,isLocal} = require('./dbInit')


function db(){

    // var fs = require('fs');
    // var cloudant, db, cidades_rs;
    // var util = require('util');
    // var bcrypt = require('bcrypt');

    const {cloudant}=getCloudant();

    this.native=cloudant;

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
        this.create = this.db.create;
        this.find = this.db.find;
        this.get = this.db.get;
        this.insert = this.db.insert;
        this.destroy = this.db.destroy;
        this.bulk = this.db.bulk;

        // versão Promise de insert
        this.insert2=(data,id,params)=>{
            if(!params) params={};
            const makeId=params.makeId || false;
            if(makeId===1) {
                const uuid=uuidv1();
                data._id=uuid;
                id=uuid;
            }
            return new Promise((ret,res)=>{
                // console.log('@@@@@@@@@ acionou promise insert2!!!!!');
                return this.insert(data,id,function(err,body,header) {
                    if(err) {
                        console.log('@@@@@@@@@ error insert2!!!!!',err);
                        return rej(err);
                    }

                    // console.log(`Sucesso:`,body);
                    return res({id,body,header});
                });
            });
        } // this.insert2

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
        return this;
    }
    return this;

};
module.exports = db;
