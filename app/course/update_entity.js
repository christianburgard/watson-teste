const crypto=require('crypto');
const {ConversationV1,conversationCredentials,WORKSPACE_ID,objConversationDefault}=require('../../app/api/confs');

const conversation=new ConversationV1(objConversationDefault);

/**
 * 1ª versão onde pegamos a entity do conversation e comparamos com a entity criada a partir do webservice;
 * recebemos do exportador um obj com uma prop "values", lá tem o que interessa;  
 */
/* function compareObj(obj1,obj2) {
    let values1=obj1.values;
    let values2=obj2.values;

    let map1=(elem)=>{
        return {
            value:elem.value+'',
            synonyms:elem.synonyms
        }
    }


    let array1=values1.map(map1);
    let array2=values2.map(map1);


    const md5_1=crypto.createHash('md5').update(JSON.stringify(array1)).digest('hex');
    const md5_2=crypto.createHash('md5').update(JSON.stringify(array2)).digest('hex'); // webservice
    // md5_1: 0a89eaec9eb4adc1b714ff222a705c4e
    // md5_2: 6c87b227f014bc698fcaa57c662ffe11
    if(md5_1 == md5_2) {
        return true;
    }
    return false;
} // comparteOjb

// essa func não é mais necessário p/
function getEntity(params) {
    if(!params) {
        params={
            workspace_id: WORKSPACE_ID,
            entity:'cursos',
            export:true
        }
    }
    return new Promise((res,rej)=>{
        return conversation.getEntity(params, function(err, response) {
            if (err && err.code!=404) {
                console.error('GET ENTITY!!',err);
                return rej(err);
            }
                console.log('########### GET ENTITY!! #########');
                return res(response);
        });
    });
} // getEntity


*/


function run(generator) {
    const it=generator(done);
    function done(promise) {
        if(promise instanceof Promise) {
            return promise.then(ret=>it.next(ret),err=>it.throw(err));
        }
        return it.next();
    }

    done();
}



/**
 * versão oficial: apenas geramos md5 da entity criada a partir do webservice e guardamos em bd;
 * em toda execução apenas a alteração da entity do webservice será comparada;
 */
function compareObj(obj1) {
    let values1=obj1.values;

    const db=require('../../db')();
    db.init('general_settings');
    const getMd5Courses=()=>{
        return new Promise((res,ret)=>{
            return db.find({selector:{
                type:'parameter',
                name:'hashes'
            }},function(err,results) {
                if(err) {
                    return rej({error:err})
                }
                if(results && results.docs && results.docs.length) {
                    return res(results.docs[0]);
                } else {
                    return res({type:'parameter',name:'hashes',entityCoursesMD5:''});
                };
            });
        });
    }

    const saveMd5Courses=(obj)=>{
        
        return ()=>{
            return new Promise((res,rej)=>{
                return db.insert(obj,function(err,result) {
                    if(err) {
                        return rej(err);
                    }
                    return res({ok:true,result});
                });
            });
        }
    } // saveMd5Courses


    let array1=values1.map((elem)=>{
        return {
            value:elem.value+'',
            synonyms:elem.synonyms
        }
    });
    const md5_1=crypto.createHash('md5').update(JSON.stringify(array1)).digest('hex');


    return new Promise((res,rej)=>{

        return run(function*(done) {
            try {
                const fromDb=yield done(getMd5Courses());
                if(!fromDb) {
                    return rej({error:'Houve um erro indefinido!'});
                }
                const md5Db=fromDb.entityCoursesMD5;
                if(md5Db == md5_1) {
                    return res({recreate:false});
                }
                fromDb.entityCoursesMD5=md5_1;
                return res({recreate:true,saveMd5:saveMd5Courses(fromDb)});

            } catch(e) {
                return rej({error:e.message,errNative:e});
            }
        });
    });
} // compareObj





function deleteEntity(params) {
    if(!params) params={}
    const entity=params.entity || 'cursos';
    const params2 = {
        workspace_id: WORKSPACE_ID,
        entity: entity
    };
    
    return new Promise((res,rej)=>{
        return conversation.deleteEntity(params2, function(err, response) {
            if (err && err.code!=404) {
                console.error('DELETE ENTITY!!',err);
                return rej(err);
            }
                console.log('########### ENTITY DELETED!! #########');
                return res(response);
        });
    });
} // deleteEntity

function createEntity() {
    if(!params) params={}
    const entity=params.entity || 'cursos';
    const params2 = {
        workspace_id: WORKSPACE_ID,
        entity: entity
    };

    return new Promise((res,rej)=>{
        console.log('########### CREATING ENTITY!! #########');                
        return conversation.createEntity(entity, function(err, response) {
            if (err) {
                console.error(err);
                return rej({error:err});
            }

            response.totalSynonyms=totalSynonyms;
            return res({ok:true,response,alteracao:1});
        });
    });
}


// (@cursos)
function recreateEntity(params) {

    const deletenRecreate=(params)=>{
        if(!params) params={}
        const {entity,totalSynonyms}=params;
        return deleteEntity()
        .then(ret=>{
            return new Promise((res,rej)=>{
                console.log('########### RECREATING ENTITY!! #########');                
                return conversation.createEntity(entity, function(err, response) {
                    if (err) {
                        console.error(err);
                        return rej({error:err});
                    }

                    response.totalSynonyms=totalSynonyms;
                    return res({ok:true,response,alteracao:1});
                });
            });
        },err=>{
            console.error('############## ERRO AO DELETAR ENTITY!! ################');
            console.error(err);
            throw {error:err};
        });
    } // deletenRecreate

    const cursos=params.cursos; // array de obj's de cursos, oriundo de syncCourses.js
    let values=[];
    let objUpdEntity;
    values=cursos.map(elem=>{
        objUpdEntity={
            value:elem._id,
            titulo:elem.titulo,
            synonyms:elem.sinonimos
        }
        return createEntityObj(objUpdEntity);
    });


    let totalSynonyms=0;
    values.forEach(elem=>{
        return totalSynonyms+=elem.synonyms.length;
    });

    const entityName='cursos';
    const entity={
        workspace_id:WORKSPACE_ID,
        entity:entityName,
        values:values
    }

    return new Promise((res,rej)=>{
        return run(function*(done){
            try {

                const compare=yield done(compareObj(entity));
                if(!compare.recreate) {
                    return res({ok:true,response:{totalSynonyms},alteracao:0});
                }
                const saveMd5=compare.saveMd5;
                
                const recreate=yield done(deletenRecreate({entity,totalSynonyms}));
                // se chegou até aqui, recriou @cursos com sucesso
                yield done(saveMd5());
                return res({ok:true,response:{totalSynonyms},alteracao:1});
            } catch(e) {
                return rej(e);
            }
        });
    });

    // return Promise.resolve({ok:true,msg:'TESTANDO...',response:{totalSynonyms}});


} // recreateEntity (@cursos)


// @cursos
// cria UM objeto Entity p/ ser salvo (com mock de synonyms!)
function createEntityObj(params) {

    if(!params) params={}
    let value=params.value+'' || '';
    value=value.replace(/[\D]/g,'');
    let titulo=params.titulo || '';
    titulo=titulo.replace(/[\t]/g,' ').toLowerCase();
    const synonyms=params.synonyms || [];

    let synonyms2=[];

    if(synonyms === -1) {
        const arrMock=['Lorem ipsum',
        'dolor sit amet',
        'consectetur adipiscing elit',
        'sed do eiusmod',
        'empor incididunt ut labore',
        'et dolore magna aliqua',
        'Ut enim ad minim',
        'veniam',
        'quis nostrud',
        'exercitation ullamco laboris',
        'nisi ut aliquip ex ea',
        'commodo consequat. Duis aute',
        'irure dolor in reprehenderit',
        'in voluptate velit esse'];
        const nums=' 1234567890';
        synonyms2=arrMock.map(elem=>{
            elem=elem.toUpperCase();
            let text='SUPER HIPER CURSO DE '+titulo+elem+nums;
            return text.substr(-64);
        });
    } else {
        synonyms2=synonyms.map(elem=>{
            if(elem.indexOf('mestre de obra')>-1) {
                var oi=1;
            }
            return elem.substr(-64).toLowerCase();
        });
        synonyms2.unshift(titulo.substr(-64));
        synonyms2 = Array.from(new Set(synonyms2));
    }

    const entityObj = {
        value:value,
        synonyms: synonyms2,
        type:'synonyms'
    };
    return entityObj;
} // createEntityObj


module.exports={recreateEntity}