// script de teste p/ verificar unidades e possiveis duplicidades de id's
const fs=require('fs');

let arrayMain=fs.readFileSync('tests/files/540ec548cba5142f34fef514751736a6-MASTER2-webservice.json');
arrayMain=JSON.parse(arrayMain);

let units={};

arrayMain.forEach(elem=>{
    const unitId='U'+elem.unidade.id;
    units[unitId]={
        unidade:elem.unidade
    }
});


let unitsLength=0;

let differ=[];

for(let i in units) {
    const id=units[i].unidade.id;
    const nome=units[i].unidade.nome;
    const municipio=units[i].unidade.municipio;
    
    let dif=arrayMain.find(elem=>{
        return elem.unidade.id == id && (elem.unidade.municipio != municipio || elem.unidade.nome != nome);
    });
    if(dif) {
        differ.push(dif);
    }

    unitsLength++;
}

console.log('length: '+unitsLength);
console.log(differ);