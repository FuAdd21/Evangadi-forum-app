import { safeExecute } from "../../../../db/config.js";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../../../utils/errors/index.js";

/**
 * Maps a raw database row to a structured answer object.
 */
const mapAnswer = (row) => ({
  id: row.id,
  questionId: row.questionId,
  content: row.content,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  author: {
    id: row.userId,
    firstName: row.firstName,
    lastName: row.lastName,
  },
});

/**
 * Retrieves the owner of a specific question.
 */
const getQuestionOwner = async (questionId) => {
  const rows = await safeExecute(
    "SELECT question_id, user_id FROM questions WHERE question_id = ? LIMIT 1",
    [questionId],
  );

  if (rows.length === 0) {
    throw new NotFoundError("Question not found");
  }

  return rows[0];
};

/**
 * Retrieves ownership validation records for an answer block.
 */
const getAnswerOwner = async (answerId) => {
  const rows = await safeExecute(
    "SELECT answer_id, user_id FROM answers WHERE answer_id = ? LIMIT 1",
    [answerId],
  );

  if (rows.length === 0) {
    throw new NotFoundError("Answer not found");
  }

  return rows[0];
};

/**
 * Generates the SQL ORDER BY clause for answers based on the sort criteria.
 */
const getAnswerSortSql = (sortBy) => {
  if (sortBy === "oldest") {
    return "a.created_at ASC";
  }
  return "a.created_at DESC";
};

/**
 * Retrieves a single answer by its ID.
 */
export const getSingleAnswerService = async (answerId) => {
  const sql = `
    SELECT
      a.answer_id AS id,
      a.question_id AS questionId,
      a.content,
      a.created_at AS createdAt,
      a.updated_at AS updatedAt,
      u.user_id AS userId,
      u.first_name AS firstName,
      u.last_name AS lastName
    FROM answers a
    JOIN users u ON u.user_id = a.user_id
    WHERE a.answer_id = ?
    LIMIT 1
  `;

  const rows = await safeExecute(sql, [answerId]);
  if (rows.length === 0) {
    throw new NotFoundError("Answer not found");
  }

  return mapAnswer(rows[0]);
};

/**
 * Retrieves all answers aligned with a specialized query parameter filter set.
 */
export const getAnswersService = async ({
  questionId,
  sortBy,
  page,
  limit,
}) => {
  await getQuestionOwner(questionId);
  const pageNumber = Number.isInteger(page) && page > 0 ? page : 1;
  const pageSize = Number.isInteger(limit)
    ? Math.min(Math.max(limit, 1), 100)
    : 10;
  const offset = (pageNumber - 1) * pageSize;
  const sortSql = getAnswerSortSql(sortBy);
  const countSql = `
    SELECT COUNT(*) AS totalCount
    FROM answers a
    WHERE a.question_id = ?
  `;
  const sql = `
    SELECT
      a.answer_id AS id,
      a.question_id AS questionId,
      a.content,
      a.created_at AS createdAt,
      a.updated_at AS updatedAt,
      u.user_id AS userId,
      u.first_name AS firstName,
      u.last_name AS lastName
    FROM answers a
    JOIN users u ON u.user_id = a.user_id
    WHERE a.question_id = ?
    ORDER BY ${sortSql}, a.answer_id DESC
    LIMIT ${pageSize} OFFSET ${offset}
  `;

  const [countRows, rows] = await Promise.all([
    safeExecute(countSql, [questionId]),
    safeExecute(sql, [questionId]),
  ]);

  const totalCount = Number(countRows[0]?.totalCount ?? 0);
  const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);

  return {
    data: rows.map((row) => mapAnswer(row)),
    meta: {
      page: pageNumber,
      limit: pageSize,
      total: totalCount,
      totalPages,
      sortBy,
      sortOrder: sortBy === "oldest" ? "asc" : "desc",
    },
  };
};

/**
 * Creates a new answer for a specific question.
 */
export const createAnswerService = async ({ questionId, userId, content }) => {
  const question = await getQuestionOwner(questionId);
  if (Number(question.user_id) === Number(userId)) {
    throw new BadRequestError("You cannot answer your own question");
  }

  const trimmedContent = content?.trim() || "";

  const insertSql =
    "INSERT INTO answers (question_id, user_id, content) VALUES (?, ?, ?)";
  const result = await safeExecute(insertSql, [
    questionId,
    userId,
    trimmedContent,
  ]);

  return getSingleAnswerService(result.insertId);
};

/**
 * Updates an existing answer.
 */
export const updateAnswerService = async ({ answerId, userId, content }) => {
  const answer = await getAnswerOwner(answerId);
  if (Number(answer.user_id) !== Number(userId)) {
    throw new ForbiddenError("You are not authorized to update this answer");
  }

  const trimmedContent = content?.trim() || "";

  await safeExecute(
    "UPDATE answers SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE answer_id = ?",
    [trimmedContent, answerId],
  );

  return getSingleAnswerService(answerId);
};

/**
 * Deletes an existing answer (Completed part).
 */
export const deleteAnswerService = async ({ answerId, userId }) => {
  const answer = await getAnswerOwner(answerId);
  if (Number(answer.user_id) !== Number(userId)) {
    throw new ForbiddenError("You are not authorized to delete this answer");
  }

  await safeExecute("DELETE FROM answers WHERE answer_id = ?", [answerId]);

  return { answerId };
};