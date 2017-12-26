function authenticationMiddleware () {
  return function (req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    if(req.get('x-requested-with') == 'XMLHttpRequest') {
      return res.status(401).json({error:'Sessão expirada! Faça login novamente!'});
    }
    return res.redirect('/login');

  }
}

module.exports = authenticationMiddleware
