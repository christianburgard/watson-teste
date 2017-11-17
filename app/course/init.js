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
                return response.json(ret);
            },err=>{
                // aqui deu erro, o que fazer?
                return response.json(err);
            });
    });
}

module.exports = initCourses;