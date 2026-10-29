import { body, param, query, validationResult } from 'express-validator';

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

const passwordRule = (field = 'password') =>
  body(field)
    .isString()
    .withMessage('Password must be a string')
    .bail()
    .isLength({ min: PASSWORD_MIN_LENGTH, max: PASSWORD_MAX_LENGTH })
    .withMessage(
      `Password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters`,
    )
    .bail()
    .matches(/[A-Za-z]/)
    .withMessage('Password must contain at least one letter')
    .bail()
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number');

/** Terminal handler: converts express-validator results into a 400 response. */
export function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const details = result.array().map((entry) => ({
    field: entry.path,
    message: entry.msg,
  }));

  return res.status(400).json({
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: details.map((entry) => entry.message).join(', '),
      details,
    },
  });
}

export const validateRegister = [
  body('fullName')
    .isString()
    .withMessage('Full name must be a string')
    .bail()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  body('email')
    .isString()
    .withMessage('Email must be a string')
    .bail()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .bail()
    .normalizeEmail({ gmail_remove_dots: false }),
  passwordRule('password'),
  // A role may be supplied by the client, but only "student" is ever honoured.
  body('role')
    .optional()
    .isIn(['student', 'guide', 'admin'])
    .withMessage('Role must be one of student, guide or admin'),
  validate,
];

export const validateLogin = [
  body('email')
    .isString()
    .withMessage('Email must be a string')
    .bail()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .bail()
    .normalizeEmail({ gmail_remove_dots: false }),
  body('password')
    .isString()
    .withMessage('Password must be a string')
    .bail()
    .isLength({ min: 1, max: PASSWORD_MAX_LENGTH })
    .withMessage('Password is required'),
  validate,
];

export const validateAdminUserCreate = [
  body('fullName')
    .isString()
    .withMessage('Full name must be a string')
    .bail()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  body('email')
    .isString()
    .withMessage('Email must be a string')
    .bail()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .bail()
    .normalizeEmail({ gmail_remove_dots: false }),
  passwordRule('password'),
  body('role')
    .isIn(['student', 'guide', 'admin'])
    .withMessage('Role must be one of student, guide or admin'),
  validate,
];

export const validateUserStatusUpdate = [
  body('status')
    .isIn(['active', 'disabled'])
    .withMessage('Status must be either active or disabled'),
  validate,
];

export const validateTeamCreate = [
  body('name')
    .isString()
    .withMessage('Team name must be a string')
    .bail()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Team name must be between 2 and 100 characters'),
  body('session')
    .isString()
    .withMessage('Academic session must be a string')
    .bail()
    .trim()
    .isLength({ min: 2, max: 20 })
    .withMessage('Academic session must be between 2 and 20 characters'),
  body('description')
    .optional()
    .isString()
    .bail()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('memberIds')
    .optional()
    .isArray()
    .withMessage('memberIds must be an array')
    .bail()
    .custom((ids) => ids.length <= 5)
    .withMessage('A team must not have more than 5 student members')
    .bail()
    .custom((ids) => ids.every((id) => /^[a-f\d]{24}$/i.test(String(id))))
    .withMessage('memberIds must contain valid MongoDB identifiers'),
  body('guideId')
    .optional({ nullable: true })
    .isMongoId()
    .withMessage('Invalid guide identifier'),
  body('status')
    .optional()
    .isIn(['pending', 'finalized', 'archived'])
    .withMessage('Status must be pending, finalized or archived'),
  validate,
];

export const validateTeamUpdate = [
  body('name')
    .optional()
    .isString()
    .bail()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Team name must be between 2 and 100 characters'),
  body('session')
    .optional()
    .isString()
    .bail()
    .trim()
    .isLength({ min: 2, max: 20 })
    .withMessage('Academic session must be between 2 and 20 characters'),
  body('description')
    .optional()
    .isString()
    .bail()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('memberIds')
    .optional()
    .isArray()
    .withMessage('memberIds must be an array')
    .bail()
    .custom((ids) => ids.length <= 5)
    .withMessage('A team must not have more than 5 student members')
    .bail()
    .custom((ids) => ids.every((id) => /^[a-f\d]{24}$/i.test(String(id))))
    .withMessage('memberIds must contain valid MongoDB identifiers'),
  body('guideId')
    .optional({ nullable: true })
    .isMongoId()
    .withMessage('Invalid guide identifier'),
  body('status')
    .optional()
    .isIn(['pending', 'finalized', 'archived'])
    .withMessage('Status must be pending, finalized or archived'),
  validate,
];

export const validateProjectCreate = [
  body('title')
    .isString()
    .withMessage('Project title must be a string')
    .bail()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Project title must be between 2 and 200 characters'),
  body('description')
    .optional()
    .isString()
    .bail()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('teamId').isMongoId().withMessage('Invalid team identifier'),
  body('status')
    .optional()
    .isIn(['proposed', 'approved', 'active', 'completed', 'archived'])
    .withMessage('Invalid project status'),
  body('startDate')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('startDate must be a valid ISO date'),
  body('targetDate')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('targetDate must be a valid ISO date'),
  body('category')
    .optional()
    .isString()
    .bail()
    .trim()
    .isLength({ max: 80 })
    .withMessage('Category must be less than 80 characters'),
  validate,
];

export const validateProjectUpdate = [
  body('title')
    .optional()
    .isString()
    .bail()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Project title must be between 2 and 200 characters'),
  body('description')
    .optional()
    .isString()
    .bail()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('teamId').optional().isMongoId().withMessage('Invalid team identifier'),
  body('status')
    .optional()
    .isIn(['proposed', 'approved', 'active', 'completed', 'archived'])
    .withMessage('Invalid project status'),
  body('startDate')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('startDate must be a valid ISO date'),
  body('targetDate')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('targetDate must be a valid ISO date'),
  body('category')
    .optional()
    .isString()
    .bail()
    .trim()
    .isLength({ max: 80 })
    .withMessage('Category must be less than 80 characters'),
  validate,
];

export const validateUserListQuery = [
  query('role')
    .optional()
    .isIn(['student', 'guide', 'admin'])
    .withMessage('role filter must be student, guide or admin'),
  query('status')
    .optional()
    .isIn(['active', 'disabled'])
    .withMessage('status filter must be active or disabled'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be an integer between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('offset must be a non-negative integer'),
  validate,
];

export const validateId = [
  param('id').isMongoId().withMessage('Invalid identifier format'),
  validate,
];

export default validate;
