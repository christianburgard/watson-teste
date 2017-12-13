const {ConversationV1,conversationCredentials,WORKSPACE_ID,objConversationDefault}=require('../app/api/confs');

const conversation=new ConversationV1(objConversationDefault);


function updateEntity(params) {

    if(!params) params={}
    const entity=params.entity || 'cursos';
    const value=params.value+'' || '';
    const synonyms=params.synonyms || [];

    const synonyms2=synonyms.map(elem=>{
        return elem.substr(-64);
    });

    const params2 = {
        workspace_id: WORKSPACE_ID,
        entity: entity,
        old_value: value,
        value: value,
        synonyms: synonyms2
    };

    return new Promise((res,rej)=>{
        return conversation.updateValue(params2, function(err, response) {
            if (err) {
                console.error(err);
                return rej({error:err});
            }

            return res(response);
        });
    });
} // updateEntity

updateEntity({
    value:'12700',
    synonyms:[
        'SUPER HIPER REVOLUCIONÁRIO CURSO DE TÉCNICO EM REFRIGERAÇÃO 1234567890',
        'SUPER HIPER REVOLUCIONÁRIO CURSO DE TÉCNICO EM REFRIGERAÇÃO DE AR 1234567890',
        'SUPER HIPER REVOLUCIONÁRIO CURSO DE TÉCNICO EM REFRIGERAÇÃO GELADINHO 1234567890',
        'SUPER HIPER REVOLUCIONÁRIO CURSO DE TÉCNICO EM REFRIGERAÇÃO DO ALASCA 1234567890',
        'SUPER HIPER REVOLUCIONÁRIO CURSO DE TÉCNICO EM REFRIGERAÇÃO ZERO ABSOLUTO 1234567890',
        'SUPER HIPER REVOLUCIONÁRIO CURSO DE TÉCNICO EM REFRIGERAÇÃO DO MAL 1234567890',
    ]
}).then(ret=>console.log('RESOLVED'))
.catch(err=>console.log('ERROR ERROR ERROR',err));