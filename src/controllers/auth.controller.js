import logger from "#config/logger.js"
import { createUser, verifyUser } from "#services/auth.service.js";
import { cookies } from "#utils/cookies.js";
import { formatValidationError } from "#utils/format.js";
import { jwttoken } from "#utils/jwt.js";
import { signUpSchema, signInSchema } from "#validations/auth.validations.js";

export const signup = async ( req, res, next) => {
    try {
        const validationResult = signUpSchema.safeParse(req.body);

        if(!validationResult.success) {
            return res.status(400).json({
                error: "Validation failed",
                details: formatValidationError(validationResult.error)
            });
        }

        const { name, email, password, role } = validationResult.data;

        const user = await createUser({ name, email, password, role })

        const token = jwttoken.sign({ id: user.id, email: user.email, role: user.role });

        cookies.set(res, 'token', token);

        logger.info(`User registered successfully: ${email}`);
        res.status(201).json({
            message: 'User registered',
            user: {
                id: user.id, name: user.name, email: user.email, role: user.role
            }
        })
    } catch (error) {
        logger.error('Signup error: ', error)

        if(error.message === 'User with this email already exists') {
            return res.status(409).json({ error: 'Email already exist '});
        }

        next(error) ;
    }
}

export const signin = async (req, res, next) => {
    try {
        const validationResult = signInSchema.safeParse(req.body);

        if (!validationResult.success) {
            return res.status(400).json({
                error: "Validation failed",
                details: formatValidationError(validationResult.error)
            });
        }

        const { email, password } = validationResult.data;

        const user = await verifyUser({ email, password });

        const token = jwttoken.sign({ id: user.id, email: user.email, role: user.role });

        cookies.set(res, 'token', token);

        logger.info(`User signed in successfully: ${email}`);
        res.status(200).json({
            message: 'User signed in successfully',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        logger.error('Signin error: ', error);

        if (error.message === 'Invalid email or password') {
            return res.status(401).json({
                error: 'Authentication failed',
                message: 'Invalid email or password'
            });
        }

        next(error);
    }
}

export const signout = async (req, res) => {
    try {
        cookies.clear(res, 'token');
        logger.info('User signed out successfully');
        res.status(200).json({
            message: 'User signed out successfully'
        });
    } catch (error) {
        logger.error('Signout error: ', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Error during sign out'
        });
    }
}