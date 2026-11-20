const loadSessionUser = (req, res, next) => {
  req.user = req.session.user || null;
  res.locals.user = req.user;
  next();
};

const isLoggedIn = (req) => {
  return Boolean(req.user);
};

const hasRole = (req, role) => {
  return req.user && req.user.role === role;
};

const requireApiLogin = (req, res, next) => {
  if (!isLoggedIn(req)) {
    return res.status(401).json({ message: "Authentication required" });
  }
  return next();
};

const requirePageLogin = (req, res, next) => {
  if (!isLoggedIn(req)) {
    return res.redirect("/login");
  }
  return next();
};

const requireApiRole = (role) => (req, res, next) => {
  if (!isLoggedIn(req)) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (!hasRole(req, role)) {
    return res.status(403).json({ message: "Forbidden" });
  }
  return next();
};

const requireUserOwnerOrAdmin = (req, res, next) => {
  if (!isLoggedIn(req)) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (req.user.role !== 'admin' && req.user.id !== req.params.userId) {
    return res.status(403).json({ message: "Forbidden" });
  }
  return next();
};

const requirePageRole = (role) => (req, res, next) => {
  if (!isLoggedIn(req)) {
    return res.redirect("/login");
  }
  if (!hasRole(req, role)) {
    return res.status(403).render("errors/403", { title: "Forbidden", user: req.user });
  }
  return next();
};

export {
  loadSessionUser,
  requireApiLogin,
  requirePageLogin,
  requireUserOwnerOrAdmin,
  requireApiRole,
  requirePageRole
}