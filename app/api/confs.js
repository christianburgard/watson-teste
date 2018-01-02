// configurações iniciais para usar o conversation
// movidos de ./init para ser usado em outros lugares;

const fs = require('fs');
const path=require('path');

// const WORKSPACE_ID = process.env.WORKSPACE_ID ? process.env.WORKSPACE_ID : '1c062b99-a9b0-482e-90b2-850cd706342c'; // dev
// const WORKSPACE_ID = process.env.WORKSPACE_ID ? process.env.WORKSPACE_ID : '2de227ee-be8e-4db0-93e6-faac10f15f60'; Le le

const WORKSPACE_ID = process.env.WORKSPACE_ID ? process.env.WORKSPACE_ID : '5f155f68-181d-4d59-9ba9-225594c67524'; // remyx samba - DEV 02/01/18
// const WORKSPACE_ID = process.env.WORKSPACE_ID ? process.env.WORKSPACE_ID : 'b44b6d56-6096-478f-868b-964686a87999'; // teste

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN ? process.env.PAGE_ACCESS_TOKEN : 'EAAEDrYzsZCxMBALp0o1KXaZC2ibT63FLBn7uRlaoqhIhxrtYJK5krJjZBfDaIzIH9ZCkCqAT9xvAmxJYMZA2LVCFGqA12kvH5Y1bSueVgSfK084wSmGF4cxEI3Quz9NCO4PkKZCCk8VRmxnQvwNEfPAqIbo7xW1NfSXnSsXXKxCgZDZD';

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

module.exports={ConversationV1,conversationCredentials,WORKSPACE_ID,PAGE_ACCESS_TOKEN,objConversationDefault}
