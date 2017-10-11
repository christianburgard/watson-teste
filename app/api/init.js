const passport = require('passport');
const routes = require('../../routes');
const http = require('http');
const geolib = require('geolib');
const WORKSPACE_ID = process.env.WORKSPACE_ID ? process.env.WORKSPACE_ID : '1a520d31-a3c8-436f-9fa7-8ed3d99149c0';

//const WORKSPACE_ID = '1a520d31-a3c8-436f-9fa7-8ed3d99149c0';   //Dev
//const WORKSPACE_ID = '37434092-a3b2-4531-bbb9-b46f29a9a605';   //Teste

//const WORKSPACE_ID = '0275fa87-dafa-41ea-8350-ad037e2aca09';    //Teste
//DATABASE
//**************** DB ********************//

var db = new(require('../../db'))();
db.init('data');

/******************************************/


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
          text_output += method_args[2]
        break;
  
      case "print":
          text_output += method_args.join("");
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


function initApi (app) {
  app.get('/api/near_addresses_by_city', function(req, res) {
    var city_name = req.query.city_name;
    db.find({selector:{name: city_name} },function (err,result) {
      if (err) {
        console.log("Error: ",err);
      } else {
        console.log('Found %d cities with Name=%s', result.docs.length,city_name);
        for (var i = 0; i < result.docs.length; i++) {
          console.log('  Doc id: %s | Name: %s', result.docs[i]._id,result.docs[i].name);
	    db.db.geo("address","address_points",{q: "type:'Unidade'",g:"POINT("+result.docs[i].geometry.coordinates[0]+" "+result.docs[i].geometry.coordinates[1]+")",nearest: true,include_docs: true,limit: 3}, function (err, result) {
	      if (err) {
		console.log("Error: ",err);
	      } else {
		console.log("Nearest were: ",result);
                res.send(result.rows);
	      }
	    });

        }
      }
    });
    //res.redirect("/");
  });
  app.post('/api/message', function(req, res) {
    var fs = require('fs');
    var conversationCredentials = {};
    if (process.env.VCAP_SERVICES) {
      conversationCredentials = getConversationCredentials(process.env.VCAP_SERVICES);
    } else { //When running locally, the VCAP_SERVICES will not be set
      conversationCredentials = getConversationCredentials(fs.readFileSync("vcap-local.json", "utf-8"));
    }
    var ConversationV1 = require('watson-developer-cloud/conversation/v1');
    var conversation = new ConversationV1({
      username: conversationCredentials.username,
      password: conversationCredentials.password,
      version_date: ConversationV1.VERSION_DATE_2017_05_26
    });
    merged_parameters = req.body;
    merged_parameters.workspace_id = WORKSPACE_ID;

    conversation.message(merged_parameters, function(err, response) {
         if (err) {
           console.error(err);
         } else {

           if ((response.context)&&(response.context.request)) {
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
          	     db.db.geo("address","address_points",{q: "type:'Unidade'",g:"POINT("+result.docs[i].geometry.coordinates[0]+" "+result.docs[i].geometry.coordinates[1]+")",nearest: true,include_docs: true,limit:20}, function (err2, result2) {
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

                       conversation.message(callback_parameters, function(err2, response2) {
                         if (err2) {
                           console.error("Error: ",err2);
                         } else {
                           console.log("Respondendo:",JSON.stringify(response2, null, 2));
                           res.send(response2);
                         } //else
                       }); //conversation.message
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
          	    db.db.geo("address","address_points",{q: "type:'Unidade'",g:"POINT("+result.docs[i].geometry.coordinates[0]+" "+result.docs[i].geometry.coordinates[1]+")",nearest: true,include_docs: true,limit:20}, function (err2, result2) {
                      var unidades_hash = {};
          	      if (err2) {
          		console.log("Error: ",err2);
          	      } else {
                        var unidades = [];
          		console.log("Nearest were: ",result2);
                        for (var j = 0; j < result2.rows.length; j++) {
                          unidades.push(""+result2.rows[j].id);
                          unidades_hash[result2.rows[j].id] = result2.rows[j].doc.nome;
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
                          for (address in near_addresses_with_courses) {
                            response_text = response_text + "<hr/><strong><a onclick=\"ConversationPanel.tapClick('Tenho interesse nos cursos da unidade "+address+".')\">" + address + "</strong>:<br/>";
                            for (var m = 0; m < near_addresses_with_courses[address].length; m++) {
                            response_text = response_text + "• <a onclick=\"ConversationPanel.tapClick('Tenho interesse no curso de "+near_addresses_with_courses[address][m].toLowerCase()+" da unidade "+address+"')\">"+near_addresses_with_courses[address][m].toLowerCase()  + "</a><br/>";
                            }
                          }

                          var callback_parameters = {};
                          callback_parameters.workspace_id = WORKSPACE_ID;
                          callback_parameters.context = response.context;
                          callback_parameters.input = {};
//                          callback_parameters.input.turmas = turmas;
                          callback_parameters.input.response_text = response_text;
//                          callback_parameters.input.near_addresses_with_courses = near_addresses_with_courses;
                          callback_parameters.input.api_callback = {"action": "near_courses_by_city"};

                          console.log("Callback parameters: ",callback_parameters);
  
                          conversation.message(callback_parameters, function(err4, response4) {
                            if (err4) {
                              console.error(err4);
                            } else {
                              console.log("Response4: ",JSON.stringify(response4, null, 2));
                              res.send(response4);
                            } //else
                          }); //conversation.message
          	        } //end else
          	      }.bind({unidades_hash: unidades_hash})); //db.find
		    }); //db.db.geo
		  } //end
                } //else
              }); //db.find
             } else if (response.context.request.api_action == "courses_schedule") {
               var address_name = response.context.request.args.address_name;
               var course_title = response.context.request.args.course_title;
               var selector2 = {"selector": { "type": { "$eq": "Unidade" },"nome": {"$eq": address_name} }};
               db.find(selector2,function(err2,res2) {
                 if (err2) {
                   console.log("Error: ",err2);
                 } else {
                   console.log("Result: ",res2);
                   var unidade_id = res2.docs[0]._id;
                   var selector3;
                   if (course_title) {
                     selector3 = {"selector": { "type": { "$eq": "Turma" },"unidade":{"$eq": unidade_id},"titulo": {"$eq": course_title} }};
                   } else {
                     selector3 = {"selector": { "type": { "$eq": "Turma" },"unidade":{"$eq": unidade_id}}};
                   }
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
                           if (!courses[course][m].turno)
                             courses[course][m].turno = "NÃO INFORMADO"
                           response_text = response_text + "• <a onclick=\"ConversationPanel.tapClick('Tenho interesse na turma "+courses[course][m]._id+" do curso "+course+".')\">"+courses[course][m]._id+" (turno: "+ courses[course][m].turno +")</a><br/>";
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

                       conversation.message(callback_parameters, function(err4, res4) {
                         if (err4) {
                           console.error(err4);
                         } else {
                           console.log(JSON.stringify(res4, null, 3));
                           res.send(res4);
                         } //else
                       }); //conversation.message
                     }
                   });
                 }
               });
             } else if (response.context.request.api_action == "courseclass_info") {
              var courseclass = response.context.request.args.courseclass;
              console.log("Trying to find courseclass = ",courseclass);
              db.find({selector:{_id: courseclass} },function (err,result) {
                if (err) {
                  console.log("Error: ",err);
                } else {
                  var callback_parameters = {};
                    callback_parameters.context = response.context;
                    callback_parameters.input = {};
                    callback_parameters.workspace_id = WORKSPACE_ID;
                    callback_parameters.input.api_callback = {"action": "courseclass_info"};
                    if ((result.docs) && (result.docs.length > 0)) {
                      callback_parameters.input.courseclass = result.docs[0];
                    }
                    conversation.message(callback_parameters, function(err2, response2) {
                    if (err2) {
                      console.error(err2);
                    } else {
                      console.log(JSON.stringify(response2, null, 2));
                      res.send(response2);
                    } //else
                  }); //conversation.message
                }
              });
             } else if (response.context.request.api_action == "address_contact_info") {
              var address_name = response.context.request.args.address_name;
              console.log("Trying to find nome = ",address_name);
              db.find({selector:{nome: address_name} },function (err,result) {
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
                            horarioFuncionamento: result.docs[0].horarioFuncionamento
                        }
                        conversation.message(callback_parameters, function(err2, response2) {
                          if (err2) {
                            console.error("Error: ",err2);
                          } else {
                            console.log("Respondendo:",JSON.stringify(response2, null, 2));
                            res.send(response2);
                          } //else
                        }); //conversation.message
                }
              });
             }
           } else {
             console.log(JSON.stringify(response, null, 2));
             response.output.text = processTags(response.output.text[0]);
             console.log("====================== DEPOIS ================");
             console.log(JSON.stringify(response, null, 2));
//             res.send(processTags(response));
             res.send(response);
           }
         }
      });
   });
}

module.exports = initApi
