#!/usr/bin/nodejs
var cidades_rs = require('./cidades_rs.json');

var cidades_after = [];

for(var i = 0; i < cidades_rs.length; i++) {
  var cidade = {};
  cidade.name = cidades_rs[i].name;
  cidade.type = "Feature";
  cidade.geometry = cidades_rs[i].geometry;
  cidade.geometry.type = "Point";
  cidades_after.push (cidade);
}
fs = require('fs');
var json = JSON.stringify(cidades_after); 
fs.writeFile('cidades_rs_converted.json', json);
