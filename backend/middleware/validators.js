import Joi from 'joi';
import passwordComplexity from 'joi-password-complexity';

// Define password complexity options for reuse
const complexityOptions = {
    min: 8,
    max: 30,
    lowerCase: 1,
    upperCase: 1,
    numeric: 1,
    symbol: 1,
    requirementCount: 4,
};

// Validation schema for user registration
const validateRegistration = (data) => {
    const schema = Joi.object({
        name: Joi.string().min(2).max(50).required().label("Name"),
        email: Joi.string().email().required().label("Email"),
        password: passwordComplexity(complexityOptions).required().label("Password"),
    });
    return schema.validate(data);
};

// Validation schema for user login
const validateLogin = (data) => {
    const schema = Joi.object({
        email: Joi.string().email().required().label("Email"),
        password: Joi.string().required().label("Password"),
    });
    return schema.validate(data);
};

// Validation for the forgot password request (just needs an email)
const validateForgotPassword = (data) => {
    const schema = Joi.object({
        email: Joi.string().email().required().label("Email"),
    });
    return schema.validate(data);
};

// Validation for the actual password reset (requires the new password)
const validateResetPassword = (data) => {
    const schema = Joi.object({
        password: passwordComplexity(complexityOptions).required().label("Password"),
    });
    return schema.validate(data);
};


export {
    validateRegistration,
    validateLogin,
    validateForgotPassword,
    validateResetPassword
};