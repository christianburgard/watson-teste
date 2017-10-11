const passport = require('passport');
const routes = require('../../routes/user');
const bcrypt = require('bcrypt');

//DATABASE
//**************** DB ********************//

var db = new(require('../../db'))();
db.init('users');

/******************************************/

// Generate Password
const saltRounds = 10;
const salt = bcrypt.genSaltSync(saltRounds);

function initUser(app) {
    app.get('/login',  routes.login);
    app.post('/login', passport.authenticate('local', {
        successRedirect: '/',
        failureRedirect: '/login?e=1'
    }));
     app.get('/logout', function(req, res){
        req.logout();
        req.session.destroy();
        res.redirect("/");
     });


     app.get('/profile',  passport.authenticationMiddleware(), routes.profile);
     app.post('/profile', function(req, res){
        if(!req.body.new_password1){
            req.session['error'] = "Nova senha inválida!";
            res.redirect("/profile");
        }
        else if(req.body.new_password1 != req.body.new_password2){
            req.session['error'] = "As senhas não conferem";
            res.redirect("/profile");
       }
       else {
        // verifica credenciais
        bcrypt.compare(req.body.password, req.user.password, (err, isValid) => {
            if (err) {
                console.log(err);
                req.session['error'] = "Nova senha inválida!";
                res.redirect("/profile");
                return;
            }
            if (!isValid) {
                req.session['error'] = "Senha atual inválida!";
                res.redirect("/profile");
                return;
            }
            req.session['error'] = "Tudo OK!!";
            //TODO: Validar os inputs
            user = req.user
            var hash = bcrypt.hashSync(req.body.new_password1, salt);
            user.password = hash;
            db.saveDocument(user._id, user, res);
            res.redirect("/profile");
          });


        
        }
     });
}

module.exports = initUser
