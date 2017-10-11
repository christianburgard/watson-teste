const passport = require('passport');
const routes = require('../../routes/chat');

//DATABASE
//**************** DB ********************//

var db = new(require('../../db'))();
db.init('data');

/******************************************/

function initChat(app) {
    app.get('/pages/chat',  routes.chat);
}

module.exports = initChat
