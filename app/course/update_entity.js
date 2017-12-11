const {ConversationV1,conversationCredentials,WORKSPACE_ID,objConversationDefault}=require('../../app/api/confs');

const conversation=new ConversationV1(objConversationDefault);


function updateEntity(params) {

    if(!params) params={}
    const entity=params.entity || 'cursos';
    const value=params.value+'' || '';
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

module.exports={updateEntity}