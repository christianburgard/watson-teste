const {ConversationV1,conversationCredentials,WORKSPACE_ID,objConversationDefault}=require('../../app/api/confs');

const conversation=new ConversationV1(objConversationDefault);


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

function recreateEntity(params) {

    const cursos=params.cursos; // array de obj's de cursos, oriundo de syncCourses.js
    let values=[];
    let objUpdEntity;
    values=cursos.map(elem=>{
        objUpdEntity={
            value:elem._id,
            titulo:elem.titulo,
            synonyms:-1
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

    return deleteEntity()
        .then(ret=>{
            return new Promise((res,rej)=>{
                return conversation.createEntity(entity, function(err, response) {
                    if (err) {
                        if(err.error!='Rate limit exceeded')
                            console.error(err);

                        return rej({error:err});
                    }

                    response.totalSynonyms=totalSynonyms;
                    return res({ok:true,response});
                });
            });
        },err=>{
            console.error('############## ERRO AO DELETAR ENTITY!! ################');
            console.error(err);
            throw {error:err};
        });
} // recreateEntity


// cria UM objeto Entity p/ ser salvo (com mock de synonyms!)
function createEntityObj(params) {

    if(!params) params={}
    let value=params.value+'' || '';
    value=value.replace(/[\D]/g,'');
    let titulo=params.titulo || '';
    titulo=titulo.replace(/[\t]/g,' ');
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
            return elem.substr(-64);
        });
    }

    const entityObj = {
        value:value,
        synonyms: synonyms2,
        type:'synonyms'
    };
    return entityObj;
} // createEntityObj


module.exports={recreateEntity}