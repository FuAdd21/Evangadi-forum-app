import { StatusCodes } from "http-status-codes";

export const errorHandler = (err, req, res, next) => {
  const isProduction = process.env.NODE_ENV === "production";
  const isClientError =
    err.statusCode >= StatusCodes.BAD_REQUEST &&
    err.statusCode < StatusCodes.INTERNAL_SERVER_ERROR;

      if (!isClientError) {
    console.error("Unhandled error:", err);
  }

  let customError = {
    statusCode: err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
    msg:
      err.message ||
      (isProduction
        ? "Something went wrong. Please try again later."
        : "Something went wrong try again later"),
  };

  if (err?.code === "ER_DUP_ENTRY") {
    customError.statusCode = StatusCodes.BAD_REQUEST;
    customError.msg = "Duplicate value entered for a unique field";
  }

  if (!isClientError && isProduction) {
    customError.msg = "Something went wrong. Please try again later.";
  }

  return res.status(customError.statusCode).json({ msg: customError.msg });
};
