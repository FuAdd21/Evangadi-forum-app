import { body, param, query } from "express-validator";
import { validationErrorHandler } from "../../../middleware/validation-handler.js";

export const createQuestionValidation = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ min: 10 })
    .withMessage("Title must be at least 10 characters")
    .isLength({ max: 255 })
    .withMessage("Title cannot exceed 255 characters"),

  body("content")
    .trim()
    .notEmpty()
    .withMessage("Content is required")
    .isLength({ min: 10 })
    .withMessage("Content must be at least 10 characters"),

  validationErrorHandler,
];
// same body rules as posting a question-AI coach only reads draft text
export const generateQuestionDraftCoachValidation = [
  body("title")
    .optional() // <--- Changed from .notEmpty() to match the "optional" spec
    .trim()
    .isString()
    .withMessage("Question title must be a string")
    .isLength({ min: 5, max: 255 })
    .withMessage("Question titles must be between 5 and 255 characters"),

  body("content")
    .trim()
    .notEmpty()
    .withMessage("Question content is required")
    .isString()
    .withMessage("Question content must be a string")
    .isLength({ min: 10 })
    .withMessage("Question content must be at least 10 characters"),
  validationErrorHandler,
];
export const assessAnswerAgainstQuestionValidation = [
  param("questionHash")
    .isString()
    .withMessage("Question hash is required")
    .matches(/^[a-f0-9]{16}$/)
    .withMessage("Question hash must be a 16-character lowercase hex string"),

  body("answerText")
    .trim()
    .notEmpty()
    .withMessage("Answer text is required")
    .isString()
    .withMessage("Answer text must be a string")
    .isLength({ min: 20 })
    .withMessage(
      "Answer text must be at least 20 characters for a meaningful fit check",
    ),

  validationErrorHandler,
];

export const updateQuestionValidation = [
  param("questionHash")
    .isString()
    .withMessage("Question hash must be a string")
    .matches(/^[a-f0-9]{16}$/)
    .withMessage("Question hash must be a 16-character lowercase hex string")
    .trim(),

  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ min: 5 })
    .withMessage("Title must be at least 5 characters")
    .isLength({ max: 200 })
    .withMessage("Title cannot exceed 200 characters"),

  body("content")
    .trim()
    .notEmpty()
    .withMessage("Body is required")
    .isLength({ min: 10 })
    .withMessage("Body must be at least 10 characters")
    .isLength({ max: 5000 })
    .withMessage("Body cannot exceed 5000 characters"),

  validationErrorHandler,
];

export const deleteQuestionValidation = [
  param("questionHash")
    .isString()
    .withMessage("Question hash must be a string")
    .matches(/^[a-f0-9]{16}$/)
    .withMessage("Question hash must be a 16-character lowercase hex string")
    .trim(),
  validationErrorHandler,
];

export const getQuestionsValidation = [
  query("search")
    .optional()
    .trim()
    .isString()
    .withMessage("Search query must be a string"),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer")
    .toInt(),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100")
    .toInt(),
  query("sortBy")
    .optional()
    .isIn(["newest", "oldest", "most-answered"])
    .withMessage("sortBy must be one of newest, oldest, most-answered"),
  query("mine")
    .optional()
    .isBoolean()
    .withMessage("Mine query parameter must be a boolean")
    .toBoolean(),
  validationErrorHandler,
];

export const getSingleQuestionValidation = [
  param("questionHash")
    .isString()
    .withMessage("Question hash must be a string")
    .matches(/^[a-f0-9]{16}$/)
    .withMessage("Question hash must be a 16-character lowercase hex string")
    .trim(),
  validationErrorHandler,
];

// export const getSingleQuestionValidation = [
//   param("questionHash")
//     .isString()
//     .withMessage("Question hash must be a string")
//     .matches(/^[a-f0-9]{16}$/)
//     .withMessage("Question hash must be a 16-character lowercase hex string")
//     .trim(),
//   validationErrorHandler,
// ];

export const searchQuestionsSemanticValidation = [
  query("query")
    .trim()
    .notEmpty()
    .withMessage("query is required")
    .isString()
    .withMessage("query must be a string")
    .isLength({ min: 5 })
    .withMessage("query must be at least 5 characters"),

  query("k")
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage("k must be between 1 and 20")
    .toInt(),

  query("threshold")
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage("threshold must be between 0 and 1")
    .toFloat(),

  validationErrorHandler,
];

export const getSimilarQuestionsValidation = [
  param("questionHash")
    .isString()
    .withMessage("questionHash is required")
    .matches(/^[a-f0-9]{16}$/)
    .withMessage("questionHash must be a 16-character lowercase hex string"),
  query("k").optional().isInt({ min: 1, max: 20 }).toInt(),
  query("threshold").optional().isFloat({ min: 0, max: 1 }).toFloat(),
  validationErrorHandler,
];
