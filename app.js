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

const USE_HTTPS = true;

const passport = require('passport');

const app = express();

var cookieParser = require('cookie-parser')();

var session = require("express-session")({
    secret: "EDS089528345902348520934",
    resave: true,
    saveUninitialized: true
});

var sharedsession = require("express-socket.io-session");

app.use(cookieParser);
app.use(session);

// Use shared session middleware for socket.io
// setting autoSave:true

//app.use(cookieParser());

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

require('./app/admin').init(app);
require('./app/user').init(app);
require('./app/course').init(app);
require('./app/address').init(app);
require('./app/api').init(app);
require('./app/chat').init(app);

var server;
// Secure HTTPS
if (USE_HTTPS) {
  var privateKey  = fs.readFileSync('/etc/ssl/nginx/wisepanel.wisegears.com.key', 'utf8');
  var certificate = fs.readFileSync('/etc/ssl/nginx/wisepanel.wisegears.com.cer', 'utf8');
  var credentials = {key: privateKey, cert: certificate};
  server = https.createServer(credentials,app);
  
} else {
  server = http.createServer(app);
}

var io = require('socket.io')(server);
io.use(sharedsession(session, {
    autoSave:true
})); 
io.use(function(socket, next) {
    var req = socket.handshake;
    var res = {};
    cookieParser(req, res, function(err) {
        if (err) return next(err);
        session(req, res, next);
    });
});

io.on('connection', function(client){
  console.log("New connection over Socket.io");
  //client.session = {};
  client.on('chat-message', function(data){
    console.log("Socket.io Event:",data);
    var params = JSON.parse(data);
    var req = {},res = {};
    req.body = params;
    req.session = client.handshake.session;
//    req.session = client.session;
//    req.session.save = function() {};

    res.sendByProtocol  = function(body) {
      if (Array.isArray(body.output.text)) {
        body.output.text = body.output.text.join();
      }
      console.log("Emitindo watson-message com seguinte payload:",body);
      client.emit('watson-message',JSON.stringify(body));
    }
    
    callWatsonApi(req, res);
  });
  client.on('disconnect', function(){
    console.log("Disconnection over Socket.io");
  });
});

server.listen(app.get('port'), '0.0.0.0', function() {
    console.log('Express server listening on port ' + app.get('port'));
});

/*
// plain HTTP
http.createServer(app).listen(app.get('port'), '0.0.0.0', function() {
    console.log('Express server listening on port ' + app.get('port'));
});
*/

var db_chatlog = new(require('./db'))();
db_chatlog.init('chatlog');

const request = require('request');
const geolib = require('geolib');
const WORKSPACE_ID = process.env.WORKSPACE_ID ? process.env.WORKSPACE_ID : 'ce8dcd33-d63d-45d9-b61b-d05cb7c2b148';
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN ? process.env.PAGE_ACCESS_TOKEN : 'EAAEDrYzsZCxMBALp0o1KXaZC2ibT63FLBn7uRlaoqhIhxrtYJK5krJjZBfDaIzIH9ZCkCqAT9xvAmxJYMZA2LVCFGqA12kvH5Y1bSueVgSfK084wSmGF4cxEI3Quz9NCO4PkKZCCk8VRmxnQvwNEfPAqIbo7xW1NfSXnSsXXKxCgZDZD';

var ongoingFBChats = {}; // Hash: key=facebook_user_id, value=attributes Hash
var keepaliveTimers = {}; // Hash: key=conversation_id, value=setTimeout pointer reference

function getConversationCredentials(jsonData) {
  var vcapServices = JSON.parse(jsonData);
  var conversationCredentials = {};

  var vcapServices = JSON.parse(jsonData);
  for (var vcapService in vcapServices) {
    if (vcapService.match(/conversation/i)) {
      conversationCredentials = vcapServices[vcapService][0].credentials;
    }
  }
  return conversationCredentials;
}

var conversationCredentials = {};
if (process.env.VCAP_SERVICES) {
  conversationCredentials = getConversationCredentials(process.env.VCAP_SERVICES);
} else { //When running locally, the VCAP_SERVICES will not be set
  conversationCredentials = getConversationCredentials(fs.readFileSync("vcap-local.json", "utf-8"));
}
var ConversationV1 = require('watson-developer-cloud/conversation/v1');

function processTags(text_input) {
  var text_output = "";
//  var begin_index = 0;
//  begin_index = text_input.indexOf("<!",i);
  var end_index = 0;

  console.log("==================== DEBUG =====================");
  for (var begin_index=text_input.indexOf("<!",0); begin_index >= 0;begin_index=text_input.indexOf("<!",begin_index)) {
    if (end_index == 0)
      text_output += text_input.substring(end_index,begin_index)
    else
      text_output += text_input.substring(end_index+2,begin_index);

    end_index = text_input.indexOf("!>",begin_index);
    var method_call = text_input.substring(begin_index+2,end_index).trim();
    var method_name = method_call.substring(0,method_call.indexOf("(",0));
    var method_args = method_call.substring(method_call.indexOf("(",0)+1,method_call.indexOf(")",0)).split("|");
    console.log("method_call = ",method_call);
    console.log("method_name = ",method_name);
    console.log("method_args = ",method_args);
    console.log("begin_index = ",begin_index);
    console.log("end_index = ",end_index);
    switch(method_name) {
      case "defined?":
        if (method_args[0])
          text_output += method_args[1]
        else
          text_output += method_args[2];
        break;
  
      case "print":
          text_output += method_args.join("");
        break;

      case "unixtime":
          if (method_args[0]) {
            var date = new Date(parseInt(method_args[0]));
            text_output += date.getDate()+"/"+(date.getMonth()+1)+"/"+date.getFullYear();
          }
        break;
  
      default:
        text_output += "ERROR! Method not found: "+method_name;
    }
    begin_index = end_index-1;
  }
  if (end_index == 0)
    text_output += text_input.substring(end_index,text_input.length)
  else
    text_output += text_input.substring(end_index+2,text_input.length);
  return text_output;
}

function receivedMessage(event) {
  // Putting a stub for now, we'll expand it in the following steps
  console.log("Message data: ", event.message);
}
function callSendAPI(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      console.log("Successfully sent generic message with id %s to recipient %s", 
        messageId, recipientId);
    } else {
      console.error("Unable to send message.");
      console.error(response);
      console.error(error);
    }
  });
}
function splitWithFullWords(str, l){
    var strs = [];
    while(str.length > l){
        var pos = str.substring(0, l).lastIndexOf('\n');
        pos = pos <= 0 ? l : pos;
        strs.push(str.substring(0, pos));
        var i = str.indexOf('\n', pos)+1;
        if(i < pos || i > pos+l)
            i = pos;
        str = str.substring(i);
    }
    strs.push(str);
    return strs;
}

function callWatsonApi (req, res) {
  var conversation = new ConversationV1({
    username: conversationCredentials.username,
    password: conversationCredentials.password,
    version_date: ConversationV1.VERSION_DATE_2017_05_26
  });

  merged_parameters = req.body;
  merged_parameters.workspace_id = WORKSPACE_ID;
  if (!merged_parameters.context)
    merged_parameters.context = {};
  if (req.session.conversation_id) {
    merged_parameters.context.conversation_id = req.session.conversation_id;
  } else if (req.body.context.facebook_user_id) {
    if (ongoingFBChats[req.body.context.facebook_user_id]) {
      merged_parameters.context = ongoingFBChats[req.body.context.facebook_user_id].context;
      merged_parameters.context.conversation_id = ongoingFBChats[req.body.context.facebook_user_id].conversation_id;
      console.log("FCL conversa",ongoingFBChats[req.body.context.facebook_user_id].conversation_id,"do usuario",req.body.context.facebook_user_id,"RECUPERADA como On-Going");
    }
  }
/*
  if (keepaliveTimers[merged_parameters.context.conversation_id]) {
    var oldTimer = keepaliveTimers[merged_parameters.context.conversation_id];
    oldTimer.clearTimeout();
  }
  keepaliveTimers[merged_parameters.context.conversation_id] = setTimeout(function() {
      var response = {};
      response.output = {};
      response.context = {};
      if (req.body.context.facebook_user_id) {
        response.context.facebook_user_id = req.body.context.facebook_user_id;
      }
      response.output.text = "Ainda estou aqui! Posso ajudar em algo mais?";
      res.sendByProtocol(response);
  },3000);
  console.log ("[KeepAlive] Timer criado para conversation_id = ",merged_parameters.context.conversation_id);
*/
  conversation.message(merged_parameters, function(err, response) {
       if (err) {
         console.error(err);
       } else {
//         var conversation_id = {};
//         if (req.session.conversation_id) {
           //Conversa existente _@_
           conversation_id = response.context.conversation_id;
           console.log("_@_ BEFORE req.session.conversation_id =",conversation_id);
           if (req.body.context.facebook_user_id) {
             ongoingFBChats[req.body.context.facebook_user_id] = {};
             ongoingFBChats[req.body.context.facebook_user_id].context = response.context;
             ongoingFBChats[req.body.context.facebook_user_id].timestamp = Date.now();
             ongoingFBChats[req.body.context.facebook_user_id].conversation_id = conversation_id;
             console.log("FCL conversa",conversation_id,"do usuario",req.body.context.facebook_user_id,"gravada como On-Going");
           } else {
             req.session.conversation_id = conversation_id;
             req.session.save();
             console.log("SES Sessao salva:",req.session);
           }
           console.log("_@_ AFTER response.context.conversation_id =",conversation_id);
           db_chatlog.find({selector:{_id: conversation_id} },function (err,result) {
             if (err) {
               console.log("Error: ",err);
             } else {
               var conversation_log = {};

               if (result.docs.length > 0) {
                 conversation_log = result.docs[0];
                 //console.log(result.docs[0]);
                 conversation_log._rev = conversation_log._rev;
               }

               if (!conversation_log.messages) {
                 conversation_log.messages = [];
               }

               conversation_log.messages.push(response);
               //console.log("_@_ Inserindo",conversation_log);
               db_chatlog.insert(conversation_log,conversation_id,function(err, body, header) {
                 if (err) {
                   console.log('_@_ [data.insert] ', err.message);
                 } else {
                   console.log("_@_ Gravada conversa!");
                 }
               });
             }
           });
//         } else {
           // Como esta eh a primeira mensagem,
           // cria nova conversa no conversation log
//           conversation_id = req.session.conversation_id;
//         }
         if ((response.context)&&(response.context.request)) {
           console.log('API action:',response.context.request.api_action);
           console.log('API args:',response.context.request.args);

           if (response.context.request.api_action == "addresses_by_city") {
             var city_name = response.context.request.args.city_name;
             console.log ("city_name = ",city_name);

             db.find({selector:{name: { "$in": city_name }}},function (err,result) {
               if (err) {
                 console.log("Error: ",err);
               } else {
                 console.log('Found %d cities with Name=%s', result.docs.length,city_name);
                 for (var i = 0; i < result.docs.length; i++) {
                   console.log('  Doc id: %s | Name: %s', result.docs[i]._id,result.docs[i].name);
                   var city_latitude = result.docs[i].geometry.coordinates[1];
                   var city_longitude = result.docs[i].geometry.coordinates[0];
                   if ((response.context.request)&&(response.context.request.args)&&(response.context.request.args.near)) {
                     db.db.geo("address","address_points",{q: "type:'Unidade'",g:"POINT("+result.docs[i].geometry.coordinates[0]+" "+result.docs[i].geometry.coordinates[1]+")",nearest: true,sort: ["distance"],include_docs: true,limit:20}, function (err2, result2) {
          	       if (err2) {
          	         console.log("Error: ",err2);
          	       } else {
          	         console.log("Nearest were: ",result2);
                         var addresses = [];

                         if ((response.context.request)&&(response.context.request.args)&&(response.context.request.args.name_only)) {
                           for (i=0; i < result2.rows.length; i++) {
                             var address = result2.rows[i].doc;
                             address.latitude = address.geometry.coordinates[1];
                             address.longitude = address.geometry.coordinates[0];
     
                             addresses.push(address.nome);
                           }
                         } else {
                           for (i=0; i < result2.rows.length; i++) {
                             var address = result2.rows[i].doc;
                             address.latitude = address.geometry.coordinates[1];
                             address.longitude = address.geometry.coordinates[0];
     
                             addresses.push(address);
                           }
                         }
                         var callback_parameters = {};
                         callback_parameters.context = response.context;
                         callback_parameters.input = {};
                         callback_parameters.workspace_id = WORKSPACE_ID;
                         callback_parameters.input.api_callback = {"action": "addresses_by_city"};
                         callback_parameters.input.addresses = addresses;
                         console.log("recursively calling callWatsonApi...");
                         req2 = req;
                         req2.body = callback_parameters;
                         callWatsonApi(req2,res);
          	       } //else
          	     });
                   } else {
                     //Busca apenas na cidade especificada, sem procurar unidades em cidades próximas
                     city_name_in_caps = city_name.map(function(x){ return x.toUpperCase() });
                     var selector = {selector:{type:'Unidade',municipio: { "$in": city_name_in_caps }}};
                     console.log("find selector:",selector);
                     console.log("find city_name:",city_name_in_caps);
                     db.find(selector,function (err2,result2) {
          	       if (err2) {
          	       console.log("Error: ",err2);
          	       } else {
                         console.log("Found addresses within the cities were: ",result2);
                         var addresses = [];
                         if ((response.context.request)&&(response.context.request.args)&&(response.context.request.args.name_only)) {
                           for (i=0; i < result2.docs.length; i++) {
                             var address = result2.docs[i];
                             address.latitude = address.geometry.coordinates[1];
                             address.longitude = address.geometry.coordinates[0];
    
                             addresses.push(address.nome);
                           }
                         } else {
                           for (i=0; i < result2.docs.length; i++) {
                             var address = result2.docs[i];
                             address.latitude = address.geometry.coordinates[1];
                             address.longitude = address.geometry.coordinates[0];
    
                             addresses.push(address);
                           }
                         }
                         var callback_parameters = {};
                         callback_parameters.context = response.context;
                         callback_parameters.input = {};
                         callback_parameters.workspace_id = WORKSPACE_ID;
                         callback_parameters.input.api_callback = {"action": "addresses_by_city"};
                         callback_parameters.input.addresses = addresses;
                         if (addresses.length > 1) {
                           callback_parameters.input.addresses_found = true;
                         } else {
                           callback_parameters.input.addresses_found = false;
                         }
                         console.log("recursively calling callWatsonApi...");
                         req2 = req;
                         req2.body = callback_parameters;
                         callWatsonApi(req2,res);
                       }
                     });
                   }
                 }
               }
            });

           // Query usada até 2017-12-07 e mantida por motivo de retrocompatibilidade
           // Poderá ser excluída assim que os fluxos antigos que a usam forem desativados
           } else if (response.context.request.api_action == "near_addresses_by_city") {
             var city_name = response.context.request.args.city_name;
             console.log ("city_name = ",city_name);

             db.find({selector:{name: city_name} },function (err,result) {
               if (err) {
                 console.log("Error: ",err);
               } else {
                 console.log('Found %d cities with Name=%s', result.docs.length,city_name);
                 for (var i = 0; i < result.docs.length; i++) {
                   console.log('  Doc id: %s | Name: %s', result.docs[i]._id,result.docs[i].name);
                   var city_latitude = result.docs[i].geometry.coordinates[1];
                   var city_longitude = result.docs[i].geometry.coordinates[0];
                db.db.geo("address","address_points",{q: "type:'Unidade'",g:"POINT("+result.docs[i].geometry.coordinates[0]+" "+result.docs[i].geometry.coordinates[1]+")",nearest: true,sort: ["distance"],include_docs: true,limit:20}, function (err2, result2) {
//          	     db.db.geo("addresses","geoIndex",{q: "type:'conga'",lon: result.docs[i].geometry.coordinates[0],lat: result.docs[i].geometry.coordinates[1],radius: 50000,include_docs: true,sort: ["distance"]}, function (err, result) {
        	     if (err2) {
        	       console.log("Error: ",err2);
        	     } else {
        	       console.log("Nearest were: ",result2);
                     var addresses = [];
                     for (i=0; i < result2.rows.length; i++) {
                       var address = result2.rows[i].doc;
                       address.latitude = address.geometry.coordinates[1];
                       address.longitude = address.geometry.coordinates[0];

                       addresses.push(address);
                     }
                     var callback_parameters = {};
                     callback_parameters.context = response.context;
                     callback_parameters.input = {};
                     callback_parameters.workspace_id = WORKSPACE_ID;
                     callback_parameters.input.api_callback = {"action": "near_addresses_by_city"};
                     callback_parameters.input.addresses = addresses;
                     console.log("recursively calling callWatsonApi...");
                     req2 = req;
                     req2.body = callback_parameters;
                     callWatsonApi(req2,res);
/*                     conversation.message(callback_parameters, function(err2, response2) {
                       if (err2) {
                         console.error("Error: ",err2);
                       } else {
                         console.log("Respondendo:",JSON.stringify(response2, null, 2));
                         res.sendByProtocol(response2);
                       } //if
                     }); //conversation.message
*/
        	     } //else
        	   });
                }
              }
            });
           } else if (response.context.request.api_action == "near_courses_by_city") {
            var city_name = response.context.request.args.city_name;
            var area_atuacao = response.context.request.args.area;
            console.log ("city_name = ",city_name);

            db.find({selector:{name: city_name} },function (err,result) {
              if (err) {
                console.log("Error: ",err);
              } else {
                console.log('Found %d cities with Name=%s', result.docs.length,city_name);
                for (var i = 0; i < result.docs.length; i++) {
                  console.log('  Doc id: %s | Name: %s', result.docs[i]._id,result.docs[i].name);
                  var city_latitude = result.docs[i].geometry.coordinates[1];
                  var city_longitude = result.docs[i].geometry.coordinates[0];
                  db.db.geo("address","address_points", {q: "type:'Unidade'", g:"POINT("+result.docs[i].geometry.coordinates[0]+" "+result.docs[i].geometry.coordinates[1]+")", nearest: true, include_docs: true, limit:20},  function (err2, result2) {
                    var unidades_hash = {};
                    var unidades_hash2 = {};
        	      if (err2) {
        		console.log("Error: ",err2);
        	      } else {
                      var unidades = [];
                      var unidades2 = [];
                      console.log("Nearest were: ",result2);
                      for (var j = 0; j < result2.rows.length; j++) {
                        unidades.push(""+result2.rows[j].id);
                        unidades_hash[result2.rows[j].id] = result2.rows[j].doc.nome;
                        unidades2.push(result2.rows[j].doc.nome);
                        console.log("adicionando key=>value: "+result2.rows[j].id+"=>"+result2.rows[j].doc.nome);
                      }
                } // end else
                    var selector = { "selector": { "unidade": { "$in": unidades },"areaAtuacao": {"$eq": area_atuacao.toUpperCase()} } };
                    console.log("Find :",selector);
                    console.log("unidades_hash = ",unidades_hash);
                    db.find(selector,function(err3,result3) {
                      if (err3) {
                        console.log("Error: ",err3);
                      } else {
                        var turmas = [];
                        var near_addresses_with_courses = {};
                        var response_text = "";
                        for (var l = 0; l < result3.docs.length; l++) {
                          turmas.push({
                            id: result3.docs[l]._id,
                            titulo: result3.docs[l].titulo,
                            unidade: this.unidades_hash[result3.docs[l].unidade]
                          });
                          if (near_addresses_with_courses[this.unidades_hash[result3.docs[l].unidade]]) {
                            if (near_addresses_with_courses[this.unidades_hash[result3.docs[l].unidade]].includes(result3.docs[l].titulo)) {
			        //Já existe uma turma deste curso nesta unidade
                            } else {
                              near_addresses_with_courses[this.unidades_hash[result3.docs[l].unidade]].push(result3.docs[l].titulo);
                            }
                          } else {
                            near_addresses_with_courses[this.unidades_hash[result3.docs[l].unidade]] = [result3.docs[l].titulo];
                          }
                        }
                        for (unidade2 in unidades2) {
                          var address = unidades2[unidade2];
                          if (near_addresses_with_courses[address]) {
                            
                            if (res.protocol == "facebook") {
                              response_text = response_text + "*"+address+"*\r\n";
                            } else {
                              response_text = response_text + "<hr/><strong><a onclick=\"ConversationPanel.tapClick('Tenho interesse nos cursos da unidade "+address+".')\">" + address + "</strong>:<br/>";
                            }
                            for (var m = 0; m < near_addresses_with_courses[address].length; m++) {
                              if (res.protocol == "facebook") {
                                response_text = response_text + "• "+near_addresses_with_courses[address][m].toLowerCase()  + "\r\n";
                              } else {
                                response_text = response_text + "• <a onclick=\"ConversationPanel.tapClick('Tenho interesse no curso de "+near_addresses_with_courses[address][m].toLowerCase()+" da unidade "+address+"')\">"+near_addresses_with_courses[address][m].toLowerCase()  + "</a><br/>";
                              }
                            }
                            console.log("@@@ UNIDADE:"+unidades2[unidade2]);
                          }
                        }
/*
                        for (address in near_addresses_with_courses) {
                          if (res.protocol == "facebook") {
                            response_text = response_text + "** address **\r\n";
                          } else {
                            response_text = response_text + "<hr/><strong><a onclick=\"ConversationPanel.tapClick('Tenho interesse nos cursos da unidade "+address+".')\">" + address + "</strong>:<br/>";
                          }
                          for (var m = 0; m < near_addresses_with_courses[address].length; m++) {
                            if (res.protocol == "facebook") {
                              response_text = response_text + "• "+near_addresses_with_courses[address][m].toLowerCase()  + "\r\n";
                            } else {
                              response_text = response_text + "• <a onclick=\"ConversationPanel.tapClick('Tenho interesse no curso de "+near_addresses_with_courses[address][m].toLowerCase()+" da unidade "+address+"')\">"+near_addresses_with_courses[address][m].toLowerCase()  + "</a><br/>";
                            }
                          }
                        }
*/
                        var callback_parameters = {};
                        callback_parameters.workspace_id = WORKSPACE_ID;
                        callback_parameters.context = response.context;
                        callback_parameters.input = {};
//                          callback_parameters.input.turmas = turmas;
                        callback_parameters.input.response_text = response_text;
//                          callback_parameters.input.near_addresses_with_courses = near_addresses_with_courses;
                        callback_parameters.input.api_callback = {"action": "near_courses_by_city"};

                        console.log("Callback parameters: ",callback_parameters);
                        console.log("recursively calling callWatsonApi...");
                        req2 = req;
                        req2.body = callback_parameters;
                        callWatsonApi(req2,res);
/*
                        conversation.message(callback_parameters, function(err4, response4) {
                          if (err4) {
                            console.error(err4);
                          } else {
                            console.log("Response4: ",JSON.stringify(response4, null, 2));
                            res.sendByProtocol(response4);
                          } //else
                        }); //conversation.message
*/
        	        } //end else
        	      }.bind({unidades_hash: unidades_hash})); //db.find
		    }); //db.db.geo
		  } //end
              } //else
            }); //db.find
           } else if (response.context.request.api_action == "courses_by_address") {
             var address = [].concat(response.context.request.args.address);
             var course_category = [].concat(response.context.request.args.course_category);
             var modality = [];
             if (response.context.request.args.modality) {
               modality = modality.concat(response.context.request.args.modality);
             }
             var enrollable = response.context.request.args.enrollable;

             var course_id_str = response.context.request.args.course_id;
             var course_id = [];
             if (!Array.isArray(course_id_str)) {
                course_id_str = [parseInt(course_id_str)];
             }
             for (var course_i = 0; course_i < course_id_str.length; course_i++) {
	       var as_int = parseInt(course_id_str[course_i]);
	       if (as_int > 0)
                 course_id.push(parseInt(course_id_str[course_i]));
             }
             console.log("___ course_id = ",course_id);
             console.log("___ resquest.args = ",response.context.request.args);

             var selector2 = {"selector": { "type": { "$eq": "Unidade" },"nome": {"$in": address} }};

             db.find(selector2,function(err2,res2) {
               if (err2) {
                 console.log("Error: ",err2);
               } else {
                 var course_id = [].concat(this.course_id);
                 console.log("___2 course_id = ",this.course_id);
                 //console.log("___ Result: ",res2);
                 if (res2.docs.length > 0) {
                   var unidade_id = res2.docs[0]._id;
                   var selector3;
                   selector3 = {"selector": { "type": { "$eq": "Turma" },"unidade":{"$eq": unidade_id}}};

                   if (course_id.length >0) {
                     selector3.selector.idCurso = {"$in": course_id};
                     console.log("__F Filtro Curso =", course_id);
                   }
                   if (course_category.length >0) {
                     selector3.selector.nivel = {"$in": course_category};
                     console.log("__F Filtro Nivel =", course_category);
                   }
                   if (modality.length > 0) {
                     selector3.selector.modalidade = { "$in": modality };
                     console.log("__F Filtro Modalidade =", modality);
                   }
                   if (enrollable) {
                     var dataInicio = new Date();
                     var dataInicio_unixtime = dataInicio.getTime();
                     selector3.selector.dataInicioPrevista = { "$gt": dataInicio_unixtime };
                   }
                   console.log("___ selector3 = ",selector3);
                   db.find(selector3,function(err3,res3) {
                     if (err3) {
                       console.log("Error: ",err3);
                     } else {
                       console.log("Result2: ",res3);
                       var courses = {};
                       for (var i = 0; i < res3.docs.length; i++) {
                         if (courses[res3.docs[i].titulo]) {
                             //Já existe uma turma deste curso
                           courses[res3.docs[i].titulo].push(res3.docs[i]);
                         } else {
                           courses[res3.docs[i].titulo] = [res3.docs[i]];
                         }
                       }
                       var response_text = "";
                       for (course in courses) {
                         response_text = response_text + "<hr/><strong>"+course+"</strong>:<br/>";
                         for (var m = 0; m < courses[course].length; m++) {
                           var additional_info = []
                           if ((courses[course][m].turno)||(courses[course][m].dataInicioPrevista)) {
                             if (courses[course][m].turno) {
                               additional_info.push(courses[course][m].turno);
                             }
                             if (courses[course][m].dataInicioPrevista) {
                               var dataInicioPrevista = new Date(courses[course][m].dataInicioPrevista);
                               dataInicioPrevista = "início "+dataInicioPrevista.getDate()+'/'+(dataInicioPrevista.getMonth()+1)+'/'+dataInicioPrevista.getFullYear();
                               additional_info.push(dataInicioPrevista);
                             }
                           }
                           additional_info = additional_info.join(", ");
                           if (additional_info.length > 0)
                             additional_info = " ("+additional_info+")";

                           if (res.protocol == "facebook") {
                             response_text = response_text + "• "+courses[course][m]._id+additional_info+"<br/>";
                           } else {
                             response_text = response_text + "• <a onclick=\"ConversationPanel.tapClick('Tenho interesse na turma "+courses[course][m]._id+" do curso "+course+".')\">"+courses[course][m]._id+additional_info+"</a><br/>";
                           }
                         }
                       }
                       var callback_parameters = {};
                       callback_parameters.context = response.context;
                       callback_parameters.context.unidade = address_name;
                       callback_parameters.context.cursos = course_title;

                       callback_parameters.input = {};
  //                       callback_parameters.input.courses = courses;
                       callback_parameters.input.response_text = response_text;
                       callback_parameters.workspace_id = WORKSPACE_ID;
                       callback_parameters.input.api_callback = {"action": "courses_by_address"};

                       console.log("recursively calling callWatsonApi...");
                       if (res3.docs.length > 1) {
                         callback_parameters.input.courseclasses_found = true;
                         response.output.text = response_text;
                         res.sendByProtocol(response);
                       } else {
                         callback_parameters.input.courseclasses_found = false;
                       }
                       req2 = req;
                       req2.body = callback_parameters;
                       callWatsonApi(req2,res);
                     }
                   });
                 } else {
                   //Unidade nao encontrada no banco
                   console.log("Unidade não encontrada no Cloudant:",address_name);
                 }
               }
             }.bind({course_id: course_id}));
           } else if (response.context.request.api_action == "courses_schedule") {
             var address_name = response.context.request.args.address_name;
             var course_title = response.context.request.args.course_title;
             var course_id_str = response.context.request.args.course_id;
             var course_id = [];
             if (!Array.isArray(course_id_str)) {
                course_id_str = [parseInt(course_id_str)];
             }
             for (var course_i = 0; course_i < course_id_str.length; course_i++) {
	       var as_int = parseInt(course_id_str[course_i]);
	       if (as_int > 0)
                 course_id.push(parseInt(course_id_str[course_i]));
             }
             console.log("___ course_id = ",course_id);
             console.log("___ resquest.args = ",response.context.request.args);
             var selector2 = {"selector": { "type": { "$eq": "Unidade" },"nome": {"$eq": address_name} }};

             db.find(selector2,function(err2,res2) {
               if (err2) {
                 console.log("Error: ",err2);
               } else {
                 var course_id = [].concat(this.course_id);
                 console.log("___2 course_id = ",this.course_id);
                 console.log("___ Result: ",res2);
                 if (res2.docs.length > 0) {
                   var unidade_id = res2.docs[0]._id;
                   var selector3;
                   if (course_id.length >0) {
                     //#####
                     selector3 = {"selector": { "type": { "$eq": "Turma" },"unidade":{"$eq": unidade_id},"idCurso": {"$in": course_id} }};
                   } else if (course_title) {
                     selector3 = {"selector": { "type": { "$eq": "Turma" },"unidade":{"$eq": unidade_id},"titulo": {"$eq": course_title} }};
                   } else {
                     selector3 = {"selector": { "type": { "$eq": "Turma" },"unidade":{"$eq": unidade_id}}};
                   }
                   console.log("___ selector3 = ",selector3);
                   db.find(selector3,function(err3,res3) {
                     if (err3) {
                       console.log("Error: ",err3);
                     } else {
                       console.log("Result2: ",res3);
                       var courses = {};
                       for (var i = 0; i < res3.docs.length; i++) {
                         if (courses[res3.docs[i].titulo]) {
                             //Já existe uma turma deste curso
                           courses[res3.docs[i].titulo].push(res3.docs[i]);
                         } else {
                           courses[res3.docs[i].titulo] = [res3.docs[i]];
                         }
                       }
                       var response_text = "";
                       for (course in courses) {
                         response_text = response_text + "<hr/><strong>"+course+"</strong>:<br/>";
                         for (var m = 0; m < courses[course].length; m++) {
                           var additional_info = []
                           if ((courses[course][m].turno)||(courses[course][m].dataInicioPrevista)) {
                             if (courses[course][m].turno) {
                               additional_info.push(courses[course][m].turno);
                             }
                             if (courses[course][m].dataInicioPrevista) {
                               var dataInicioPrevista = new Date(courses[course][m].dataInicioPrevista);
                               dataInicioPrevista = "início "+dataInicioPrevista.getDate()+'/'+(dataInicioPrevista.getMonth()+1)+'/'+dataInicioPrevista.getFullYear();
                               additional_info.push(dataInicioPrevista);
                             }
                           }
                           additional_info = additional_info.join(", ");
                           if (additional_info.length > 0)
                             additional_info = " ("+additional_info+")";

                           if (res.protocol == "facebook") {
                             response_text = response_text + "• "+courses[course][m]._id+additional_info+"<br/>";
                           } else {
                             response_text = response_text + "• <a onclick=\"ConversationPanel.tapClick('Tenho interesse na turma "+courses[course][m]._id+" do curso "+course+".')\">"+courses[course][m]._id+additional_info+"</a><br/>";
                           }
                         }
                       }
                       var callback_parameters = {};
                       callback_parameters.context = response.context;
                       callback_parameters.context.unidade = address_name;
                       callback_parameters.context.cursos = course_title;

                       callback_parameters.input = {};
  //                       callback_parameters.input.courses = courses;
                       callback_parameters.input.response_text = response_text;
                       callback_parameters.workspace_id = WORKSPACE_ID;
                       callback_parameters.input.api_callback = {"action": "courses_schedule"};

                       console.log("recursively calling callWatsonApi...");
                       req2 = req;
                       req2.body = callback_parameters;
                       callWatsonApi(req2,res);
                     }
                   });
                 } else {
                   //Unidade nao encontrada no banco
                   console.log("Unidade não encontrada no Cloudant:",address_name);
                 }
               }
             }.bind({course_id: course_id}));
           } else if (response.context.request.api_action == "courseclass_info") {
            var courseclass = response.context.request.args.courseclass;
            console.log("Trying to find courseclass = ",courseclass);
            db.find({selector:{_id: courseclass} },function (err,result) {
              if (err) {
                console.log("Error: ",err);
              } else {
                var selector = {"selector": {"_id": result.docs[0].unidade}}
                var courseclass = result.docs[0];
                db.find(selector,function (err,result) {
                  if (err) {
                    console.log("Error: ",err);
                  } else {
                    courseclass.unidade = result.docs[0];
                    var callback_parameters = {};
                    callback_parameters.context = response.context;
                    callback_parameters.input = {};
                    callback_parameters.workspace_id = WORKSPACE_ID;
                    callback_parameters.input.api_callback = {"action": "courseclass_info"};
                    if ((result.docs) && (result.docs.length > 0)) {
                      callback_parameters.input.courseclass = courseclass;
                    }

                    console.log("recursively calling callWatsonApi...");
                    req2 = req;
                    req2.body = callback_parameters;
                    callWatsonApi(req2,res);
	            /*
                    conversation.message(callback_parameters, function(err2, response2) {
                      if (err2) {
                        console.error(err2);
                      } else {
                        console.log(JSON.stringify(response2, null, 2));
                        res.sendByProtocol(response2);
                      } //else
                    }); //conversation.message
		    */
                  }
                });
              }
            });
           } else if (response.context.request.api_action == "address_contact_info") {
            var address_name = response.context.request.args.address_name;
            var address_id = response.context.request.args.address_id;
            var selector = {};
            if ((address_name)&&(address_id)) {
              selector = {"selector": {"$or": [{"nome": address_name},{"_id": address_id}]}}
            } else if (address_name) {
              selector = {"selector": {"nome": address_name}}
            } else if (address_id) {
              selector = {"selector": {"_id": address_id}}
            } else {
              console.log("API Call for 'address_contact_info' missing parameters");
              return false;
            }
            db.find(selector,function (err,result) {
              if (err) {
                console.log("Error: ",err);
              } else {
                      var callback_parameters = {};
                      callback_parameters.context = response.context;
                      callback_parameters.input = {};
                      callback_parameters.workspace_id = WORKSPACE_ID;
                      callback_parameters.input.api_callback = {"action": "address_contact_info"};
                      callback_parameters.input.address = {
                          nome: result.docs[0].nome,
                          endereco: result.docs[0].endereco,
                          descricao: result.docs[0].descricao,
                          telefone: result.docs[0].telefone,
                          email: result.docs[0].email,
                          municipio: result.docs[0].municipio,
                          horarioFuncionamento: result.docs[0].horarioFuncionamento
                      }
                      console.log("recursively calling callWatsonApi...");
                      req2 = req;
                      req2.body = callback_parameters;
                      callWatsonApi(req2,res);
		      /*
                      conversation.message(callback_parameters, function(err2, response2) {
                        if (err2) {
                          console.error("Error: ",err2);
                        } else {
                          console.log("Respondendo:",JSON.stringify(response2, null, 2));
                          res.sendByProtocol(response2);
                        } //else
                      }); //conversation.message
		      */
              }
            });
           }
         } else {
           console.log(JSON.stringify(response, null, 2));
           var text;
           if (Array.isArray(response.output.text)) {
             text = response.output.text.join(' ');
           } else {
             text = response.output.text;
           }
           response.output.text = processTags(text);
           console.log("====================== DEPOIS ================");
           console.log(JSON.stringify(response, null, 2));
//             res.send(processTags(response));
           res.sendByProtocol(response);
         }
       }
    });
}
