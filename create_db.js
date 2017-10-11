#!/usr/bin/nodejs
    var dbCredentials = {
      dbName: 'data',
      username: "7cc18bb9-48d9-4988-a975-062ea5a5324d-bluemix",
      password: "07145c72e3d757654c56b51e488f0e0cdaba18a2be92867a87c37d11d806ff34",
      host: "7cc18bb9-48d9-4988-a975-062ea5a5324d-bluemix.cloudant.com",
      port: 443,
      url: "https://7cc18bb9-48d9-4988-a975-062ea5a5324d-bluemix:07145c72e3d757654c56b51e488f0e0cdaba18a2be92867a87c37d11d806ff34@7cc18bb9-48d9-4988-a975-062ea5a5324d-bluemix.cloudant.com"
    };
    var cloudant = require('cloudant')({url: dbCredentials.url, plugin:'retry', retryAttempts:20, retryTimeout:1000 });
    var db = cloudant.use(dbCredentials.dbName);
    var cidades_rs = require('./cidades_rs.json');
    db.bulk({docs:cidades_rs}, function(err, body) {
      if (err) {
        console.log(err);
      }
      console.log(body);
    });

