const assert=require('assert');
const db=require('../db.js')();
const http=require('http');
const concat=require('concat-stream');



const perPage=10;

const url='http://localhost:3000/api/scheduler-logs?selector={"task":"syncCourses"}&sort=[{"time:number":"desc"}]';


function getPag(params) {
    if(!params) params={}
    const pag=params.pag;
    const arrayGeral=params.arrayGeral;
    // 1ª pagina
    
    return new Promise((resolve,reject)=>{
        const begin = pag === 1 ? 0 : ((pag-1)*perPage);
        const end=(begin+perPage);
        // const url2=url+'&skip='+begin+'&limit='+perPage;
        const url2=url+'&pag='+pag+'&perPage='+perPage;
        console.log(`begin: ${begin} -- end:${end} ---> arrayGeral.length: ${arrayGeral.length}`);
        const arraySlice=arrayGeral.slice(begin,end);
        return http.get(url2,res=>{
            res.pipe(concat(buf=>{
                try {
                    let content=buf.toString();
                    content=JSON.parse(content);
                    const arrayPaginated=content.docs;
                    assert.ok(Array.isArray(arrayPaginated),'arrayPaginated is not array!!!');
                    assert.ok(arraySlice.length===arrayPaginated.length,`Different sizes! arraySlice(${arraySlice.length}) x arrayPaginated(${arrayPaginated.length})`);
                    console.log('length:'+arrayPaginated.length);
                    const bookmark=content.bookmark;

                    assert.deepEqual(arraySlice,arrayPaginated,'Pagination wrong!!');
                    /* for(var i=begin;i<arraySlice.length;i++) {
                        assert.deepEqual(arraySlice[i],arrayPaginated[i],'Pagination wrong!!');
                    } */

                    return resolve({ok:true,bookmark});
                } catch(e) {
                    return reject(e);
                }
            }));
        }).on('error',reject);
    }); // Promise
}



db.init('general_log');
describe(`Testing pagination - per page: ${perPage}`,function() {
    let arrayGeral=[];
    before(function(done) {

        http.get(url,res=>{
            const statusCode=res.statusCode;

            res.pipe(concat((response)=>{
                response=response.toString();
                try {

                    response=JSON.parse(response);
                    if(response && response.docs) {
                        arrayGeral=response.docs;
                        done();
                    } else {
                        console.log(response);
                        return done(new Error('Resposta no formato errado! Sem .docs'));
                    }
                } catch(e) {
                    return done(e);
                }
            }));
        })
        .on('error',(e)=>{
            return done(e);
        });


        /* setTimeout(()=>{
            done(new Error('deu erro no before!!'));
        },2000); */
    });

    it('Array geral length',function() {
        const arrayGeralL=arrayGeral.length;
        assert.ok(arrayGeralL,'arrayGeral inválida!');
    });

    it('List pages...',function(done) {

        getPag({pag:3,arrayGeral})
            .then(ret=>{
                console.log();
                return done();
            },err=>{
                done(err);
            });

    });
});