/**
 * Module dependencies.
 */

const express = require('express'),
    routes = require('./routes'),
    user = require('./routes/user'),
    http = require('http'),
    https = require('https'),
    fs = require('fs'),
    path = require('path');
const util = require('./app/util');

const {initDb}=require('./dbInit')

const USE_HTTPS = false;


console.log('%%%%%%%%% Iniciando pré-configurações %%%%%%%%%');
initDb()
    .then((ret)=>{
        console.log('################### initDb EXECUTADO COM SUCESSO!! ##################',ret);
    }).catch(err=>{
        console.log('!!!!!!!!!!!!!!!!!!!!! ERRO AO INICIAR O initDb !!!!!!!!!!!!!!!!!!!!!',err);
        process.exit(2);
    });


const session = require('express-session');

var cookieParser = require('cookie-parser');
var MemcachedStore = require('connect-memjs')(session);

const passport = require('passport');

const app = express();
function getStoreCredentials(jsonData) {
  var vcapServices = JSON.parse(jsonData);
  for (var vcapService in vcapServices) {
    if (vcapService.match(/memcachedcloud/i)) {
      vcapServices[vcapService][0].credentials.servers = [].concat(vcapServices[vcapService][0].credentials.servers);
      return vcapServices[vcapService][0].credentials;
    }
  }
}

var storeCredentials = {};
if (process.env.VCAP_SERVICES) {
  storeCredentials = getStoreCredentials(process.env.VCAP_SERVICES);
} else {
  storeCredentials = getStoreCredentials(fs.readFileSync("vcap-local.json", "utf-8"));
}
app.use(cookieParser());
var store = new MemcachedStore(storeCredentials);

store.on('connect', function() {
     // Cloudant Session store is ready for use 
    console.log("CloudantStore connected succesfully!");
});
 
store.on('disconnect', function() {
    // failed to connect to cloudant db - by default falls back to MemoryStore 
    console.log("CloudantStore disconnected!");
});
 
store.on('error', function(err) {
    // You can log the store errors to your app log 
    console.log("CloudantStore Error:",err);
});
app.use(session({
    store: store,
    resave: false,
    saveUninitialized: false,
    secret: 'edsQAcookie'
}));
require('./app/authentication').init(app)


var fileToUpload;


var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var logger = require('morgan');
var errorHandler = require('errorhandler');
var multipart = require('connect-multiparty')
var multipartMiddleware = multipart();

var cors = require('cors');
app.use(cors({"credentials": true, "origin": "http://104.236.80.74"}));

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);
app.use(logger('dev'));
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(methodOverride());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/style', express.static(path.join(__dirname, '/views/style')));

/* Session And authentication */
/*
app.use(session({
  secret: 'edsQAcookie',
  resave: false,
  saveUninitialized: false,
  //cookie: { secure: true }
}));
*/
app.use(passport.initialize());
app.use(passport.session());
app.use(function(req, res, next){
    res.locals.isAuthenticated = req.isAuthenticated();
    
    res.locals.isAdmin = false;
    if(res.locals.isAuthenticated){
        res.locals.isAdmin = (req.user.role === "admin");
    } 
    next();
});

// development only
if ('development' == app.get('env')) {
    app.use(errorHandler());
}

//DB 
var db = new(require('./db'))();
db.init('data');

app.get('/', passport.authenticationMiddleware(), routes.index);


/* Q&A API Methods */
app.get('/api/courses', function(request, response) {

    console.log("Get method invoked.. ")

    var id = request.query.id || "";

    //(intent: !exists): Retorna somente questões que não foram associadas a intenções
    var query = {
        "selector": { 
          "$and": [
            { "type": "question"} ,
            {  "intent": { "$exists": false } }
          ] 
        },
        "sort": [
            {
                "description:string": "asc"
            }
        ]
    };

    if(id != ""){
        query.selector.$and.push({theme: {_id: id}});
    }

    console.log("Selector: "+JSON.stringify(query));

    db.find(query,function(err, body){
        if (!err) {
            var len = body.docs.length;
            console.log('total # of docs -> ' + len);
            response.json(body.docs);
        } else {
            console.log(err);
        }
    });

});
app.get('/api/courses/export', function (request, response) {
    
    var id = request.query.id || "";
    var intent = (request.query.intent === "true");
    
        //(intent: !exists): Retorna somente questões que não foram associadas a intenções
        var query = {
            "selector": { 
              "$and": [
                { "type": "question"} ,
                {  "intent": { "$exists": intent } }
              ] 
            },
            "sort": [
                {
                    "description:string": "asc"
                }
            ]
        };
    
        if(id != ""){
            query.selector.$and.push({theme: {_id: id}});
        }
    
        db.find(query, function (err, body) {
            if (!err) {
                var len = body.docs.length;
                var output="";
                if(len > 0 ){
                    body.docs.forEach(function(question) {
                            output += question.description + "," + question.intent +","+ question.updated + "\n";
                    }, this);
                } 
                var filename = "courses_"+new Date().toISOString().replace(/[\:\.-]/gi,"")+".csv";
                var contentDispositionHeader = 'attachment; filename="'+filename+'"';
                response.set({'Content-Disposition': contentDispositionHeader});
                response.set({ 'content-type': 'text/csv; charset=utf-8' })
                response.write(output);
                response.end();
            } else {
                console.log(err);
                response.sendStatus(500).end();
            }
        });
    
});

app.post('/api/courses', function(request, response) {

    console.log("Create Invoked..");
    console.log("Description: " + request.body.description);
    console.log("Theme: " + request.body.theme);

    question = {
        description: sanitizeInput(request.body.description),
        theme: request.body.theme,
        type: "question"
    }

    if(request.user){
      try{
          var u = JSON.parse(JSON.stringify(request.user));
          delete u.password;
          question.author = u;
        }
        catch(e){

        }
    }

    db.saveDocument(null, question , response);

});
app.delete('/api/courses', function(request, response) {

    console.log("Delete Invoked..");
    var id = request.query.id;

    console.log("Removing document of ID: " + id);
    console.log('Request Query: ' + JSON.stringify(request.query));

    db.get(id, {
        revs_info: true
    }, function(err, doc) {
        if (!err) {
            db.destroy(doc._id, doc._rev, function(err, res) {
                // Handle response
                if (err) {
                    console.log(err);
                    response.sendStatus(500);
                } else {
                    response.sendStatus(200);
                }
            });
        }
    });

});

app.get('/api/addresses', function (request, response) {
    
    if(!request.query.intent){
        console.log("Error: invalid intent")
        response.sendStatus(500).end();
    }
    var intent = request.query.intent;
    
    var query = {
        "selector": { 
            "intent": intent,
            "type": "answer" },
        "sort": [
            {
                "title:string": "asc"
            }
        ]
    };


    db.find(query, function (err, body) {

        if (!err) {
            var len = body.docs.length;

            if(len == 0)
            {

                var newAnswer = {
                    "type": "answer",
                    "title": "Respostas para a intenção "+intent,
                    "intent": intent,
                    "output": {
                        "text": {
                            "values": [],
                            "selection_policy": "sequential"
                        }
                    }
                };
                // save doc
                db.insert(newAnswer, '', function(err, doc) {
                    if (err) {
                        console.log(err);
                    } else {
                        newAnswer._id = doc.id;
                        newAnswer._rev = doc.rev;
                        response.json([newAnswer]);
                    }
                });
            }
            else 
            {
                // Document Found
                console.log('Answer found...');
                response.setHeader('Content-Type', 'application/json');
                response.json(body.docs);

            }
        } else {
            response.sendStatus(500).end();
            console.log(err);
        }
    });

});
app.post('/api/addresses', function (request, response) {

    db.saveDocument(request.body._id, request.body, response);

});
app.delete('/api/addresses', function (request, response) {

    console.log("Delete Invoked..");
    var id = request.query.id;
    
    console.log("Removing document of ID: " + id);
    console.log('Request Query: ' + JSON.stringify(request.query));

    db.get(id, {
        revs_info: true
    }, function (err, doc) {
        if (!err) {
            db.destroy(doc._id, doc._rev, function (err, res) {
                // Handle response
                if (err) {
                    console.log(err);
                    response.sendStatus(500);
                } else {
                    response.sendStatus(200);
                }
            });
        }
    });

});

require('./app/admin').init(app);
require('./app/user').init(app);
require('./app/course').init(app);
require('./app/address').init(app);
require('./app/api').init(app);
require('./app/chat').init(app);


// INICIANDO O AGENDADOR
const {scheduler_init}=require('./scheduler/scheduler_init.js');
scheduler_init({
    dbPath:path.join(__dirname,'./db.js'),
    dbName:'general_settings', // nome da db onde ficam os agendamentos (que têm um formato próprio; ver class Schedule)
    dbLogName:'general_log', // nome da db onde são gravados os logs das tarefas; (não é o schedule_logs que é específico do agendador e não muda...)
    app:app
});

/* apenas teste;
var httpTest=http.createServer(function(req,res) {
    // vai ficar sem resposta mesmo
});
httpTest.listen(7880,()=>console.log('HTTPTEST STARTED!!!')); */


var server;
// Secure HTTPS
if (USE_HTTPS) {
    var privateKey  = fs.readFileSync('/etc/ssl/nginx/wisepanel.wisegears.com.key', 'utf8');
    var certificate = fs.readFileSync('/etc/ssl/nginx/wisepanel.wisegears.com.cer', 'utf8');
    var credentials = {key: privateKey, cert: certificate};
    server=http.createServer(credentials,app).listen(app.get('port'), '0.0.0.0', function() {
        console.log('Express server over HTTPS listening on port ' + app.get('port'));
    });
} else {
    server=http.createServer(app).listen(app.get('port'), '0.0.0.0', function() {
        console.log('Express server over Plain HTTP listening on port ' + app.get('port'));
    });
}

app.get('/html_task',function(req,res) {
    res.render('html_task.html');
});

/* server.timeout=10000;
server.on('timeout',(socket)=>{
    // console.log(socket);
    socket.destroy();
}); */
/*
// plain HTTP
http.createServer(app).listen(app.get('port'), '0.0.0.0', function() {
    console.log('Express server listening on port ' + app.get('port'));
});
*/

/*

*/