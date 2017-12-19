const crypto=require('crypto');

const md5=crypto.createHash('md5');

const var1='oioi';

const res=md5.update(var1).digest('hex');

console.log(res);

/*
cidade: não-me-toque
não traz o senai;
Não-Me-Toque
*/