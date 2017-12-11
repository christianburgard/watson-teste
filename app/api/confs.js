// configurações iniciais para usar o conversation
// movidos de ./init para ser usado em outros lugares;

const fs = require('fs');
const path=require('path');

// const WORKSPACE_ID = process.env.WORKSPACE_ID ? process.env.WORKSPACE_ID : '2de227ee-be8e-4db0-93e6-faac10f15f60'; Le le
const WORKSPACE_ID = process.env.WORKSPACE_ID ? process.env.WORKSPACE_ID : 'f33f946d-0ffc-445c-9792-25cff45e21ac'; // remyx samba
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN ? process.env.PAGE_ACCESS_TOKEN : 'EAAEDrYzsZCxMBALp0o1KXaZC2ibT63FLBn7uRlaoqhIhxrtYJK5krJjZBfDaIzIH9ZCkCqAT9xvAmxJYMZA2LVCFGqA12kvH5Y1bSueVgSfK084wSmGF4cxEI3Quz9NCO4PkKZCCk8VRmxnQvwNEfPAqIbo7xW1NfSXnSsXXKxCgZDZD';

//const WORKSPACE_ID = '1a520d31-a3c8-436f-9fa7-8ed3d99149c0';   //Dev
//const WORKSPACE_ID = '37434092-a3b2-4531-bbb9-b46f29a9a605';   //Teste

//const WORKSPACE_ID = '0275fa87-dafa-41ea-8350-ad037e2aca09';    //Teste

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

let conversationCredentials = {};
if(process.env.VCAP_SERVICES) {
    conversationCredentials = getConversationCredentials(process.env.VCAP_SERVICES);
} else { //When running locally, the VCAP_SERVICES will not be set
    conversationCredentials = getConversationCredentials(fs.readFileSync(path.join(__dirname,'../../', "vcap-local.json"), "utf-8"));
}
const ConversationV1 = require('watson-developer-cloud/conversation/v1');

const objConversationDefault={
    username: conversationCredentials.username,
    password: conversationCredentials.password,
    version_date: ConversationV1.VERSION_DATE_2017_05_26
}

module.exports={ConversationV1,conversationCredentials,WORKSPACE_ID,objConversationDefault}