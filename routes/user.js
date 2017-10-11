
/*
 * GET users listing.
 */

exports.list = function(req, res){
  res.send("respond with a resource");
};
exports.login = function(req, res){
  res.render('pages/login', { title: 'Login', error: req.query.e });
};

exports.profile = function(req, res){
  var error = req.session['error'] || '';
  req.session['error'] = null;
  res.render('pages/profile', { title: 'Login', user: req.user, error: error });
};