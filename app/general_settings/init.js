/*
Na DB general_settings teremos diversos "parameters"
aqui temos o indice (esses registros na general_settings serão sempre acompanhados da propriedade type:"parameter")
os valores abaixo constarão na prop "name"

welcome-msg - mensagem de boas vindas
certainty-degree - grau de certeza do conversation
timeout - timeout p/ encerramento da conversa
timeout2 - timeout pós aviso de encerramento
bot-name - nome do chatbot
idle-msg - mensagem de aviso de inatividade
idle-final-msg - mensagem final, quando a conversa for encerrado por conta de timeout
*/

const passport = require('passport');
const db = new(require('../../db'))();
db.init('general_settings');


function run(generator) {
    const it=generator(done);

    function done(promise) {
        if(promise instanceof Promise) {
            return promise.then(ret=>it.next(ret),err=>it.throw(err));
        }
        it.next();
    }
    done();
}

/**
 * Busca confs
 * @param {name:'array de strings'}
 */
const getSetting=({name}={})=>{
    if(!name) {
        return Promise.reject({error:'Parameter "name" is required!'});
    }
    if(typeof name == 'string') {
        name=[name];
    }
    const selector={
        selector:{type:'parameter',name:{
            $in:name
        }}
    }

    return new Promise((res,rej)=>{
        return db.find(selector,function(err,results) {
            if(err) {
                return rej(err);
            }
            if(results && results.docs && results.docs.length) {
                return res(results.docs);
            }
            return res(false);
        });
    });
}

const saveSetting=({setting,params}={})=>{
    const {name}=params;
    return new Promise((res,rej)=>{
        return run(function*(done){
            try {
                let doc=yield done(getSetting({name}));
                if(doc === false) {
                    // ainda não existe essa conf
                    doc={
                        type:'parameter'
                    }
                } else {
                    doc=doc[0];
                }
                doc=Object.assign(doc,setting);

                return db.insert(doc,function(err) {
                    if(err) {
                        return rej(err);
                    }
                    
                    return res({ok:true});
                });
            } catch(e) {
                return rej(e);
            }
        });
    });
}


const initGeneralSettings=(app)=>{

    // carrega as confs do chatbot
    app.get('/general_settings/chatbot_confs',passport.authenticationMiddleware(),function(req,res) {
        const name=['welcome-msg','certainty-degree','timeout','timeout2','bot-name','idle-msg','idle-final-msg'];

        return getSetting({name})
            .then(ret=>{

                return res.json(ret);
            })
            .catch(err=>{
                const error={
                    error:'Houve um erro!',
                    errNative:err
                }
                return res.status(500).json(error);
            });
    });

    // salva confs do chatbot
    app.post('/general_settings/chatbot_confs',passport.authenticationMiddleware(),function(req,res) {
        let setting=req.body.setting;
        const {name,value}=setting;
        setting={
            name,
            value
        }

        return saveSetting({setting,params:{name}})
            .then(ret=>{

                return res.json(ret);
            })
            .catch(err=>{

                return res.status(500).json(err);
            });

    });


} // initGeneralSettings


module.exports={getSetting,saveSetting,initGeneralSettings}