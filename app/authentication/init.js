const passport = require('passport');
const bcrypt = require('bcrypt');
const LocalStrategy = require('passport-local').Strategy

const authenticationMiddleware = require('./middleware')

//**************** DB ********************//

var fs = require('fs');

var db = new(require('../../db'))();
db.init('users');
/******************************************/



// Generate Password
const saltRounds = 10
// const myPlaintextPassword = 'eds@2017'
const salt = bcrypt.genSaltSync(saltRounds)
const userCache = [];

// const user = {
//   username: 'eds',
//   passwordHash,
//   id: 1
// }

// function findUser (username, callback) {
//   if (username === user.username) {
//     return callback(null, user)
//   }
//   return callback(null)
// }

function findUser(username, callback) {



  var docList = [];
  var i = 0;
  var query = {
    "selector": {
      "type": "user",
      "username": username
    },
    "sort": [{
      "username:string": "asc"
    }]
  };

  //    console.log("User Selector: "+JSON.stringify(query));

  if (userCache[username] !== undefined && userCache[username] !== null) {
    // console.log("returning user from cache: "+JSON.stringify(userCache[username]));
    return callback(null, JSON.parse(JSON.stringify(userCache[username])));
  } else {
    db.find(query, function (err, body) {
      if (!err) {
        var len = body.docs.length;
        //       console.log("Usuários Encontrados:"+len);
        if (len == 0) {
          console.log("usuário não encontrado [find]: " + username);
	  if (username == "admin") {
            var hash = bcrypt.hashSync("eds@2017", salt);
            user = {
              type: "user",
              name: "Admin",
              email: "admin@extremedigital.com.br",
              username: "admin",
              password: hash
            }
            db.insert(user);
            return callback(null, user);
          } else {
            return callback(null);
          }
        } else {
          var user = body.docs[0];
          user.cachedAt = new Date();
          userCache[user.username] = JSON.parse(JSON.stringify(user));
          return callback(null, user)
        }
      } else {
        console.log(err);
      }

      return callback(null)
    });
  }
}


passport.serializeUser(function (user, cb) {
  cb(null, user.username)
})

passport.deserializeUser(function (username, cb) {
  findUser(username, cb)
})

function initPassport() {
  passport.use(new LocalStrategy(
    (username, password, done) => {
      findUser(username, (err, user) => {
        if (err) {
          return done(err)
        }

        // User not found
        if (!user) {
          console.log('User not found');
          return done(null, false)
        } else {
          if (user.password != "") {
            // Always use hashed passwords and fixed time comparison
            bcrypt.compare(password, user.password, (err, isValid) => {
              if (err) {
                return done(err)
              }
              if (!isValid) {
                return done(null, false)
              }
              return done(null, user)
            });
          }
        }
      })
    }
  ))

  passport.authenticationMiddleware = authenticationMiddleware
}

module.exports = initPassport
