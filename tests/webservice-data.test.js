const assert=require('assert');
const fs=require('fs');
const http=require('http');
const concat=require('concat-stream');
const crypto=require('crypto');


const arg1=process.argv[2];

function getData() {
    const username = 'psf.ginfo';
    const password = 'xisto917';
    const options = {
        host: 'wwwapp.sistemafiergs.org.br',
        port: 7880,
        path: '/psf/api/senai/programacao-cursos',
        headers: {
            'Authorization': 'Basic ' + new Buffer(username + ':' + password).toString('base64')
        }
    };

    return new Promise((res,rej)=>{
        if(arg1 == 'concat') {
            console.log('USANDO CONCAT!');
            return http.get(options,resp=>{
                return resp.pipe(concat(data=>{
                    return res(data);
                }));
            });
        }

        http.get(options,resp=>{
            let data='';

            resp.on('data',chunk=>{
                return data+=chunk;
            });

            resp.on('end',()=>{
                return res(data);
            });

        });
    });
} // getData


function saveFile(data) {
    const md5Hasher=crypto.createHash('md5');
    const md5=md5Hasher.update(data).digest('hex');

    const filename=`./files/${md5}-webservice.json`;
    fs.writeFileSync(filename,data);
    return filename;
}

function processTest() {
    return new Promise((res,rej)=>{
        try {
            return getData()
            .then(ret=>{
                const filename=saveFile(ret);
                console.log(filename);
                return res({ok:true,filename});
            }).catch(err=>rej(err));
        } catch(e) {
            return rej(e);
        }
    });
}

const qtd=20;

// let array=[];
// for(let i=1; i<=qtd; i++) {
//     array.push(processTest());
// }

// Promise.all(array)
//     .then(ret=>{
//         console.log('RESOLVED!',ret);
//     })
//     .catch(err=>{
//         console.log(err);
//     });

processTest()
.then(ret=>{
    console.log(ret);
})
.catch(err=>{
    console.log(err);
});