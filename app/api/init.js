const passport = require('passport');
const routes = require('../../routes');
const request = require('request');
const geolib = require('geolib');



//DATABASE
//**************** DB ********************//
var db = new(require('../../db'))();
db.init('data');
var db_chatlog = new(require('../../db'))();
db_chatlog.init('chatlog');

/******************************************/
var ongoingFBChats = {}; // Hash: key=facebook_user_id, value=attributes Hash
var keepaliveTimers = {}; // Hash: key=conversation_id, value=setTimeout pointer reference



const {ConversationV1,conversationCredentials,WORKSPACE_ID}=require('./confs');

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
function initApi (app) {
  app.post('/api/facebook_webhook', function(req, res) {
    var data = req.body;

    if (data.object === 'page') {
      // Iterate over each entry - there may be multiple if batched
      data.entry.forEach(function(entry) {
        var pageID = entry.id;
        var timeOfEvent = entry.time;
  
        // Iterate over each messaging event
        entry.messaging.forEach(function(event) {
          if (event.message) {
            receivedMessage(event);
          } else {
            console.log("Webhook received unknown event: ", event);
          }
        });
      });
  
      // Assume all went well.
      //
      // You must send back a 200, within 20 seconds, to let us know
      // you've successfully received the callback. Otherwise, the request
      // will time out and we will keep trying to resend.
      res.sendStatus(200);
    } else {
      console.error("Failed validation. Make sure the validation tokens match.");
      res.sendStatus(403);          
    }
  });
  app.get('/api/message', function(req, res) {
    console.log("query = ",req.query);
    if (req.query['hub.mode'] === 'subscribe' &&
        req.query['hub.verify_token'] === 'carneirinhosdonortenaoandamnaneve') {
      console.log("Validating webhook");
      res.status(200).send(req.query['hub.challenge']);
    } else if (req.query['chatlog']) {
      console.log("Pedido de histórico via /api/message?chatlog");
      console.log("session.conversation_id = ",req.session.conversation_id);
      if (req.session.conversation_id) {
        var conversation_id = req.session.conversation_id;
        db_chatlog.find({selector:{_id: conversation_id} },function (err,result) {
          if (err) {
            console.log("Error: ",err);
          } else {
            var conversation_log = {};
  
            if (result.docs.length > 0) {
              console.log("Conversation_id",conversation_id,"encontrado");
              conversation_log = result.docs[0];
              console.log("Conversation_log =",conversation_log);
              var history_payloads = [];
              for (var i=0; i < conversation_log.messages.length; i++) {
                history_payloads.push({"message":conversation_log.messages[i].input.text,"from":"user"});
                history_payloads.push({"message":conversation_log.messages[i].output.text,"from":"watson"});
              }
              console.log(history_payloads);
              res.status(200).send(history_payloads);
            } else {
              console.log("Conversation_id",conversation_id,"nao encontrado");
            }
          }
        });
      } else {
        res.status(200).send([]);
      }
    } else {
      console.error("Failed validation. Make sure the validation tokens match.");
      res.sendStatus(403);          
    }  
  });
  app.post('/api/message', function(req, res) {
    
    res.sendByProtocol = function(body) {
      if (this.protocol == "ajax") {
        if (Array.isArray(body.output.text)) {
          body.output.text = body.output.text.join();
        }
        this.send(body);
      } else if (this.protocol == "facebook") {
    //    this.sendStatus(200);
        var texts;
        if (Array.isArray(body.output.text)) {
          texts = body.output.text.join();
        } else {
          texts = body.output.text;
        }
        //facebookreplace

        //substitui <br> com \r\n
        texts = texts.replace(/\<br\/\>/g,"\r\n");
        texts = texts.replace(/\<br \/\>/g,"\r\n");
        texts = texts.replace(/\<br\>/g,"\r\n");

        //substitui negritos
        texts = texts.replace(/\<b\>/g,"*");
        texts = texts.replace(/\<\/b\>/g,"*");
        texts = texts.replace(/\<strong\>/g,"*");
        texts = texts.replace(/\<\/strong\>/g,"*");


        if (texts.length >= 640) {
          texts = splitWithFullWords(texts,640);
        }
        texts = [].concat(texts);

        var delay = 1000;

        for (var f=0;f<texts.length;f++) {
          var text = texts[f];

          var anchorRegex = /<a[\s]+([^>]+)>((?:.(?!\<\/a\>))*.)<\/a>/g;

          var buttons = [];

          while ((matches = anchorRegex.exec(text)) !== null) {
            console.log("Matched text:",matches[0]);
            console.log("HTML Options:",matches[1]);
            var optionsRegex = /(\w+)=([^\s]+)/g;
            while ((optionMatches = optionsRegex.exec(matches[1])) !== null) {
              console.log("Key",optionMatches[1]," has value",optionMatches[2]);
              if (optionMatches[1] == 'href') {
                var url = optionMatches[2];
                url = url.replace(/\\"/g, '"');
                url = url.replace(/\\'/g, "'");
                url = url.replace(/"/g, '');
                url = url.replace(/'/g, '');

                buttons.push({
                  "type": "web_url",
                  "url": url,
                  "title": matches[2],
                });
              }
            }
            console.log("Link Text   :",matches[2]);
          }
          console.log(buttons);
          
          var messageData;
          if (buttons.length > 0) {
              messageData = {
              recipient: {
                id: body.context.facebook_user_id
              },
              message:{
               attachment:{
                 type:"template",
                 payload:{
                   template_type:"generic",
                   elements:[
                     {
                       title: text
                     ,
                       buttons:buttons
                     }
                   ]
                 }
               }
              }
            };
          } else {
            messageData = {
              recipient: {
                id: body.context.facebook_user_id
              },
              message: {
                text: text
              }
            };
          }
  //        console.log("Responding as a facebook message reply sender =",body.context.facebook_user_id," and message=",body.output.text);
  //        console.log("Dumping facebook_reply:",messageData);
  //      TODO: notificacao "Lis está digitando"
          //setTimeout(callSendAPI,delay*f,messageData);
        }
      }
    };
    var data = req.body;

    if (data.object === 'page') {
      res.protocol = "facebook";
      // Iterate over each entry - there may be multiple if batched
      data.entry.forEach(function(entry) {
        var pageID = entry.id;
        var timeOfEvent = entry.time;
  
        // Iterate over each messaging event
        entry.messaging.forEach(function(event) {
          if (event.message) {
            req.body = {};
            req.body.input = {text: event.message.text};
            req.body.context = {};
            req.body.context.facebook_user_id = event.sender.id;
//            receivedMessage(event);
            console.log("Calling callWatsonApi() by a facebook message from user_id=",event.sender.id);
            callWatsonApi(req, res);
          } else {
            console.log("Webhook received unknown event: ", event);
//            return res.sendStatus(200);
          }
        },this);
      },this);
  
      // Assume all went well.
      //
      // You must send back a 200, within 20 seconds, to let us know
      // you've successfully received the callback. Otherwise, the request
      // will time out and we will keep trying to resend.
      res.sendStatus(200);
    } else if (data.object == null) {
      res.protocol = "ajax";
      console.log("Calling callWatsonApi(req, res) from ajax request");

      return callWatsonApi(req, res);
    } else {
      console.error("Failed validation. Make sure the validation tokens match.");
      res.sendStatus(403);
    }
  });
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
           }
           console.log("_@_ response.context.conversation_id =",conversation_id);
           console.log("_@_ AFTER req.session.conversation_id =",conversation_id);
           db_chatlog.find({selector:{_id: conversation_id} },function (err,result) {
             if (err) {
               console.log("Error: ",err);
             } else {
               var conversation_log = {};

               if (result.docs.length > 0) {
                 conversation_log = result.docs[0];
                 console.log(result.docs[0]);
                 conversation_log._rev = conversation_log._rev;
               }

               if (!conversation_log.messages) {
                 conversation_log.messages = [];
               }

               conversation_log.messages.push(response);
               console.log("_@_ Inserindo",conversation_log);
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
           // Query usada até 2017-12-07 e mantida por motivo de retrocompatibilidade
           // Poderá ser excluída assim que os fluxos antigos que a usam forem desativados

           if (response.context.request.api_action == "near_addresses_by_city") {
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
module.exports = initApi

