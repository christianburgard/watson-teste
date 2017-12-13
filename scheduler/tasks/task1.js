/**
 * apenas uma função para servir de "task" p/ o agendador
 */
module.exports=function() {
    const tm=20000;
    console.log('#############################################');
    console.log('Rodando de ./tasks/task1!!!!!!');
    console.log('#############################################');
    return new Promise((res,rej)=>{
        return setTimeout(()=>{
            return res({msg:'task1 executada com sucesso!! Em: '+tm});
        },tm);
    });
}
