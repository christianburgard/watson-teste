const passport = require('passport');
const routes = require('../../routes');
const http = require('http');

const {syncCourses}=require('./syncCourses');

//DATABASE
//**************** DB ********************//

var db = new(require('../../db'))();
db.init('data');

/******************************************/

function initCourses (app) {
    app.get('/courses', passport.authenticationMiddleware(), routes.courses)
    app.get('/courses/sync', function(req, response){
        return syncCourses()
            .then((ret)=>{
                console.log('retorno do syncCourse RESOLVED!%%%%%%%%');
                const obj={
                    ok:true,
                    general:ret[0].novos,
                    addresses:ret[1].novos,
                    courses:ret[2].novos,
                }
                return response.json(obj);
            },err=>{
                // aqui deu erro, o que fazer?
                console.log('!!!!!!!!! PROMISE REJECTED !!!!!!!!!');
                return response.status(500).json(err);
            });
    });
}

module.exports = initCourses;