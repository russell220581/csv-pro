const isAdmin = (req, res, next) => {
    // This middleware must run AFTER the 'protect' middleware,
    // so we can rely on `req.user` being present.
    if (req.user && req.user.role === 'admin') {
        next(); // User is an admin, proceed to the controller
    } else {
        // User is either not logged in or not an admin
        res.status(403).json({ success: false, message: 'Forbidden: Access denied.' });
    }
};

export { isAdmin };