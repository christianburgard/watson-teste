const admin = require('../../routes/admin')
const bcrypt = require('bcrypt')
const passport = require('passport');

// Generate Password Salt
const saltRounds = 10
const salt = bcrypt.genSaltSync(saltRounds)

//DATABASE
//**************** DB ********************//

var db = new(require('../../db'))();
db.init('users');

/******************************************/
function initUser(app) {
    app.get('/admin/createuser',  passport.authenticationMiddleware(),  admin.createuser)
    app.post('/admin/createuser', function(request, response) {

        console.log("Create User Invoked..");
        
        var hash = bcrypt.hashSync(request.body.password, salt);

        //TODO: Validar os inputs
        user = { 
            type: "user",
            name: request.body.fullname,
            email: request.body.email,
            username: request.body.username,
            password: hash
        }
        db.saveDocument(null, user, response);

    });
}

module.exports = initUser
