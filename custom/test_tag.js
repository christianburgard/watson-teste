#!/usr/bin/nodejs

//var text_input = "oi tudo bem? <! defined?(variavel|Aham|Nem) !>";
//var text_input = "oi, <! print(tudo| |bem) !>? <! defined?(variavel|Aham|Nem) !>.";
var text_input = "<! defined?(|turma existe|turma não existe) !>";
//var text_input = "oi vou contar um dois tres quatro e terminar com ponto final.";
console.log("==================== INPUT =====================");
console.log("text_input =",text_input);
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

var text_output = processTags(text_input);
console.log("==================== OUTPUT =====================");
console.log("text_output =",text_output);
