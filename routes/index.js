
/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('pages/courses', { title: 'Cursos' });
};
exports.courses = function(req, res){
  res.render('pages/courses', { title: 'Cursos' });
};
exports.addresses = function(req, res){
  res.render('pages/addresses', { title: 'Unidades' });
}
