/**
 * apenas uma função para servir de "task" p/ o agendador
 */
module.exports=function() {
    return Promise.resolve({msg:'task2 executada com sucesso!!'});
}